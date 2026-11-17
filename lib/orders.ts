import "server-only";
import type Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export interface ConfirmOutcome {
  /** "confirmed" = order became paid this call; "already-paid" = was already paid; "conflict" = listing already sold; "rejected" = checks failed; "missing" = no order */
  outcome: "confirmed" | "already-paid" | "conflict" | "rejected" | "missing";
  /** detail for logging / debugging */
  reason?: string;
}

/**
 * Shared by the webhook (checkout.session.completed) and the success-page
 * fallback. Given a Stripe Checkout Session object, validates it against our
 * order row and, if it checks out, marks the order paid (idempotently) and
 * the listing sold (always, to heal partial failures).
 *
 * Same rules as the webhook has always had:
 * - order -> paid only WHERE status = 'pending'
 * - listing -> sold even if the order was already paid
 * - account, payment_status 'paid', amount_total and currency must all match
 */
export async function confirmOrderFromSession(
  session: Pick<
    Stripe.Checkout.Session,
    "id" | "payment_status" | "amount_total" | "currency" | "payment_intent" | "customer_details"
  >,
  /** Connected account that owns the session (event.account for webhooks; the order's own account for the success page). */
  account: string | undefined,
): Promise<ConfirmOutcome> {
  const db = getSupabaseAdmin();

  const { data: order } = await db
    .from("orders")
    .select("id, listing_id, stripe_account_id, amount_total, currency, status")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();
  if (!order) {
    return { outcome: "missing" };
  }

  const accountMatches = account === order.stripe_account_id;
  const amountMatches = session.amount_total === order.amount_total;
  const currencyMatches = (session.currency ?? "usd") === (order.currency ?? "usd");
  if (!accountMatches || session.payment_status !== "paid" || !amountMatches || !currencyMatches) {
    console.warn(
      `orders: session ${session.id} for order ${order.id} failed validation` +
        ` (account=${accountMatches}, paid=${session.payment_status === "paid"}, amount=${amountMatches}, currency=${currencyMatches})`,
    );
    return { outcome: "rejected" };
  }

  // a) idempotent order update: only when still pending
  const alreadyPaid = order.status === "paid";
  if (!alreadyPaid) {
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : null;
    const buyerEmail = session.customer_details?.email ?? null;
    const { data: updatedOrder, error: orderError } = await db
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
        buyer_email: buyerEmail,
      })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("id");
    if (orderError) {
      console.error("orders: order update failed for", order.id);
      throw new Error("order_update_failed");
    }
    if (updatedOrder && updatedOrder.length === 0) {
      console.warn(`orders: order ${order.id} was not pending (already paid or conflicting state)`);
    }
  }

  // b) always mark the listing sold, so a retry heals a partial earlier failure
  const { data: listing } = await db
    .from("listings")
    .select("id, status")
    .eq("id", order.listing_id)
    .maybeSingle();
  if (!listing) {
    console.warn(`orders: listing ${order.listing_id} missing for order ${order.id}`);
    return { outcome: alreadyPaid ? "already-paid" : "confirmed" };
  }
  if (listing.status !== "sold") {
    const { error: listingError } = await db
      .from("listings")
      .update({ status: "sold" })
      .eq("id", order.listing_id);
    if (listingError) {
      console.error("orders: listing update failed for", order.listing_id);
      throw new Error("listing_update_failed");
    }
  } else if (!alreadyPaid) {
    // A different paid order may already own this listing; record this order as paid regardless.
    console.warn(
      `orders: listing ${order.listing_id} already sold; order ${order.id} recorded as paid (conflict)`,
    );
    return { outcome: "conflict" };
  }

  return { outcome: alreadyPaid ? "already-paid" : "confirmed" };
}
