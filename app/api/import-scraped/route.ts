import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import * as fs from "fs";
import * as path from "path";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ScrapedProduct {
  name: string;
  brand: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  gender?: "men" | "women" | "unisex";
  condition: "new" | "used" | "like_new";
  sourceUrl: string;
  sourcePlatform: string;
  imageUrl?: string;
  size?: string;
}

export async function POST() {
  try {
    const scrapeDir = "/tmp/scrape-results";

    // Check if directory exists
    if (!fs.existsSync(scrapeDir)) {
      return NextResponse.json({ error: "No scrape results found" }, { status: 404 });
    }

    const files = fs.readdirSync(scrapeDir).filter(f => f.endsWith(".json"));
    console.log(`[Import] Found ${files.length} scrape result files`);

    let allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    for (const file of files) {
      try {
        const filePath = path.join(scrapeDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(content);

        if (data.products && Array.isArray(data.products)) {
          for (const product of data.products) {
            // Dedupe by sourceUrl
            if (seen.has(product.sourceUrl)) continue;
            seen.add(product.sourceUrl);

            // Validate required fields
            if (!product.name || !product.price || !product.sourceUrl) continue;

            allProducts.push({
              name: product.name,
              brand: product.brand || "Unknown",
              description: product.description || product.name,
              price: product.price,
              originalPrice: product.originalPrice,
              category: product.category || "other",
              gender: product.gender || "women",
              condition: product.condition || "used",
              sourceUrl: product.sourceUrl,
              sourcePlatform: product.sourcePlatform || "Unknown",
              imageUrl: product.imageUrl,
              size: product.size,
            });
          }
        }
      } catch (err) {
        console.error(`[Import] Error reading ${file}:`, err);
      }
    }

    console.log(`[Import] Total unique products to import: ${allProducts.length}`);

    // Import in batches of 50
    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      try {
        await convex.mutation(api.products.bulkAddProducts, { products: batch });
        imported += batch.length;
        console.log(`[Import] Imported ${imported}/${allProducts.length} products`);
      } catch (err) {
        console.error(`[Import] Error importing batch ${i}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      filesProcessed: files.length,
      totalProducts: allProducts.length,
      imported,
    });
  } catch (error) {
    console.error("[Import] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Check what's available to import
  const scrapeDir = "/tmp/scrape-results";

  if (!fs.existsSync(scrapeDir)) {
    return NextResponse.json({ message: "No scrape results found", files: 0, estimatedProducts: 0 });
  }

  const files = fs.readdirSync(scrapeDir).filter(f => f.endsWith(".json"));
  let total = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(scrapeDir, file), "utf-8");
      const data = JSON.parse(content);
      total += data.count || 0;
    } catch {
      // Skip invalid files
    }
  }

  return NextResponse.json({
    files: files.length,
    estimatedProducts: total,
    usage: "POST to this endpoint to import all scraped products",
  });
}
