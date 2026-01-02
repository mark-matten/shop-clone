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

async function importProducts(products: ScrapedProduct[]): Promise<number> {
  console.log(`\nImporting ${products.length} products to Convex...`);

  let imported = 0;
  let errors = 0;

  // Import in batches to avoid rate limits
  const batchSize = 10;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    for (const product of batch) {
      try {
        const result = await client.mutation(api.products.addProduct, {
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
        if (result) {
          imported++;
        } else {
          errors++;
          console.error(`No result returned for "${product.name}"`);
        }
      } catch (error) {
        errors++;
        console.error(`Failed to import "${product.name}":`, error);
      }
    }

    // Progress update
    console.log(`  Imported ${Math.min(i + batchSize, products.length)}/${products.length}`);

    // Rate limiting
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\nImport complete: ${imported} added, ${errors} errors`);

  // Verify by querying the database
  try {
    const allProducts = await client.query(api.products.getAllProducts, {});
    const everlaneProducts = allProducts.filter((p: { sourcePlatform: string }) => p.sourcePlatform === "Everlane");
    console.log(`Verification: Found ${everlaneProducts.length} Everlane products in database`);
  } catch (e) {
    console.error("Verification failed:", e);
  }

  return imported;
}

async function main() {
  const args = process.argv.slice(2);

  // Parse command line options
  const sources: ("poshmark" | "therealreal" | "brands" | "jcrew" | "everlane")[] = [];
  let maxProducts = 50;

  for (const arg of args) {
    if (arg === "--poshmark") sources.push("poshmark");
    if (arg === "--therealreal") sources.push("therealreal");
    if (arg === "--brands") sources.push("brands");
    if (arg === "--jcrew") sources.push("jcrew");
    if (arg === "--everlane") sources.push("everlane");
    if (arg === "--all") sources.push("poshmark", "therealreal", "brands", "jcrew", "everlane");
    if (arg.startsWith("--max=")) {
      maxProducts = parseInt(arg.split("=")[1]) || 50;
    }
  }

  // Default to everlane if none specified
  if (sources.length === 0) {
    sources.push("everlane");
  }

  console.log("Product Scraper & Importer");
  console.log("==========================");
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

    // Import to Convex
    await importProducts(uniqueProducts);
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
}

main();
