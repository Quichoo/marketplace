"use client";

import { useActionState, useEffect, useRef } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { messageSeller, type MessageSellerState } from "./actions";

const initialState: MessageSellerState = {};

export function MessageSellerForm({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState(messageSeller, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  return (
    <Box
      component="form"
      ref={formRef}
      action={formAction}
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      <input type="hidden" name="listingId" value={listingId} />
      {state.error && <Alert severity="error">{state.error}</Alert>}
      {state.ok && <Alert severity="success">Your message has been sent to the seller.</Alert>}
      <TextField
        name="buyerEmail"
        label="Your email"
        type="email"
        required
        fullWidth
        size="small"
      />
      <TextField
        name="message"
        label="Message"
        multiline
        rows={4}
        required
        fullWidth
        size="small"
        placeholder="Hi, is this still available?"
      />
      <Button type="submit" variant="contained" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </Box>
  );
}
