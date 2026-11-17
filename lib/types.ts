export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  seller_email: string;
  image_url: string;
  status: "available" | "sold";
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  listing_id: string;
  seller_email: string;
  buyer_email: string | null;
  stripe_account_id: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  amount_total: number;
  application_fee_amount: number;
  currency: string;
  status: "pending" | "paid";
  created_at: string;
  paid_at: string | null;
}
