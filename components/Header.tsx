import Link from "next/link";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export function Header() {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          sx={{ flexGrow: 1, color: "inherit", textDecoration: "none" }}
        >
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
            Marketplace
          </Link>
        </Typography>
        <Button color="inherit" href="/">
          Browse
        </Button>
        <Button color="inherit" href="/listings/new">
          Sell something
        </Button>
      </Toolbar>
    </AppBar>
  );
}
