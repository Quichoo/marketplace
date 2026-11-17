"use server";

import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export interface BuyNowState {
  error?: string;
}

const MIN_PRICE = 0.5; // Stripe minimum charge
const FEE_RATE = 0.1;

export async function buyNow(
  _prev: BuyNowState,
  formData: FormData,
): Promise<BuyNowState> {
  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) {
    return { error: "Missing listing." };
  }

  let sessionUrl: string;
  try {
    const db = getSupabaseAdmin();

    // Re-validate everything server-side; never trust the client.
    const { data: listing } = await db
      .from("listings")
      .select("id, title, price, status, seller_email, image_url")
      .eq("id", listingId)
      .maybeSingle();
    if (!listing) {
      return { error: "This listing no longer exists." };
    }
    if (listing.status !== "available") {
      return { error: "This listing has already been sold." };
    }

    const sellerEmail = listing.seller_email.trim().toLowerCase();
    const { data: seller } = await db
      .from("sellers")
      .select("stripe_account_id, charges_enabled")
      .eq("email", sellerEmail)
      .maybeSingle();
    if (!seller || !seller.charges_enabled) {
      return { error: "The seller hasn't finished setting up payments." };
    }

    if (listing.price < MIN_PRICE) {
      return { error: "This listing's price is below the payment minimum." };
    }
    const unitAmount = Math.round(listing.price * 100);
    const applicationFee = Math.round(unitAmount * FEE_RATE);

    const siteUrl = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: listing.title,
                images: [listing.image_url],
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: applicationFee,
        },
        metadata: { listing_id: listing.id },
        success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/listings/${listing.id}`,
      },
      { stripeAccount: seller.stripe_account_id },
    );
    if (!session.url) {
      return { error: "Could not start checkout. Please try again." };
    }

    const { error: orderError } = await db.from("orders").insert({
      listing_id: listing.id,
      seller_email: sellerEmail,
      stripe_account_id: seller.stripe_account_id,
      stripe_checkout_session_id: session.id,
      amount_total: unitAmount,
      application_fee_amount: applicationFee,
      currency: "usd",
      status: "pending",
    });
    if (orderError) {
      return { error: "Could not record your order. You have not been charged. Please try again." };
    }

    sessionUrl = session.url;
  } catch {
    return { error: "Something went wrong starting checkout. Please try again." };
  }

  redirect(sessionUrl);
}
