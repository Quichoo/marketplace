import { Suspense } from "react";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";
import { confirmOrderFromSession } from "@/lib/orders";

export const metadata: Metadata = { title: "Order" };

export default function CheckoutSuccessPage({
  searchParams,
}: PageProps<"/checkout/success">) {
  return (
    <Box sx={{ textAlign: "center", py: 6 }}>
      <Suspense fallback={<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}>
        <SuccessParams searchParams={searchParams} />
      </Suspense>
    </Box>
  );
}

async function SuccessParams({ searchParams }: { searchParams: PageProps<"/checkout/success">["searchParams"] }) {
  const { session_id: sessionId } = await searchParams;
  return <OrderStatus sessionId={typeof sessionId === "string" ? sessionId : undefined} />;
}

async function OrderStatus({ sessionId }: { sessionId: string | undefined }) {
  if (!sessionId) {
    return <NotFoundState />;
  }

  const { data: order } = await getSupabaseAdmin()
    .from("orders")
    .select("id, listing_id, status, amount_total, stripe_account_id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (!order) {
    return <NotFoundState />;
  }

  if (order.status === "paid") {
    return <PaidState listingId={order.listing_id} amountTotal={order.amount_total} />;
  }

  // Pending: the webhook may not have arrived yet. The URL's session id is only
  // a lookup key — ask Stripe directly (server-side) whether it was paid.
  try {
    const session = await getStripe().checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount: order.stripe_account_id },
    );
    await confirmOrderFromSession(session, order.stripe_account_id);
  } catch {
    // Retrieve failed or checks failed — fall through to the polling state.
  }

  const { data: refreshed } = await getSupabaseAdmin()
    .from("orders")
    .select("status")
    .eq("id", order.id)
    .maybeSingle();
  if (refreshed?.status === "paid") {
    return <PaidState listingId={order.listing_id} amountTotal={order.amount_total} />;
  }

  // Still pending: refresh a few times (the webhook may arrive late), then advise.
  return <PendingOrder delaySeconds={3} remaining={5} sessionId={sessionId} />;
}

function NotFoundState() {
  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Order not found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        We couldn&apos;t find this order in our records.
      </Typography>
      <Button variant="contained" href="/">
        Back to Marketplace
      </Button>
    </>
  );
}

async function PaidState({
  listingId,
  amountTotal,
}: {
  listingId: string;
  amountTotal: number;
}) {
  const { data: listing } = await getSupabaseAdmin()
    .from("listings")
    .select("title")
    .eq("id", listingId)
    .maybeSingle();
  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Payment successful
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        You paid <strong>${(amountTotal / 100).toFixed(2)}</strong>
        {listing ? <> for <strong>{listing.title}</strong></> : null}. The seller has been
        notified.
      </Typography>
      <Button variant="contained" href="/">
        Back to Marketplace
      </Button>
    </>
  );
}

async function PendingOrder({
  delaySeconds,
  remaining,
  sessionId,
}: {
  delaySeconds: number;
  remaining: number;
  sessionId: string;
}) {
  const { data: order } = await getSupabaseAdmin()
    .from("orders")
    .select("status, amount_total, listing_id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (order?.status === "paid") {
    return <PaidState listingId={order.listing_id} amountTotal={order.amount_total ?? 0} />;
  }

  if (remaining <= 0) {
    return (
      <>
        <Typography variant="h4" component="h1" gutterBottom>
          Payment processing
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Your payment is still being confirmed. Please check back in a minute — your order is
          safe.
        </Typography>
        <Button variant="contained" href="/">
          Back to Marketplace
        </Button>
      </>
    );
  }

  await delay(delaySeconds * 1000);
  return (
    <Suspense fallback={<CircularProgress />}>
      <PendingOrder delaySeconds={delaySeconds} remaining={remaining - 1} sessionId={sessionId} />
    </Suspense>
  );
}

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}
