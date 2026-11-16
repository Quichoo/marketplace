import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Container from "@mui/material/Container";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Marketplace",
    template: "%s | Marketplace",
  },
  description: "Buy and sell items in your community.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Providers>
          <Header />
          <Container maxWidth="lg" sx={{ py: 3 }}>
            {children}
          </Container>
        </Providers>
      </body>
    </html>
  );
}
