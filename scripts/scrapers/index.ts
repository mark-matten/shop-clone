import { scrapePoshmark } from "./poshmark";
import { scrapeTheRealReal } from "./therealreal";
import { scrapeBrands } from "./brands";
import { scrapeJCrew } from "./jcrew";
import { scrapeEverlane } from "./everlane";
import type { ScrapedProduct, ScraperResult } from "./types";

interface ScrapeOptions {
  sources?: ("poshmark" | "therealreal" | "brands" | "jcrew" | "everlane")[];
  maxProductsPerSource?: number;
}

export async function scrapeAll(options: ScrapeOptions = {}): Promise<ScrapedProduct[]> {
  const sources = options.sources || ["poshmark", "therealreal", "brands"];
  const maxProducts = options.maxProductsPerSource || 50;

  const allProducts: ScrapedProduct[] = [];
  const results: ScraperResult[] = [];

  console.log("\n========================================");
  console.log("Starting Product Scraper");
  console.log(`Sources: ${sources.join(", ")}`);
  console.log(`Max products per source: ${maxProducts}`);
  console.log("========================================\n");

  for (const source of sources) {
    try {
      let result: ScraperResult;

      switch (source) {
        case "poshmark":
          result = await scrapePoshmark({ maxProducts });
          break;
        case "therealreal":
          result = await scrapeTheRealReal({ maxProducts });
          break;
        case "brands":
          result = await scrapeBrands({ maxProducts });
          break;
        case "jcrew":
          result = await scrapeJCrew({ maxProducts });
          break;
        case "everlane":
          result = await scrapeEverlane({ maxProducts });
          break;
        default:
          continue;
      }

      results.push(result);
      allProducts.push(...result.products);

      if (result.errors && result.errors.length > 0) {
        console.log(`\nErrors from ${source}:`);
        result.errors.forEach((e) => console.log(`  - ${e}`));
      }
    } catch (error) {
      console.error(`Failed to scrape ${source}:`, error);
    }
  }

  console.log("\n========================================");
  console.log("Scraping Complete");
  console.log(`Total products: ${allProducts.length}`);
  results.forEach((r) => {
    console.log(`  ${r.source}: ${r.products.length} products`);
  });
  console.log("========================================\n");

  return allProducts;
}

// Export individual scrapers for direct use
export { scrapePoshmark } from "./poshmark";
export { scrapeTheRealReal } from "./therealreal";
export { scrapeBrands } from "./brands";
export { scrapeJCrew } from "./jcrew";
export { scrapeEverlane } from "./everlane";
export type { ScrapedProduct, ScraperResult, ScraperConfig } from "./types";
