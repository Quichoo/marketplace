import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

export default function NotFound() {
  return (
    <Box sx={{ textAlign: "center", py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Page not found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        The page or listing you are looking for does not exist or is no longer available.
      </Typography>
      <Button variant="contained" href="/">
        Back to Marketplace
      </Button>
    </Box>
  );
}
