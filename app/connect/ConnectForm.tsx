"use client";

import { useActionState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { connectWithStripe, type ConnectState } from "./actions";

export function ConnectForm() {
  const [state, formAction, pending] = useActionState(connectWithStripe, {} as ConnectState);

  return (
    <Box
      component="form"
      action={formAction}
      sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 480 }}
    >
      {state.error && <Alert severity="error">{state.error}</Alert>}
      <TextField
        label="Your email"
        name="email"
        type="email"
        required
        fullWidth
        size="small"
        placeholder="seller@example.com"
      />
      <Button type="submit" variant="contained" size="large" disabled={pending}>
        {pending ? "Connecting…" : "Connect with Stripe"}
      </Button>
    </Box>
  );
}
