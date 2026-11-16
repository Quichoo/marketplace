"use server";

import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { CATEGORIES, IMAGE_TYPES, IMAGE_EXTENSIONS, MAX_IMAGE_MB } from "@/lib/constants";

export interface CreateListingState {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

function validate(
  title: string,
  description: string,
  price: string,
  category: string,
  sellerEmail: string,
): string | undefined {
  if (!title) return "Title is required.";
  if (title.length > 255) return "Title must be 255 characters or fewer.";
  if (!description) return "Description is required.";
  if (!price) return "Price is required.";
  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    return "Price must be a positive number.";
  }
  if (priceNum > 99999999.99) {
    return "Price is too large.";
  }
  if (!category) return "Category is required.";
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return "Please choose a valid category.";
  }
  if (!sellerEmail) return "Your email is required.";
  if (!EMAIL_RE.test(sellerEmail)) return "Please enter a valid email address.";
  return undefined;
}

function validateImage(file: File): string | undefined {
  if (!file || file.size === 0) return "A photo is required.";
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Image must be a JPEG, PNG, WebP, or GIF.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Image must be ${MAX_IMAGE_MB} MB or smaller.`;
  }
  return undefined;
}

export async function createListing(
  _prev: CreateListingState,
  formData: FormData,
): Promise<CreateListingState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = String(formData.get("price") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const sellerEmail = String(formData.get("sellerEmail") ?? "").trim();
  const image = formData.get("image");

  const validationError =
    validate(title, description, price, category, sellerEmail) ??
    (image instanceof File ? validateImage(image) : "A photo is required.");
  if (validationError) {
    return { error: validationError };
  }
  const file = image as File;

  try {
    const supabase = getSupabase();
    const extension = IMAGE_EXTENSIONS[file.type as (typeof IMAGE_TYPES)[number]];
    const path = `${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(path, file);
    if (uploadError) {
      return { error: "Could not upload the image. Please try again." };
    }

    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    const imageUrl = data.publicUrl;
    const id = crypto.randomUUID();

    const { error: insertError } = await supabase.from("listings").insert({
      id,
      title,
      description,
      price: Number(price),
      category,
      seller_email: sellerEmail,
      image_url: imageUrl,
    });
    if (insertError) {
      // Storage policy: anon can only INSERT, not delete — this usually fails, but try anyway.
      const { error: removeError } = await supabase.storage
        .from("listing-images")
        .remove([path]);
      return {
        error: removeError
          ? "Could not save the listing. The uploaded image could not be removed and may remain orphaned. Please try again."
          : "Could not save the listing. Please try again.",
      };
    }

    redirect(`/listings/${id}`);
  } catch (e) {
    // redirect() throws a control-flow error; let it propagate.
    if (e && typeof e === "object" && "digest" in e) {
      throw e;
    }
    return { error: "Something went wrong. Please try again." };
  }
}
