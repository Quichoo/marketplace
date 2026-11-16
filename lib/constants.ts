export const CATEGORIES = [
  "Electronics",
  "Furniture",
  "Clothing",
  "Vehicles",
  "Home & Garden",
  "Sports",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const MAX_IMAGE_MB = 5;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export const IMAGE_EXTENSIONS: Record<(typeof IMAGE_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
