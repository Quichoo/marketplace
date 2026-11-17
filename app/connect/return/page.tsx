import { Suspense } from "react";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import type { Metadata } from "next";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Stripe onboarding" };

async function ConnectReturn({ account }: { account: string | undefined }) {
  if (!account) {
    return (
      <>
        <Typography variant="h4" component="h1" gutterBottom>
          Missing account
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          No Stripe account was specified.
        </Typography>
        <Button variant="contained" href="/connect">
          Back to Connect
        </Button>
      </>
    );
  }

  const { data: seller } = await getSupabaseAdmin()
    .from("sellers")
    .select("email, charges_enabled")
    .eq("stripe_account_id", account)
    .maybeSingle();

  if (!seller) {
    return (
      <>
        <Typography variant="h4" component="h1" gutterBottom>
          Unknown account
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          We couldn&apos;t find this Stripe account in our records.
        </Typography>
        <Button variant="contained" href="/connect">
          Back to Connect
        </Button>
      </>
    );
  }

  // The return page is the source of truth for charges_enabled until webhooks exist.
  let chargesEnabled = seller.charges_enabled;
  try {
    const acct = await getStripe().accounts.retrieve(account);
    chargesEnabled = acct.charges_enabled;
    await getSupabaseAdmin()
      .from("sellers")
      .update({ charges_enabled: chargesEnabled })
      .eq("stripe_account_id", account);
  } catch {
    // Fall back to stored value; show incomplete state so the seller can retry.
    chargesEnabled = false;
  }

  if (chargesEnabled) {
    return (
      <>
        <Typography variant="h4" component="h1" gutterBottom>
          Your Stripe account is connected
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Signed in as <strong>{seller.email}</strong>. You&apos;re ready to receive payments.
        </Typography>
        <Button variant="contained" href="/">
          Back to Marketplace
        </Button>
      </>
    );
  }

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Onboarding isn&apos;t finished yet
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Stripe still needs a few details from you before you can receive payments.
      </Typography>
      <Button variant="contained" href={`/connect/refresh?account=${account}`}>
        Continue onboarding
      </Button>
    </>
  );
}

export default function ConnectReturnPage({
  searchParams,
}: PageProps<"/connect/return">) {
  return (
    <Box sx={{ py: 4 }}>
      <Suspense fallback={<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}>
        <ConnectReturnParams searchParams={searchParams} />
      </Suspense>
    </Box>
  );
}

async function ConnectReturnParams({ searchParams }: { searchParams: PageProps<"/connect/return">["searchParams"] }) {
  const { account } = await searchParams;
  return <ConnectReturn account={typeof account === "string" ? account : undefined} />;
}
