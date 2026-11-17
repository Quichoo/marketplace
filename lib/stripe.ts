import "server-only";
import Stripe from "stripe";

let stripe: Stripe | undefined;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  stripe ??= new Stripe(key);
  return stripe;
}

/**
 * The current API version (2026-10-28) rejects creating v1 accounts with
 * type "express" for new platforms; 2025-06-30.basil still accepts it and
 * yields Express hosted onboarding (connect.stripe.com/setup/e/...), which
 * supports test-mode onboarding shortcuts. Send this per-request via
 * RequestOptions.headers, not by pinning the whole client, so every other
 * call keeps the SDK's native version.
 */
export const EXPRESS_API_VERSION = "2025-06-30.basil";

export function expressVersionOptions() {
  return { headers: { "Stripe-Version": EXPRESS_API_VERSION } };
}

