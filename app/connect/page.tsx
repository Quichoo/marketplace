import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { ConnectForm } from "./ConnectForm";

export const metadata: Metadata = { title: "Connect with Stripe" };

export default function ConnectPage() {
  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Connect with Stripe
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Enter the email you use to sell on Marketplace. We&apos;ll take you to Stripe&apos;s secure
        onboarding so you can receive payments.
      </Typography>
      <ConnectForm />
    </>
  );
}
