import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { confirmOrderFromSession } from "@/lib/orders";
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
  try {
    await confirmOrderFromSession(session, event.account);
  } catch {
    return new NextResponse(null, { status: 500 });
  }
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
