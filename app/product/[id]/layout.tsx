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
    title: "Product Details | armoi",
    description: "View product details, price history, and similar items on armoi.",
    openGraph: {
      title: "Product Details | armoi",
      description: "View product details, price history, and similar items on armoi.",
      type: "website",
      siteName: "armoi",
    },
    twitter: {
      card: "summary_large_image",
      title: "Product Details | armoi",
      description: "View product details, price history, and similar items on armoi.",
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
