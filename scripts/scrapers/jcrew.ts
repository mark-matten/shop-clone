import puppeteer, { Browser, Page } from "puppeteer";
import type { ScrapedProduct, ScraperResult, ScraperConfig } from "./types";

interface JCrewCategory {
  url: string;
  category: string;
  gender: "men" | "women";
}

const JCREW_CATEGORIES: JCrewCategory[] = [
  // Women's categories
  { url: "/c/womens_category/sweaters", category: "sweaters", gender: "women" },
  { url: "/c/womens_category/dresses", category: "dresses", gender: "women" },
  { url: "/c/womens_category/blazers", category: "outerwear", gender: "women" },
  { url: "/c/womens_category/pants", category: "pants", gender: "women" },
  { url: "/c/womens_category/tshirts_702", category: "tops", gender: "women" },
  { url: "/c/womens_category/jeans", category: "jeans", gender: "women" },
  { url: "/c/womens_category/skirts", category: "skirts", gender: "women" },
  { url: "/c/womens_category/shoes", category: "shoes", gender: "women" },
  // Men's categories
  { url: "/c/mens_category/sweaters", category: "sweaters", gender: "men" },
  { url: "/c/mens_category/shirts", category: "tops", gender: "men" },
  { url: "/c/mens_category/tshirts", category: "tops", gender: "men" },
  { url: "/c/mens_category/pants", category: "pants", gender: "men" },
  { url: "/c/mens_category/jeans", category: "jeans", gender: "men" },
  { url: "/c/mens_category/suits", category: "suits", gender: "men" },
  { url: "/c/mens_category/shoes", category: "shoes", gender: "men" },
];

function parsePrice(text: string): number {
  // Extract price from text like "$198" or "Now $98.50"
  const match = text.match(/\$[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/[$,]/g, ""));
  }
  return 0;
}

function extractProductName(text: string): string {
  // Remove badges like "top rated", "best seller", review counts, and prices
  let name = text
    .replace(/top rated/gi, "")
    .replace(/best seller/gi, "")
    .replace(/new arrival/gi, "")
    .replace(/\d+ REVIEWS?/gi, "")
    .replace(/\$[\d,]+\.?\d*/g, "")
    .trim();

  // Capitalize first letter
  if (name) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  return name;
}

async function scrapeJCrewCategory(
  page: Page,
  category: JCrewCategory,
  maxProducts: number
): Promise<ScrapedProduct[]> {
  const products: ScrapedProduct[] = [];
  const url = `https://www.jcrew.com${category.url}`;

  console.log(`    Loading: ${url}`);

  try {
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Wait for products to load
    await page.waitForSelector(".c-product-tile, .product-tile", { timeout: 15000 });

    // Scroll to load more products
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise(r => setTimeout(r, 1000));
    }

    // Extract product data
    const productData = await page.evaluate(() => {
      const items: {
        name: string;
        price: string;
        url: string;
        imageUrl: string;
        sku: string;
      }[] = [];

      // Find all product tiles
      const tiles = document.querySelectorAll(".c-product-tile, .product-tile");

      tiles.forEach((tile) => {
        // Find the main product link (not review link)
        const links = tile.querySelectorAll('a[href*="/p/"]');
        let mainLink: HTMLAnchorElement | null = null;

        for (const link of links) {
          const href = (link as HTMLAnchorElement).href;
          if (!href.includes("#product-reviews")) {
            mainLink = link as HTMLAnchorElement;
            break;
          }
        }

        if (!mainLink) return;

        const href = mainLink.href;

        // Extract SKU from URL (last path segment before query params)
        const urlMatch = href.match(/\/([A-Z0-9]+)\?/);
        const sku = urlMatch ? urlMatch[1] : "";

        // Find product name - look for specific class or text content
        const nameEl = tile.querySelector('[class*="name"], [class*="title"], h3, h4');
        let name = "";

        if (nameEl) {
          name = nameEl.textContent?.trim() || "";
        }

        // If no name found, try to extract from link text
        if (!name) {
          // Get text from link, excluding nested elements like badges
          const clone = mainLink.cloneNode(true) as HTMLElement;
          // Remove badge elements
          clone.querySelectorAll('[class*="badge"], [class*="Badge"]').forEach(el => el.remove());
          name = clone.textContent?.trim() || "";
        }

        // Find price
        const priceEl = tile.querySelector('[class*="price"], [class*="Price"]');
        const price = priceEl?.textContent?.trim() || "";

        // Find image
        const img = tile.querySelector("img");
        let imageUrl = "";
        if (img) {
          imageUrl = img.src || img.dataset.src || img.getAttribute("data-lazy-src") || "";
          // Upgrade image quality if it's a J.Crew hosted image
          if (imageUrl.includes("jcrew.com") && imageUrl.includes("hei=")) {
            imageUrl = imageUrl.replace(/hei=\d+/, "hei=1000");
          }
        }

        if (name || sku) {
          items.push({ name, price, url: href, imageUrl, sku });
        }
      });

      return items;
    });

    console.log(`    Found ${productData.length} products on page`);

    // Process and filter products
    for (const item of productData.slice(0, maxProducts)) {
      const name = extractProductName(item.name);
      const price = parsePrice(item.price);

      // Skip if no valid name or price
      if (!name || price <= 0) continue;

      // Skip duplicates (same SKU)
      if (products.some(p => p.sourceUrl === item.url)) continue;

      products.push({
        name,
        description: `${name} from J.Crew`,
        brand: "J.Crew",
        price,
        category: category.category,
        gender: category.gender,
        condition: "new",
        sourceUrl: item.url,
        sourcePlatform: "J.Crew",
        imageUrl: item.imageUrl,
      });
    }
  } catch (error) {
    console.log(`    Error scraping ${category.url}:`, error);
  }

  return products;
}

export async function scrapeJCrew(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 100;
  const categories = config.categories
    ? JCREW_CATEGORIES.filter(c => config.categories?.includes(c.category))
    : JCREW_CATEGORIES;

  const products: ScrapedProduct[] = [];
  const errors: string[] = [];

  console.log("Starting J.Crew scraper...");
  console.log(`  Target: ${maxProducts} products from ${categories.length} categories`);

  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    for (const category of categories) {
      if (products.length >= maxProducts) break;

      // Create a fresh page for each category to avoid stale state
      const page = await browser.newPage();

      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      try {
        const remaining = maxProducts - products.length;
        const categoryProducts = await scrapeJCrewCategory(page, category, remaining);
        products.push(...categoryProducts);
        console.log(`  Total products so far: ${products.length}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${category.category}: ${errorMsg}`);
      } finally {
        await page.close();
      }

      // Rate limiting between categories
      await new Promise(r => setTimeout(r, 2000));
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push(`Browser error: ${errorMsg}`);
    console.error("J.Crew scraper error:", error);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`J.Crew: Found ${products.length} total products\n`);

  return {
    products,
    source: "J.Crew",
    scrapedAt: new Date(),
    errors: errors.length > 0 ? errors : undefined,
  };
}
