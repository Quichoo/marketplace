import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { CreateListingForm } from "./CreateListingForm";

export const metadata: Metadata = { title: "Sell something" };

export default function NewListingPage() {
  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Sell something
      </Typography>
      <CreateListingForm />
    </>
  );
}
