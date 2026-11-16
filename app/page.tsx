import { Suspense } from "react";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { getSupabase } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/constants";
import type { Listing } from "@/lib/types";
import { ListingCard } from "@/components/ListingCard";
import { CategoryFilter } from "@/components/CategoryFilter";

async function Listings({ category }: { category: string | undefined }) {
  let listings: Listing[];
  try {
    let query = getSupabase().from("listings").select("*").order("created_at", { ascending: false });
    if (category) {
      query = query.eq("category", category);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }
    listings = data;
  } catch {
    return <Alert severity="error">Could not load listings. Please try again later.</Alert>;
  }

  if (listings.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h6" gutterBottom>
          {category ? `No listings in ${category} yet.` : "No listings yet."}
        </Typography>
        <Button variant="contained" href="/listings/new">
          Sell something
        </Button>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {listings.map((listing) => (
        <Grid key={listing.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <ListingCard listing={listing} />
        </Grid>
      ))}
    </Grid>
  );
}

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Today&apos;s listings
      </Typography>
      <Suspense fallback={<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}>
        <CategoryFilterSection searchParams={searchParams} />
      </Suspense>
    </Box>
  );
}

async function CategoryFilterSection({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { category } = await searchParams;
  const categoryParam = typeof category === "string" ? category : undefined;
  const categoryValue = CATEGORIES.includes(categoryParam as (typeof CATEGORIES)[number])
    ? categoryParam
    : undefined;

  return (
    <>
      <CategoryFilter active={categoryValue} />
      <Listings category={categoryValue} />
    </>
  );
}
