"use server";

import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
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
        // stripe v23 (API 2026-10-28): `type: "express"` is rejected for new platforms.
        // A bare create with only country/email/capabilities yields an account where
        // Stripe collects requirements and holds losses, with a Stripe-hosted dashboard.
        account = await stripe.accounts.create({
          country: "US",
          email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });
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
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: "account_onboarding",
        return_url: `${siteUrl}/connect/return?account=${accountId}`,
        refresh_url: `${siteUrl}/connect/refresh?account=${accountId}`,
      });
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
