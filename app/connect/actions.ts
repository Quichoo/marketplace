"use server";

import { redirect } from "next/navigation";
import { getStripe, expressVersionOptions } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ConnectState {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SellerRow {
  id: string;
  email: string;
  stripe_account_id: string;
  charges_enabled: boolean;
}

async function findSeller(db: SupabaseClient, email: string): Promise<SellerRow | null> {
  const { data, error } = await db
    .from("sellers")
    .select("id, email, stripe_account_id, charges_enabled")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    throw new Error("db");
  }
  return data;
}

export async function connectWithStripe(
  _prev: ConnectState,
  formData: FormData,
): Promise<ConnectState> {
  const rawEmail = String(formData.get("email") ?? "").trim();
  if (!rawEmail) {
    return { error: "Your email is required." };
  }
  if (!EMAIL_RE.test(rawEmail)) {
    return { error: "Please enter a valid email address." };
  }
  const email = rawEmail.toLowerCase();

  let url: string;
  try {
    const stripe = getStripe();
    const db = getSupabaseAdmin();

    // Reuse existing account if the seller already onboarded.
    let accountId: string;
    const existing = await findSeller(db, email);
    if (existing) {
      accountId = existing.stripe_account_id;
    } else {
      let account: { id: string };
      try {
        // Express accounts for Express hosted onboarding (/setup/e/), which supports
        // test-mode onboarding shortcuts. No email sent to Stripe: prefilling it
        // triggers Stripe's real sign-in/sign-up check; the seller email stays in our
        // sellers table only (our mapping key). The current API version rejects
        // type:"express" creates, so this request is pinned to 2025-06-30.basil via
        // the Stripe-Version header (see lib/stripe.ts).
        account = await stripe.accounts.create(
          {
            type: "express",
            country: "US",
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
          },
          expressVersionOptions(),
        );
      } catch {
        return { error: "Stripe could not create the connected account. Please try again." };
      }
      const { error: insertError } = await db.from("sellers").insert({
        email,
        stripe_account_id: account.id,
        charges_enabled: false,
      });
      if (insertError) {
        // Unique-email race: another request inserted first — reuse its row.
        const raced = await findSeller(db, email);
        if (!raced) {
          return { error: "Could not save your seller profile. Please try again." };
        }
        accountId = raced.stripe_account_id;
      } else {
        accountId = account.id;
      }
    }

    const siteUrl = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
    if (!siteUrl) {
      return { error: "SITE_URL is not configured." };
    }

    let linkUrl: string;
    try {
      const link = await stripe.accountLinks.create(
        {
          account: accountId,
          type: "account_onboarding",
          return_url: `${siteUrl}/connect/return?account=${accountId}`,
          refresh_url: `${siteUrl}/connect/refresh?account=${accountId}`,
        },
        expressVersionOptions(),
      );
      linkUrl = link.url;
    } catch {
      return { error: "Stripe could not create the onboarding link. Please try again." };
    }
    url = linkUrl;
  } catch {
    return { error: "Something went wrong. Please try again." };
  }

  redirect(url);
}
