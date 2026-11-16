# Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Facebook-style Marketplace: browse listings with category filter, create listing with photo upload, listing detail, message seller.

**Architecture:** Next.js 16 App Router, `cacheComponents: true` (already in next.config). Server Components fetch via supabase-js; runtime reads (`searchParams`, dynamic `params`) stream behind `<Suspense>`. Mutations run in Server Actions (server-side validation per user's vault standards); forms are Client Components using `useActionState`. MUI v9 via `AppRouterCacheProvider` from `@mui/material-nextjs/v16-appRouter`.

**Tech Stack:** Next 16.4.6, React 19, MUI v9, @supabase/supabase-js v2, TypeScript.

**Spec:** User brief (this conversation). Supabase schema/policies fixed; never touch tables/policies/buckets; only publishable anon key.

## Global Constraints

- No new dependencies beyond installed list. No search, auth, chat, edit/delete features.
- `messages` insert: plain `.insert()`, NEVER chain `.select()` (RLS rejects).
- Image: bucket `listing-images`, 5 MB max, jpeg/png/webp/gif, unique filename (`crypto.randomUUID()` + ext), no upsert.
- `seller_email` in messages comes from the listing record, never user input.
- New listing id: generate with `crypto.randomUUID()` before insert (avoids post-insert SELECT); redirect to `/listings/<id>`.
- Orphaned image: after upload, if insert fails, attempt `storage.remove()`; anon policy blocks delete → surface graceful note, do not crash.
- `.env.local` never committed (already in .gitignore). Only `NEXT_PUBLIC_*` vars used.
- Server Components by default; `'use client'` only for the two forms + category filter chips.
- Categories defined once in shared constant; reused by filter and create form.

## Review Focus

- `cacheComponents` strictness: any runtime read (`await params` / `await searchParams`) NOT behind `<Suspense>` fails build with blocking-prerender error → wrap listing/filtered content in Suspense in `page.tsx`.
- Unknown/invalid listing id: uuid-format check + fetch returning null → `notFound()`, proper not-found UI.
- Double submit: `useActionState` pending flag disables submit button.
- Upload failure mid-flow: error surfaced, orphan cleanup attempted, no blank page.
- Storage MIME/size validation happens client-side AND server-side in the action.

## File Map

- Create `lib/supabase.ts` — `createClient(url, anonKey)` singleton.
- Create `lib/constants.ts` — `CATEGORIES`, `MAX_IMAGE_MB = 5`, `IMAGE_TYPES`.
- Create `lib/types.ts` — `Listing` type.
- Create `lib/theme.ts` — MUI theme (#1877F2 primary).
- Create `app/providers.tsx` — `'use client'`, AppRouterCacheProvider + ThemeProvider.
- Modify `app/layout.tsx` — Providers, Header, Container, metadata.
- Create `components/Header.tsx`, `components/ListingCard.tsx` (server-safe, MUI inside), `components/CategoryFilter.tsx` (`'use client'`, chips → `router.push('/?category=')`).
- Rewrite `app/page.tsx` — Suspense-wrapped grid; delete `app/page.module.css`.
- Create `app/listings/new/page.tsx` + `app/listings/new/actions.ts` (`'use server'` createListing) + `app/listings/new/CreateListingForm.tsx` (`'use client'`).
- Create `app/listings/[id]/page.tsx` + `app/listings/[id]/actions.ts` (messageSeller) + `app/listings/[id]/MessageSellerForm.tsx` (`'use client'`).
- Create `app/not-found.tsx`.
- Modify `next.config.ts` — `images.remotePatterns` hostname derived from `NEXT_PUBLIC_SUPABASE_URL`.

## Tasks

### Task 1: Foundation (config, lib, layout, header)

- [ ] `next.config.ts`: remotePatterns from env hostname. Verify: build later reads it.
- [ ] `lib/supabase.ts`, `lib/constants.ts` (CATEGORIES: Electronics, Furniture, Clothing, Vehicles, Home & Garden, Sports, Other), `lib/types.ts`, `lib/theme.ts`, `app/providers.tsx`.
- [ ] `app/layout.tsx`: Providers + Header + Container; metadata title/description. `components/Header.tsx` AppBar: app name → `/`, links `/` and `/listings/new` ("Sell something").
- [ ] Remove `app/page.module.css`.
- Verify: `npx tsc --noEmit` clean.

### Task 2: Homepage grid + category filter

- [ ] `app/page.tsx`: `<Suspense fallback={CircularProgress}>` around async `Listings` reading `await searchParams` (`PageProps<'/'>`), fetching `listings` select `*` order `created_at desc`, optional `.eq('category', category)`. Error → readable MUI Alert.
- [ ] `components/ListingCard.tsx`: Card + next/image (`fill`, sizes), title, price ($ format), category Chip, links to detail.
- [ ] `components/CategoryFilter.tsx`: client Chips from CATEGORIES + "All", updates `?category=` via `useRouter`; active state from current param.
- [ ] Empty state: no listings → friendly message + "Sell something" button.
- Verify: `npx tsc --noEmit` clean.

### Task 3: Detail page + message seller

- [ ] `app/listings/[id]/page.tsx`: Suspense-wrapped async child awaits `params`, validates uuid regex, fetch single listing; null → `notFound()`. Shows full image, title, price, category, description, seller email, posted date. `generateMetadata` for title.
- [ ] `app/not-found.tsx`: friendly 404.
- [ ] `app/listings/[id]/actions.ts`: `'use server'` `messageSeller(prev, formData)` — server validation (buyer email format, non-empty message), insert `{ listing_id, buyer_email, seller_email: listing.seller_email, message }` plain insert, no select; returns `{ ok }` or `{ error }`. Fetch listing first; missing → error.
- [ ] `MessageSellerForm.tsx`: client, `useActionState`, pending disables submit, success → confirmation + reset, error → Alert.
- Verify: `npx tsc --noEmit` clean.

### Task 4: Create listing

- [ ] `app/listings/new/actions.ts`: `'use server'` `createListing(prev, formData)`. Server validation mirrors client: all fields required, email format, price positive finite ≤ 99999999.99, image mime in IMAGE_TYPES and ≤ 5 MB. Upload to `listing-images` with `crypto.randomUUID()+ext`, `getPublicUrl()`, insert listing with generated uuid. On insert failure: attempt `remove()`, if that also fails return error noting orphaned upload. On success `redirect(\`/listings/${id}\`)`.
- [ ] `CreateListingForm.tsx`: client, `useActionState`, grouped state object, client validation with clear per-field errors, file input with preview, pending spinner + disabled, prevent double submit.
- [ ] `app/listings/new/page.tsx`: server shell + form.
- Verify: `npx tsc --noEmit` clean.

### Task 5: Verify + finish

- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run build` — fix all failures.
- [ ] Manual flows without browser automation (challenge forbids heavy browser tooling): start dev/prod server; script against Supabase with anon key to (1) insert a test listing with a real uploaded image (same code path as the action), (2) curl `/` (newest first, contains listing), (3) curl `/?category=<its category>`, (4) curl detail page, (5) insert message via plain insert (no select) as the form does. Delete nothing (no delete policy); note test data left behind if cleanup impossible.
- [ ] Report: what ran, what passed, limits.
