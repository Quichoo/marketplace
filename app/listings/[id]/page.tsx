import { Suspense } from "react";
import Image from "next/image";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import type { Listing } from "@/lib/types";
import { MessageSellerForm } from "./MessageSellerForm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ListingDetail({ id }: { id: string }) {
  if (!UUID_RE.test(id)) {
    notFound();
  }

  const { data: listing, error } = await getSupabase()
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !listing) {
    notFound();
  }

  const l = listing as Listing;
  const postedDate = new Date(l.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3 }}>
      <Box sx={{ flex: "1 1 60%", position: "relative", minHeight: 300 }}>
        <Image
          src={l.image_url}
          alt={l.title}
          fill
          sizes="(max-width: 900px) 100vw, 60vw"
          style={{ objectFit: "cover", borderRadius: 8 }}
        />
        {l.status === "sold" && (
          <Typography
            variant="overline"
            sx={{
              position: "absolute",
              top: 16,
              left: 16,
              bgcolor: "error.main",
              color: "error.contrastText",
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontWeight: 700,
            }}
          >
            Sold
          </Typography>
        )}
      </Box>
      <Box sx={{ flex: "1 1 40%", display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h4" component="h1">
          {l.title}
        </Typography>
        <Typography
          variant="h5"
          color="primary.main"
          sx={{ fontWeight: 700, ...(l.status === "sold" && { textDecoration: "line-through" }) }}
        >
          ${l.price.toFixed(2)}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Chip label={l.category} size="small" />
          {l.status === "sold" && <Chip label="Sold" size="small" color="error" variant="outlined" />}
          <Typography variant="body2" color="text.secondary">
            Posted {postedDate}
          </Typography>
        </Box>
        <Divider />
        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
          {l.description}
        </Typography>
        <Divider />
        <Typography variant="body2" color="text.secondary">
          Sold by: <strong>{l.seller_email}</strong>
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
          <Typography variant="h6" gutterBottom>
            Message seller
          </Typography>
          <MessageSellerForm listingId={l.id} />
        </Paper>
      </Box>
    </Box>
  );
}

export function generateMetadata(): Metadata {
  return { title: "Listing" };
}

export default function ListingPage({ params }: PageProps<"/listings/[id]">) {
  return (
    <Suspense fallback={<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}>
      <ListingDetailParams params={params} />
    </Suspense>
  );
}

async function ListingDetailParams({ params }: { params: PageProps<"/listings/[id]">["params"] }) {
  const { id } = await params;
  return <ListingDetail id={id} />;
}
