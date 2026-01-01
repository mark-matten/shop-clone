import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SkipLink } from "@/components/ui/SkipLink";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "ShopWatch - Find the Best Deals on Clothing",
    template: "%s | ShopWatch",
  },
  description: "Find the best deals for new and used clothing across thousands of brands and marketplaces. Track prices, compare products, and save money.",
  keywords: ["shopping", "deals", "clothing", "fashion", "price tracking", "comparison shopping", "resale", "thrift"],
  authors: [{ name: "ShopWatch" }],
  creator: "ShopWatch",
  publisher: "ShopWatch",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ShopWatch",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://shopwatch.app",
    siteName: "ShopWatch",
    title: "ShopWatch - Find the Best Deals on Clothing",
    description: "Find the best deals for new and used clothing across thousands of brands and marketplaces.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ShopWatch - Price Tracking & Comparison Shopping",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ShopWatch - Find the Best Deals on Clothing",
    description: "Find the best deals for new and used clothing across thousands of brands and marketplaces.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#18181b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <SkipLink />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
