import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { scrapeAll, ScrapedProduct } from "./scrapers";

// Load environment
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function importProducts(products: ScrapedProduct[]): Promise<{ inserted: number; updated: number; errors: number }> {
  console.log(`\nImporting ${products.length} products to Convex (upsert mode)...`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  // Import in parallel batches for speed
  const batchSize = 20;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (product) => {
        const result = await client.mutation(api.products.upsertProduct, {
          name: product.name,
          description: product.description,
          brand: product.brand,
          price: product.price,
          originalPrice: product.originalPrice,
          material: product.material,
          size: product.size,
          sizes: product.sizes,
          variants: product.variants,
          options: product.options,
          colorGroupId: product.colorGroupId,
          colorName: product.colorName,
          colorHex: product.colorHex,
          category: product.category,
          gender: product.gender,
          condition: product.condition,
          sourceUrl: product.sourceUrl,
          sourcePlatform: product.sourcePlatform,
          imageUrl: product.imageUrl,
          imageUrls: product.imageUrls,
        });
        return result;
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.action === "inserted") inserted++;
        else updated++;
      } else {
        errors++;
      }
    }

    // Progress update every 100 products
    if ((i + batchSize) % 100 === 0 || i + batchSize >= products.length) {
      console.log(`  Progress: ${Math.min(i + batchSize, products.length)}/${products.length} (${inserted} new, ${updated} updated, ${errors} errors)`);
    }

    // Small delay to avoid overwhelming the server
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log(`\nImport complete: ${inserted} inserted, ${updated} updated, ${errors} errors`);

  return { inserted, updated, errors };
}

// All available scraper sources
type ScraperSource =
  | "poshmark" | "therealreal" | "brands" | "jcrew" | "everlane"
  | "shopify-brands" | "major-retailers" | "marketplaces"
  | "gymshark" | "allbirds" | "alo-yoga" | "outdoor-voices" | "bombas"
  | "quince" | "buck-mason" | "taylor-stitch" | "good-american" | "figs"
  | "rebecca-minkoff" | "clare-v" | "pura-vida"
  | "carhartt" | "levis" | "dickies" | "uniqlo" | "patagonia" | "llbean"
  | "depop" | "grailed" | "stockx" | "backcountry" | "zappos";

const ALL_SOURCES: ScraperSource[] = [
  "everlane", "jcrew", "poshmark", "therealreal", "brands",
  "outdoor-voices", "allbirds", "taylor-stitch",
  "rebecca-minkoff", "clare-v", "pura-vida",
  "carhartt", "levis", "dickies", "uniqlo", "patagonia", "llbean",
  "depop", "grailed", "stockx", "backcountry", "zappos"
];

async function main() {
  const args = process.argv.slice(2);

  // Parse command line options
  const sources: ScraperSource[] = [];
  let maxProducts = 500; // Default

  for (const arg of args) {
    const flag = arg.replace("--", "") as ScraperSource;
    // Check if it's a known source
    if ([
      "poshmark", "therealreal", "brands", "jcrew", "everlane",
      "shopify-brands", "major-retailers", "marketplaces",
      "gymshark", "allbirds", "alo-yoga", "outdoor-voices", "bombas",
      "quince", "buck-mason", "taylor-stitch", "good-american", "figs",
      "rebecca-minkoff", "clare-v", "pura-vida",
      "carhartt", "levis", "dickies", "uniqlo", "patagonia", "llbean",
      "depop", "grailed", "stockx", "backcountry", "zappos"
    ].includes(flag)) {
      sources.push(flag);
    }
    if (arg === "--all") sources.push(...ALL_SOURCES);
    if (arg.startsWith("--max=")) {
      maxProducts = parseInt(arg.split("=")[1]) || 500;
    }
  }

  // Default to everlane if none specified
  if (sources.length === 0) {
    sources.push("everlane");
  }

  console.log("Product Scraper & Importer (Upsert Mode)");
  console.log("========================================");
  console.log(`Sources: ${sources.join(", ")}`);
  console.log(`Max products per source: ${maxProducts}`);
  console.log("");

  try {
    // Scrape products
    const products = await scrapeAll({
      sources,
      maxProductsPerSource: maxProducts,
    });

    if (products.length === 0) {
      console.log("No products scraped. This might be due to:");
      console.log("  - Sites blocking requests");
      console.log("  - Changed HTML structure");
      console.log("  - Network issues");
      return;
    }

    // Deduplicate by URL
    const uniqueProducts = products.filter(
      (p, i, arr) => arr.findIndex((x) => x.sourceUrl === p.sourceUrl) === i
    );
    console.log(`\nUnique products after dedup: ${uniqueProducts.length}`);

    // Import to Convex (upsert - update existing, insert new)
    await importProducts(uniqueProducts);
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
}

main();
