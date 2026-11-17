import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function isSellerChargesEnabled(sellerEmail: string): Promise<boolean> {
  const email = sellerEmail.trim().toLowerCase();
  const { data } = await getSupabaseAdmin()
    .from("sellers")
    .select("charges_enabled")
    .eq("email", email)
    .maybeSingle();
  return data?.charges_enabled === true;
}
