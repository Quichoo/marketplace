import { NextResponse, type NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("account");
  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/+$/, "");

  if (!accountId) {
    return NextResponse.redirect(`${siteUrl}/connect`);
  }

  const { data: seller } = await getSupabaseAdmin()
    .from("sellers")
    .select("id")
    .eq("stripe_account_id", accountId)
    .maybeSingle();
  if (!seller) {
    return NextResponse.redirect(`${siteUrl}/connect`);
  }

  try {
    const link = await getStripe().accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      return_url: `${siteUrl}/connect/return?account=${accountId}`,
      refresh_url: `${siteUrl}/connect/refresh?account=${accountId}`,
    });
    return NextResponse.redirect(link.url);
  } catch {
    return NextResponse.redirect(`${siteUrl}/connect`);
  }
}
