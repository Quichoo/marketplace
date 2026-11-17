import { Suspense } from "react";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Order" };

async function OrderStatus({ sessionId }: { sessionId: string | undefined }) {
  if (!sessionId) {
    return (
      <>
        <Typography variant="h4" component="h1" gutterBottom>
          Order not found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          No order was specified.
        </Typography>
        <Button variant="contained" href="/">
          Back to Marketplace
        </Button>
      </>
    );
  }

  const { data: order } = await getSupabaseAdmin()
    .from("orders")
    .select("status, amount_total, currency, listing_id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (!order) {
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

  if (order.status === "paid") {
    const { data: listing } = await getSupabaseAdmin()
      .from("listings")
      .select("title")
      .eq("id", order.listing_id)
      .maybeSingle();
    return (
      <>
        <Typography variant="h4" component="h1" gutterBottom>
          Payment successful
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          You paid <strong>${(order.amount_total / 100).toFixed(2)}</strong>
          {listing ? <> for <strong>{listing.title}</strong></> : null}. The seller has been
          notified.
        </Typography>
        <Button variant="contained" href="/">
          Back to Marketplace
        </Button>
      </>
    );
  }

  // Pending: the webhook may not have arrived yet — refresh a few times, then advise.
  return (
    <PendingOrder delaySeconds={3} remaining={5} sessionId={sessionId} />
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
    const { data: listing } = await getSupabaseAdmin()
      .from("listings")
      .select("title")
      .eq("id", order.listing_id)
      .maybeSingle();
    return (
      <>
        <Typography variant="h4" component="h1" gutterBottom>
          Payment successful
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          You paid <strong>${((order.amount_total ?? 0) / 100).toFixed(2)}</strong>
          {listing ? <> for <strong>{listing.title}</strong></> : null}. The seller has been
          notified.
        </Typography>
        <Button variant="contained" href="/">
          Back to Marketplace
        </Button>
      </>
    );
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
