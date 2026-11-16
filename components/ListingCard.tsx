import Image from "next/image";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import type { Listing } from "@/lib/types";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Card
      component="a"
      href={`/listings/${listing.id}`}
      sx={{ height: "100%", display: "flex", flexDirection: "column", textDecoration: "none" }}
    >
      <Box sx={{ position: "relative", width: "100%", paddingTop: "75%" }}>
        <Image
          src={listing.image_url}
          alt={listing.title}
          fill
          sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
          style={{ objectFit: "cover" }}
        />
      </Box>
      <CardContent sx={{ flexGrow: 1, width: "100%" }}>
        <Typography variant="h6" component="h3" noWrap>
          {listing.title}
        </Typography>
        <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>
          ${listing.price.toFixed(2)}
        </Typography>
        <Chip label={listing.category} size="small" sx={{ mt: 1 }} />
      </CardContent>
    </Card>
  );
}
