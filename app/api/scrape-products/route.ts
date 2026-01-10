import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, brandKey, marketplace, searchQuery } = body;

    if (!type) {
      return NextResponse.json(
        { error: "type is required (brand, marketplace, or all)" },
        { status: 400 }
      );
    }

    if (type === "brand" && !brandKey) {
      return NextResponse.json(
        { error: "brandKey is required for brand scraping" },
        { status: 400 }
      );
    }

    if (type === "marketplace" && (!marketplace || !searchQuery)) {
      return NextResponse.json(
        { error: "marketplace and searchQuery are required for marketplace scraping" },
        { status: 400 }
      );
    }

    console.log(`[API/scrape-products] Starting ${type} scrape...`);

    const result = await convex.action(api.productScraper.triggerScrape, {
      type,
      brandKey,
      marketplace,
      searchQuery,
    });

    console.log(`[API/scrape-products] Scrape complete:`, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API/scrape-products] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scrape products" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    availableBrands: ["everlane", "outdoorvoices", "frankandoak"],
    availableMarketplaces: ["poshmark", "therealreal", "ebay"],
    usage: {
      "scrape brand": "POST { type: 'brand', brandKey: 'everlane' }",
      "scrape marketplace": "POST { type: 'marketplace', marketplace: 'poshmark', searchQuery: 'everlane dress' }",
      "scrape all": "POST { type: 'all' }",
    },
  });
}
