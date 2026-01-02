import type { ScrapedProduct, ScraperResult, ScraperConfig, ProductVariant } from "./types";

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms: number): Promise<void> {
  const jitter = Math.random() * 300;
  return new Promise(r => setTimeout(r, ms + jitter));
}

// ==================== DEPOP ====================
interface DepopProduct {
  id: string;
  slug: string;
  description: string;
  price: { amount: string; currency: string };
  pictures: Array<{ url: string }>;
  brand?: { name: string };
  size?: { name: string };
  condition?: string;
  categories?: Array<{ name: string }>;
  seller?: { username: string };
}

export async function scrapeDepop(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 100;
  const products: ScrapedProduct[] = [];
  const errors: string[] = [];

  console.log("\nScraping Depop...");

  // Depop has a GraphQL API - we'll search for popular categories
  const searchTerms = config.searchTerms || ["vintage", "designer", "streetwear", "y2k"];

  for (const term of searchTerms) {
    if (products.length >= maxProducts) break;

    try {
      // Depop API endpoint
      const response = await fetch(`https://webapi.depop.com/api/v2/search/products/?what=${encodeURIComponent(term)}&limit=24`, {
        headers: {
          "User-Agent": getRandomUserAgent(),
          "Accept": "application/json",
        },
      });

      if (response.status === 429) {
        console.log("  Depop rate limited, waiting...");
        await delay(5000);
        continue;
      }

      if (!response.ok) {
        errors.push(`Depop search "${term}": ${response.status}`);
        continue;
      }

      const data = await response.json();
      const items = data?.products || [];

      for (const item of items) {
        if (products.length >= maxProducts) break;

        const price = parseFloat(item.price?.amount || "0");
        if (price <= 0) continue;

        products.push({
          name: item.description?.slice(0, 100) || "Depop Item",
          description: item.description || "Item from Depop",
          brand: item.brand?.name || "Unknown",
          price,
          size: item.size?.name,
          category: inferCategoryFromDepop(item.categories),
          gender: inferGenderFromCategories(item.categories),
          condition: mapDepopCondition(item.condition),
          sourceUrl: `https://www.depop.com/products/${item.slug || item.id}`,
          sourcePlatform: "Depop",
          imageUrl: item.pictures?.[0]?.url,
          imageUrls: item.pictures?.map((p: { url: string }) => p.url),
        });
      }

      console.log(`  Depop "${term}": ${products.length} products total`);
      await delay(1500);
    } catch (error) {
      errors.push(`Error searching Depop for "${term}": ${error}`);
    }
  }

  return { products, source: "Depop", scrapedAt: new Date(), errors: errors.length > 0 ? errors : undefined };
}

// ==================== GRAILED ====================
interface GrailedListing {
  id: number;
  title: string;
  description: string;
  price: number;
  designer: { name: string };
  category: string;
  size: string;
  condition: string;
  photos: Array<{ url: string }>;
}

export async function scrapeGrailed(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 100;
  const products: ScrapedProduct[] = [];
  const errors: string[] = [];

  console.log("\nScraping Grailed...");

  // Grailed has an Algolia-based search API
  const categories = ["tops", "bottoms", "outerwear", "footwear", "accessories"];

  for (const category of categories) {
    if (products.length >= maxProducts) break;

    try {
      // Grailed's public listings endpoint
      const response = await fetch(`https://www.grailed.com/api/listings?category=${category}&page=1&per_page=30`, {
        headers: {
          "User-Agent": getRandomUserAgent(),
          "Accept": "application/json",
        },
      });

      if (response.status === 429) {
        console.log("  Grailed rate limited, waiting...");
        await delay(5000);
        continue;
      }

      if (!response.ok) {
        errors.push(`Grailed ${category}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const listings = data?.data || data?.listings || [];

      for (const item of listings) {
        if (products.length >= maxProducts) break;

        products.push({
          name: item.title || "Grailed Item",
          description: item.description || item.title || "Item from Grailed",
          brand: item.designer?.name || item.brand || "Designer",
          price: item.price || 0,
          size: item.size,
          category: mapGrailedCategory(category),
          gender: "men", // Grailed is primarily menswear
          condition: mapGrailedCondition(item.condition),
          sourceUrl: `https://www.grailed.com/listings/${item.id}`,
          sourcePlatform: "Grailed",
          imageUrl: item.photos?.[0]?.url || item.cover_photo?.url,
          imageUrls: item.photos?.map((p: { url: string }) => p.url),
        });
      }

      console.log(`  Grailed ${category}: ${products.length} products total`);
      await delay(1500);
    } catch (error) {
      errors.push(`Error scraping Grailed ${category}: ${error}`);
    }
  }

  return { products, source: "Grailed", scrapedAt: new Date(), errors: errors.length > 0 ? errors : undefined };
}

// ==================== STOCKX ====================
interface StockXProduct {
  id: string;
  name: string;
  brand: string;
  retailPrice: number;
  media: { thumbUrl: string; imageUrl: string };
  market: { lowestAsk: number };
  category: string;
}

