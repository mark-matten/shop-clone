import type { ScrapedProduct, ScraperResult, ScraperConfig } from "./types";
import * as cheerio from "cheerio";

async function fetchTheRealRealPage(category: string, page: number = 1): Promise<string> {
  const url = `https://www.therealreal.com/shop/${category}?page=${page}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

function parsePrice(priceStr: string): number {
  const match = priceStr.match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(",", ""));
  }
  return 0;
}

function mapCategory(urlCategory: string): string {
  if (urlCategory.includes("handbags")) return "bags";
  if (urlCategory.includes("shoes")) return "shoes";
  if (urlCategory.includes("clothing")) return "clothing";
  if (urlCategory.includes("accessories")) return "accessories";
  if (urlCategory.includes("jewelry")) return "jewelry";
  return "other";
}

function mapGender(urlCategory: string): "men" | "women" | "unisex" | undefined {
  if (urlCategory.includes("women")) return "women";
  if (urlCategory.includes("men")) return "men";
  return undefined;
}

export async function scrapeTheRealReal(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 100;
  const categories = config.categories || [
    "women/handbags",
    "women/shoes",
    "women/clothing/dresses",
    "women/clothing/outerwear",
    "men/shoes",
    "men/clothing",
  ];

  const products: ScrapedProduct[] = [];
  const errors: string[] = [];
  const seenUrls = new Set<string>();

  console.log("Starting TheRealReal scraper...");

  for (const category of categories) {
    if (products.length >= maxProducts) break;

    console.log(`  Scraping category: ${category}`);

    try {
      const html = await fetchTheRealRealPage(category);
      const $ = cheerio.load(html);

      // TheRealReal uses product cards with specific data attributes
      $('[data-testid="product-card"], .product-card, [class*="ProductCard"]').each((_, el) => {
        if (products.length >= maxProducts) return false;

        const $el = $(el);

        // Try multiple selectors for product data
        const name = $el.find('[class*="product-name"], [class*="ProductName"], h3, h4').first().text().trim();
        const brand = $el.find('[class*="designer"], [class*="brand"], [class*="Designer"]').first().text().trim();
        const priceText = $el.find('[class*="price"], [class*="Price"]').first().text().trim();
        const link = $el.find('a').first().attr('href');
        const image = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');

        if (!name || !link) return;

        const fullUrl = link.startsWith('http') ? link : `https://www.therealreal.com${link}`;

        if (seenUrls.has(fullUrl)) return;
        seenUrls.add(fullUrl);

        const price = parsePrice(priceText);
        if (price <= 0) return;

        products.push({
          name: name || "Designer Item",
          description: `${brand} ${name} from TheRealReal`,
          brand: brand || "Designer",
          price,
          category: mapCategory(category),
          gender: mapGender(category),
          condition: "like_new", // TheRealReal items are authenticated pre-owned
          sourceUrl: fullUrl,
          sourcePlatform: "TheRealReal",
          imageUrl: image,
        });
      });

      // Rate limiting
      await new Promise((r) => setTimeout(r, 1500));
    } catch (error) {
      errors.push(`Failed to scrape ${category}: ${error}`);
      console.log(`  Error scraping ${category}: ${error}`);
    }
  }

  console.log(`TheRealReal: Found ${products.length} products`);

  return {
    products,
    source: "TheRealReal",
    scrapedAt: new Date(),
    errors: errors.length > 0 ? errors : undefined,
  };
}
