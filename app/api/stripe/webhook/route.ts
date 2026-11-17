import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// POST handlers are always dynamic under cacheComponents; the Node runtime
// (default for route handlers using Node APIs) doesn't need declaring.

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("webhook: STRIPE_WEBHOOK_SECRET is not configured");
    return new NextResponse(null, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse(null, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        return await handleCheckoutCompleted(event);
      case "account.updated":
        return await handleAccountUpdated(event);
      default:
        // Connect endpoint on a shared sandbox: ignore anything we don't recognise.
        return new NextResponse(null, { status: 200 });
    }
  } catch (e) {
    console.error("webhook: database error for", event.type);
    void e;
    return new NextResponse(null, { status: 500 });
  }
}

async function handleCheckoutCompleted(event: Stripe.Event): Promise<NextResponse> {
  const session = event.data.object as Stripe.Checkout.Session;
  const db = getSupabaseAdmin();

  const { data: order } = await db
    .from("orders")
    .select("id, listing_id, stripe_account_id, amount_total, currency, status")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();
  if (!order) {
    return new NextResponse(null, { status: 200 });
  }

  const amountMatches = session.amount_total === order.amount_total;
  const currencyMatches =
    (session.currency ?? "usd") === (order.currency ?? "usd");
  const accountMatches = event.account === order.stripe_account_id;
  if (!accountMatches || session.payment_status !== "paid" || !amountMatches || !currencyMatches) {
    console.warn(
      `webhook: checkout.session.completed for order ${order.id} failed validation` +
        ` (account=${accountMatches}, paid=${session.payment_status === "paid"}, amount=${amountMatches}, currency=${currencyMatches})`,
    );
    return new NextResponse(null, { status: 200 });
  }

  // a) idempotent order update: only when still pending
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
    console.error("webhook: order update failed for", order.id);
    return new NextResponse(null, { status: 500 });
  }
  if (updatedOrder && updatedOrder.length === 0) {
    console.warn(
      `webhook: order ${order.id} was not pending (already paid or conflicting state)`,
    );
  }

  // b) always mark the listing sold, so a retry heals a partial earlier failure
  const { data: listing } = await db
    .from("listings")
    .select("id, status, seller_email")
    .eq("id", order.listing_id)
    .maybeSingle();
  if (!listing) {
    console.warn(`webhook: listing ${order.listing_id} missing for order ${order.id}`);
    return new NextResponse(null, { status: 200 });
  }
  if (listing.status !== "sold") {
    const { error: listingError } = await db
      .from("listings")
      .update({ status: "sold" })
      .eq("id", order.listing_id);
    if (listingError) {
      console.error("webhook: listing update failed for", order.listing_id);
      return new NextResponse(null, { status: 500 });
    }
  } else {
    // A different paid order may already own this listing; record this order as paid regardless.
    console.warn(
      `webhook: listing ${order.listing_id} already sold; order ${order.id} recorded as paid (conflict)`,
    );
  }

  // Keep seller_email references consistent (order rows store normalized emails).
  void listing.seller_email;

  return new NextResponse(null, { status: 200 });
}

async function handleAccountUpdated(event: Stripe.Event): Promise<NextResponse> {
  const account = event.data.object as { id: string; charges_enabled?: boolean };
  const db = getSupabaseAdmin();

  const { error } = await db
    .from("sellers")
    .update({ charges_enabled: account.charges_enabled === true })
    .eq("stripe_account_id", account.id);
  if (error) {
    console.error("webhook: seller update failed for", account.id);
    return new NextResponse(null, { status: 500 });
  }
  // Unknown accounts (other candidates' events): update matches zero rows — fine.
  return new NextResponse(null, { status: 200 });
}