export async function scrapeStockX(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 100;
  const products: ScrapedProduct[] = [];
  const errors: string[] = [];

  console.log("\nScraping StockX...");

  // StockX categories
  const categories = [
    { path: "sneakers", category: "shoes" },
    { path: "streetwear", category: "clothing" },
    { path: "accessories", category: "accessories" },
  ];

  for (const cat of categories) {
    if (products.length >= maxProducts) break;

    try {
      // StockX browse API
      const response = await fetch(`https://stockx.com/api/browse?_path=${cat.path}&page=1&resultsPerPage=40`, {
        headers: {
          "User-Agent": getRandomUserAgent(),
          "Accept": "application/json",
          "App-Platform": "Iron",
          "App-Version": "2022.12.19.04",
        },
      });

      if (response.status === 429 || response.status === 403) {
        console.log("  StockX rate limited or blocked");
        errors.push(`StockX ${cat.path}: ${response.status}`);
        continue;
      }

      if (!response.ok) {
        errors.push(`StockX ${cat.path}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const items = data?.Products || [];

      for (const item of items) {
        if (products.length >= maxProducts) break;

        const price = item.market?.lowestAsk || item.retailPrice || 0;
        if (price <= 0) continue;

        products.push({
          name: item.name || item.title || "StockX Item",
          description: `${item.name} - ${item.brand}`,
          brand: item.brand || "Unknown",
          price,
          originalPrice: item.retailPrice !== price ? item.retailPrice : undefined,
          category: cat.category,
          gender: "unisex",
          condition: "new",
          sourceUrl: `https://stockx.com/${item.urlKey || item.id}`,
          sourcePlatform: "StockX",
          imageUrl: item.media?.thumbUrl || item.media?.imageUrl,
        });
      }

      console.log(`  StockX ${cat.path}: ${products.length} products total`);
      await delay(2000);
    } catch (error) {
      errors.push(`Error scraping StockX ${cat.path}: ${error}`);
    }
  }

  return { products, source: "StockX", scrapedAt: new Date(), errors: errors.length > 0 ? errors : undefined };
}

// ==================== BACKCOUNTRY ====================
export async function scrapeBackcountry(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 100;
  const products: ScrapedProduct[] = [];
  const errors: string[] = [];

  console.log("\nScraping Backcountry...");

  // Backcountry API
  const categories = [
    { path: "mens-clothing", gender: "men" as const },
    { path: "womens-clothing", gender: "women" as const },
  ];

  for (const cat of categories) {
    if (products.length >= maxProducts) break;

    try {
      const response = await fetch(`https://www.backcountry.com/Store/catalog/productListingApi.jsp?categoryId=${cat.path}&page=1&pageSize=48`, {
        headers: { "User-Agent": getRandomUserAgent() },
      });

      if (!response.ok) {
        errors.push(`Backcountry ${cat.path}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const items = data?.products || [];

      for (const item of items) {
        if (products.length >= maxProducts) break;

        products.push({
          name: item.title || item.name || "Backcountry Item",
          description: item.description || item.title || "Outdoor gear from Backcountry",
          brand: item.brand?.name || item.brand || "Unknown",
          price: item.salePrice || item.price || 0,
          originalPrice: item.salePrice && item.price > item.salePrice ? item.price : undefined,
          category: inferCategoryFromName(item.title || ""),
          gender: cat.gender,
          condition: "new",
          sourceUrl: item.url ? `https://www.backcountry.com${item.url}` : `https://www.backcountry.com/${item.id}`,
          sourcePlatform: "Backcountry",
          imageUrl: item.image?.url || item.imageUrl,
        });
      }

      console.log(`  Backcountry ${cat.gender}: ${products.length} products total`);
      await delay(1500);
    } catch (error) {
      errors.push(`Error scraping Backcountry: ${error}`);
    }
  }

  return { products, source: "Backcountry", scrapedAt: new Date(), errors: errors.length > 0 ? errors : undefined };
}

