import { Metadata } from "next";

// Dynamic metadata for product pages
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  // In production, you would fetch the product data here
  // For now, return generic metadata that will be overridden by client-side
  return {
    title: "Product Details | ShopWatch",
    description: "View product details, price history, and similar items on ShopWatch.",
    openGraph: {
      title: "Product Details | ShopWatch",
      description: "View product details, price history, and similar items on ShopWatch.",
      type: "website",
      siteName: "ShopWatch",
    },
    twitter: {
      card: "summary_large_image",
      title: "Product Details | ShopWatch",
      description: "View product details, price history, and similar items on ShopWatch.",
    },
  };
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
