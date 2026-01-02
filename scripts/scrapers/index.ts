import { scrapePoshmark } from "./poshmark";
import { scrapeTheRealReal } from "./therealreal";
import { scrapeBrands } from "./brands";
import { scrapeJCrew } from "./jcrew";
import { scrapeEverlane } from "./everlane";
import {
  scrapeAllShopifyBrands,
  scrapeShopifyBrand,
  scrapeGymshark,
  scrapeAllbirds,
  scrapeAloYoga,
  scrapeOutdoorVoices,
  scrapeBombas,
  scrapeQuince,
  scrapeBuckMason,
  scrapeTaylorStitch,
  scrapeGoodAmerican,
  scrapeFigs,
  scrapeRebeccaMinkoff,
  scrapeClareV,
  scrapePuraVida,
  SHOPIFY_BRANDS,
} from "./shopify-brands";
import {
  scrapeAllMajorRetailers,
  scrapeCarhartt,
  scrapeLevis,
  scrapeDickies,
  scrapeUniqlo,
  scrapePatagonia,
  scrapeLLBean,
} from "./major-retailers";
import {
  scrapeAllMarketplaces,
  scrapeDepop,
  scrapeGrailed,
  scrapeStockX,
  scrapeBackcountry,
  scrapeZappos,
} from "./marketplaces";
import type { ScrapedProduct, ScraperResult } from "./types";

// All available sources
type ScraperSource =
  | "poshmark"
  | "therealreal"
  | "brands"
  | "jcrew"
  | "everlane"
  | "shopify-brands"
  | "major-retailers"
  | "marketplaces"
  // Individual Shopify brands
  | "gymshark"
  | "allbirds"
  | "alo-yoga"
  | "outdoor-voices"
  | "bombas"
  | "quince"
  | "buck-mason"
  | "taylor-stitch"
  | "good-american"
  | "figs"
  | "rebecca-minkoff"
  | "clare-v"
  | "pura-vida"
  // Individual major retailers
  | "carhartt"
  | "levis"
  | "dickies"
  | "uniqlo"
  | "patagonia"
  | "llbean"
  // Individual marketplaces
  | "depop"
  | "grailed"
  | "stockx"
  | "backcountry"
  | "zappos";

interface ScrapeOptions {
  sources?: ScraperSource[];
  maxProductsPerSource?: number;
}

export async function scrapeAll(options: ScrapeOptions = {}): Promise<ScrapedProduct[]> {
  const sources = options.sources || ["everlane"];
  const maxProducts = options.maxProductsPerSource || 100;

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
        // Original scrapers
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

        // Shopify brands (grouped)
        case "shopify-brands":
          result = await scrapeAllShopifyBrands({ maxProducts });
          break;

        // Individual Shopify brands
        case "gymshark":
          result = await scrapeGymshark({ maxProducts });
          break;
        case "allbirds":
          result = await scrapeAllbirds({ maxProducts });
          break;
        case "alo-yoga":
          result = await scrapeAloYoga({ maxProducts });
          break;
        case "outdoor-voices":
          result = await scrapeOutdoorVoices({ maxProducts });
          break;
        case "bombas":
          result = await scrapeBombas({ maxProducts });
          break;
        case "quince":
          result = await scrapeQuince({ maxProducts });
          break;
        case "buck-mason":
          result = await scrapeBuckMason({ maxProducts });
          break;
        case "taylor-stitch":
          result = await scrapeTaylorStitch({ maxProducts });
          break;
        case "good-american":
          result = await scrapeGoodAmerican({ maxProducts });
          break;
        case "figs":
          result = await scrapeFigs({ maxProducts });
          break;
        case "rebecca-minkoff":
          result = await scrapeRebeccaMinkoff({ maxProducts });
          break;
        case "clare-v":
          result = await scrapeClareV({ maxProducts });
          break;
        case "pura-vida":
          result = await scrapePuraVida({ maxProducts });
          break;

        // Major retailers (grouped)
        case "major-retailers":
          result = await scrapeAllMajorRetailers({ maxProducts });
          break;

        // Individual major retailers
        case "carhartt":
          result = await scrapeCarhartt({ maxProducts });
          break;
        case "levis":
          result = await scrapeLevis({ maxProducts });
          break;
        case "dickies":
          result = await scrapeDickies({ maxProducts });
          break;
        case "uniqlo":
          result = await scrapeUniqlo({ maxProducts });
          break;
        case "patagonia":
          result = await scrapePatagonia({ maxProducts });
          break;
        case "llbean":
          result = await scrapeLLBean({ maxProducts });
          break;

        // Marketplaces (grouped)
        case "marketplaces":
          result = await scrapeAllMarketplaces({ maxProducts });
          break;

        // Individual marketplaces
        case "depop":
          result = await scrapeDepop({ maxProducts });
          break;
        case "grailed":
          result = await scrapeGrailed({ maxProducts });
          break;
        case "stockx":
          result = await scrapeStockX({ maxProducts });
          break;
        case "backcountry":
          result = await scrapeBackcountry({ maxProducts });
          break;
        case "zappos":
          result = await scrapeZappos({ maxProducts });
          break;

        default:
          console.log(`Unknown source: ${source}`);
          continue;
      }

      results.push(result);
      allProducts.push(...result.products);

      if (result.errors && result.errors.length > 0) {
        console.log(`\nErrors from ${source}:`);
        result.errors.slice(0, 5).forEach((e) => console.log(`  - ${e}`));
        if (result.errors.length > 5) {
          console.log(`  ... and ${result.errors.length - 5} more errors`);
        }
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

// Export Shopify brand scrapers
export {
  scrapeAllShopifyBrands,
  scrapeShopifyBrand,
  scrapeGymshark,
  scrapeAllbirds,
  scrapeAloYoga,
  scrapeOutdoorVoices,
  scrapeBombas,
  scrapeQuince,
  scrapeBuckMason,
  scrapeTaylorStitch,
  scrapeGoodAmerican,
  scrapeFigs,
  scrapeRebeccaMinkoff,
  scrapeClareV,
  scrapePuraVida,
  SHOPIFY_BRANDS,
} from "./shopify-brands";

// Export major retailer scrapers
export {
  scrapeAllMajorRetailers,
  scrapeCarhartt,
  scrapeLevis,
  scrapeDickies,
  scrapeUniqlo,
  scrapePatagonia,
  scrapeLLBean,
} from "./major-retailers";

// Export marketplace scrapers
export {
  scrapeAllMarketplaces,
  scrapeDepop,
  scrapeGrailed,
  scrapeStockX,
  scrapeBackcountry,
  scrapeZappos,
} from "./marketplaces";

export type { ScrapedProduct, ScraperResult, ScraperConfig } from "./types";