// ==================== ZAPPOS ====================
export async function scrapeZappos(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 100;
  const products: ScrapedProduct[] = [];
  const errors: string[] = [];

  console.log("\nScraping Zappos...");

  // Zappos categories
  const categories = [
    { path: "/men-shoes/CK_XAcABAuICAgEY.zso", gender: "men" as const, category: "shoes" },
    { path: "/women-shoes/CKvXARDQ1wE.zso", gender: "women" as const, category: "shoes" },
  ];

  for (const cat of categories) {
    if (products.length >= maxProducts) break;

    try {
      const response = await fetch(`https://www.zappos.com${cat.path}?p=0&s=recentSalesStyle/desc/`, {
        headers: { "User-Agent": getRandomUserAgent() },
      });

      if (!response.ok) {
        errors.push(`Zappos ${cat.path}: ${response.status}`);
        continue;
      }

      const html = await response.text();

      // Parse product data from Zappos HTML
      const productRegex = /data-product-id="(\d+)"[^>]*data-product-name="([^"]+)"[^>]*data-product-price="([^"]+)"/g;
      let match;

      while ((match = productRegex.exec(html)) !== null && products.length < maxProducts) {
        const [, id, name, price] = match;
        const imgMatch = html.match(new RegExp(`${id}[^>]*src="(https://[^"]+\\.jpg)`));
        const brandMatch = name.match(/^([^-]+)\s+-/);

        products.push({
          name: name.replace(/^[^-]+-\s*/, ""),
          description: name,
          brand: brandMatch?.[1]?.trim() || "Unknown",
          price: parseFloat(price) || 0,
          category: cat.category,
          gender: cat.gender,
          condition: "new",
          sourceUrl: `https://www.zappos.com/p/${id}`,
          sourcePlatform: "Zappos",
          imageUrl: imgMatch?.[1],
        });
      }

      console.log(`  Zappos ${cat.gender} ${cat.category}: ${products.length} products total`);
      await delay(1500);
    } catch (error) {
      errors.push(`Error scraping Zappos: ${error}`);
    }
  }

  return { products, source: "Zappos", scrapedAt: new Date(), errors: errors.length > 0 ? errors : undefined };
}

// ==================== HELPER FUNCTIONS ====================
function inferCategoryFromDepop(categories: Array<{ name: string }> | undefined): string {
  if (!categories || categories.length === 0) return "clothing";
  const names = categories.map(c => c.name.toLowerCase());

  if (names.some(n => n.includes("shoe") || n.includes("sneaker") || n.includes("boot"))) return "shoes";
  if (names.some(n => n.includes("jean") || n.includes("pant") || n.includes("trouser"))) return "pants";
  if (names.some(n => n.includes("shirt") || n.includes("top") || n.includes("tee"))) return "tops";
  if (names.some(n => n.includes("dress"))) return "dresses";
  if (names.some(n => n.includes("jacket") || n.includes("coat"))) return "outerwear";
  if (names.some(n => n.includes("bag"))) return "bags";
  return "clothing";
}

function inferGenderFromCategories(categories: Array<{ name: string }> | undefined): "men" | "women" | "unisex" {
  if (!categories) return "unisex";
  const names = categories.map(c => c.name.toLowerCase());

  if (names.some(n => n.includes("women") || n.includes("female"))) return "women";
  if (names.some(n => n.includes("men") || n.includes("male"))) return "men";
  return "unisex";
}

function mapDepopCondition(condition: string | undefined): "new" | "used" | "like_new" {
  if (!condition) return "used";
  const lower = condition.toLowerCase();
  if (lower.includes("new") && lower.includes("tag")) return "new";
  if (lower.includes("new") || lower.includes("excellent")) return "like_new";
  return "used";
}

function mapGrailedCategory(category: string): string {
  switch (category.toLowerCase()) {
    case "tops": return "tops";
    case "bottoms": return "pants";
    case "outerwear": return "outerwear";
    case "footwear": return "shoes";
    case "accessories": return "accessories";
    default: return "clothing";
  }
}

function mapGrailedCondition(condition: string | undefined): "new" | "used" | "like_new" {
  if (!condition) return "used";
  const lower = condition.toLowerCase();
  if (lower.includes("new") || lower === "10") return "new";
  if (lower === "9" || lower === "9.5" || lower.includes("excellent")) return "like_new";
  return "used";
}

function inferCategoryFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("jacket") || lower.includes("coat") || lower.includes("parka")) return "outerwear";
  if (lower.includes("pant") || lower.includes("jean")) return "pants";
  if (lower.includes("short")) return "shorts";
  if (lower.includes("shirt") || lower.includes("tee") || lower.includes("top")) return "tops";
  if (lower.includes("shoe") || lower.includes("boot") || lower.includes("sneaker")) return "shoes";
  if (lower.includes("fleece") || lower.includes("sweater") || lower.includes("hoodie")) return "sweaters";
  return "clothing";
}

// Scrape all marketplaces
export async function scrapeAllMarketplaces(config: ScraperConfig = {}): Promise<ScraperResult> {
  const allProducts: ScrapedProduct[] = [];
  const allErrors: string[] = [];
  const maxPerSource = Math.floor((config.maxProducts || 300) / 3);

  const scrapers = [
    scrapeDepop,
    scrapeGrailed,
    // scrapeStockX, // Often blocks scrapers
  ];

  for (const scraper of scrapers) {
    try {
      const result = await scraper({ maxProducts: maxPerSource });
      allProducts.push(...result.products);
      if (result.errors) allErrors.push(...result.errors);
      await delay(3000);
    } catch (error) {
      allErrors.push(`Marketplace scraper error: ${error}`);
    }
  }

  return {
    products: allProducts,
    source: "Marketplaces",
    scrapedAt: new Date(),
    errors: allErrors.length > 0 ? allErrors : undefined,
  };
}
