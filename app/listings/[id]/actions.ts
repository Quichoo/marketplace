"use server";

import { getSupabase } from "@/lib/supabase";

export interface MessageSellerState {
  ok?: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function messageSeller(
  _prev: MessageSellerState,
  formData: FormData,
): Promise<MessageSellerState> {
  const listingId = String(formData.get("listingId") ?? "");
  const buyerEmail = String(formData.get("buyerEmail") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!listingId) {
    return { error: "Missing listing." };
  }
  if (!buyerEmail) {
    return { error: "Your email is required." };
  }
  if (!EMAIL_RE.test(buyerEmail)) {
    return { error: "Please enter a valid email address." };
  }
  if (!message) {
    return { error: "Please enter a message." };
  }

  try {
    const supabase = getSupabase();
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("seller_email")
      .eq("id", listingId)
      .single();
    if (listingError || !listing) {
      return { error: "This listing no longer exists." };
    }

    // Plain insert, no .select() chain — RLS policy allows INSERT only.
    const { error } = await supabase.from("messages").insert({
      listing_id: listingId,
      buyer_email: buyerEmail,
      seller_email: listing.seller_email,
      message,
    });
    if (error) {
      return { error: "Could not send your message. Please try again." };
    }
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}
