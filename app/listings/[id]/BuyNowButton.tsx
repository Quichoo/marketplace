"use client";

import { useActionState } from "react";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { buyNow, type BuyNowState } from "./buy-actions";

export function BuyNowButton({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState(buyNow, {} as BuyNowState);

  return (
    <Box component="form" action={formAction}>
      <input type="hidden" name="listingId" value={listingId} />
      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}
      <Button type="submit" variant="contained" size="large" fullWidth disabled={pending}>
        {pending ? "Starting checkout…" : "Buy Now"}
      </Button>
    </Box>
  );
}
