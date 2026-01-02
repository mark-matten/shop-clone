import type { ScrapedProduct, ScraperResult, ScraperConfig, ProductVariant } from "./types";

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms: number): Promise<void> {
  const jitter = Math.random() * 300;
  return new Promise(r => setTimeout(r, ms + jitter));
}

// ==================== UNIQLO ====================
interface UniqloProduct {
  productId: string;
  name: string;
  prices: { base: { value: number }; promo?: { value: number } };
  images: { main: { image: string }[] };
  colors: Array<{ name: string; code: string }>;
  sizes: Array<{ name: string; available: boolean }>;
  genderName: string;
  categoryName: string;
}

export async function scrapeUniqlo(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 200;
  const products: ScrapedProduct[] = [];
  const errors: string[] = [];

  console.log("\nScraping Uniqlo...");

  // Uniqlo uses a public API
  const categories = [
    { path: "/api/commerce/v5/en/products?categoryId=25733&limit=100", gender: "men" as const },
    { path: "/api/commerce/v5/en/products?categoryId=25737&limit=100", gender: "women" as const },
  ];

  for (const cat of categories) {
    if (products.length >= maxProducts) break;

    try {
      const response = await fetch(`https://www.uniqlo.com${cat.path}`, {
        headers: {
          "User-Agent": getRandomUserAgent(),
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        errors.push(`Failed to fetch Uniqlo ${cat.gender}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const items = data?.result?.items || [];

      for (const item of items) {
        if (products.length >= maxProducts) break;

        const price = item.prices?.base?.value || 0;
        const originalPrice = item.prices?.promo?.value ? item.prices.base.value : undefined;
        const salePrice = item.prices?.promo?.value || price;

        const variants: ProductVariant[] = (item.sizes || []).map((s: { name: string; available: boolean }, i: number) => ({
          id: `${item.productId}-${i}`,
          title: s.name,
          available: s.available !== false,
        }));

        products.push({
          name: item.name || "Uniqlo Product",
          description: item.name || "Quality basics from Uniqlo",
          brand: "Uniqlo",
          price: salePrice,
          originalPrice,
          variants,
          colorName: item.colors?.[0]?.name,
          category: inferCategory(item.categoryName || item.name),
          gender: cat.gender,
          condition: "new",
          sourceUrl: `https://www.uniqlo.com/us/en/products/${item.productId}`,
          sourcePlatform: "Uniqlo",
          imageUrl: item.images?.main?.[0]?.image,
        });
      }

      console.log(`  Uniqlo ${cat.gender}: ${products.length} products`);
      await delay(1000);
    } catch (error) {
      errors.push(`Error scraping Uniqlo: ${error}`);
    }
  }

  return { products, source: "Uniqlo", scrapedAt: new Date(), errors: errors.length > 0 ? errors : undefined };
}

// ==================== PATAGONIA ====================
export async function scrapePatagonia(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 200;
  const products: ScrapedProduct[] = [];
  const errors: string[] = [];

  console.log("\nScraping Patagonia...");

  // Patagonia uses Salesforce Commerce Cloud API
  const categories = ["mens", "womens"];

  for (const cat of categories) {
    if (products.length >= maxProducts) break;

    try {
      const url = `https://www.patagonia.com/on/demandware.store/Sites-patagonia-us-Site/en_US/Search-UpdateGrid?cgid=${cat}&start=0&sz=60`;
      const response = await fetch(url, {
        headers: { "User-Agent": getRandomUserAgent() },
      });

      if (!response.ok) {
        // Try alternative approach - fetch sitemap
        errors.push(`Patagonia ${cat}: ${response.status}`);
        continue;
      }

      // Parse HTML response for products
      const html = await response.text();
      const productMatches = html.matchAll(/data-pid="([^"]+)"/g);

      for (const match of productMatches) {
        if (products.length >= maxProducts) break;
        const pid = match[1];

        // Fetch individual product
        try {
          const prodResponse = await fetch(`https://www.patagonia.com/product/${pid}.html`, {
            headers: { "User-Agent": getRandomUserAgent() },
          });

          if (prodResponse.ok) {
            const prodHtml = await prodResponse.text();
            const nameMatch = prodHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
            const priceMatch = prodHtml.match(/\$(\d+(?:\.\d{2})?)/);
            const imgMatch = prodHtml.match(/src="(https:\/\/[^"]+\.jpg)/);

            if (nameMatch && priceMatch) {
              products.push({
                name: nameMatch[1].trim(),
                description: `${nameMatch[1].trim()} from Patagonia`,
                brand: "Patagonia",
                price: parseFloat(priceMatch[1]),
                category: inferCategory(nameMatch[1]),
                gender: cat === "mens" ? "men" : "women",
                condition: "new",
                sourceUrl: `https://www.patagonia.com/product/${pid}.html`,
                sourcePlatform: "Patagonia",
                imageUrl: imgMatch?.[1],
              });
            }
          }
          await delay(300);
        } catch {
          // Skip individual product errors
        }
      }

      console.log(`  Patagonia ${cat}: ${products.length} products`);
      await delay(1000);
    } catch (error) {
      errors.push(`Error scraping Patagonia: ${error}`);
    }
  }

  return { products, source: "Patagonia", scrapedAt: new Date(), errors: errors.length > 0 ? errors : undefined };
}

// ==================== CARHARTT ====================
export async function scrapeCarhartt(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 200;
  const products: ScrapedProduct[] = [];
  const errors: string[] = [];

  console.log("\nScraping Carhartt...");

  // Carhartt WIP uses Shopify
  try {
    const response = await fetch("https://us.carhartt-wip.com/products.json?limit=250", {
      headers: { "User-Agent": getRandomUserAgent(), "Accept": "application/json" },
    });

    if (response.ok) {
      const data = await response.json();

      for (const p of data.products || []) {
        if (products.length >= maxProducts) break;

        const prices = p.variants.map((v: { price: string }) => parseFloat(v.price)).filter((n: number) => n > 0);
        const price = prices.length > 0 ? Math.min(...prices) : 0;

        const variants: ProductVariant[] = p.variants.map((v: { id: number; title: string; available: boolean }) => ({
          id: v.id.toString(),
          title: v.title,
          available: v.available,
        }));

        products.push({
          name: p.title,
          description: (p.body_html || "").replace(/<[^>]*>/g, " ").slice(0, 300) || p.title,
          brand: "Carhartt WIP",
          price,
          variants,
          category: inferCategory(p.product_type || p.title),
          gender: inferGender(p.tags || []),
          condition: "new",
          sourceUrl: `https://us.carhartt-wip.com/products/${p.handle}`,
          sourcePlatform: "Carhartt WIP",
          imageUrl: p.images?.[0]?.src,
          imageUrls: p.images?.map((i: { src: string }) => i.src),
        });
      }
    } else {
      errors.push(`Carhartt: ${response.status}`);
    }
  } catch (error) {
    errors.push(`Error scraping Carhartt: ${error}`);
  }

  console.log(`  Carhartt: ${products.length} products`);
  return { products, source: "Carhartt WIP", scrapedAt: new Date(), errors: errors.length > 0 ? errors : undefined };
}

// ==================== LEVI'S ====================
export async function scrapeLevis(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 200;
  const products: ScrapedProduct[] = [];
  const errors: string[] = [];

  console.log("\nScraping Levi's...");

  // Levi's has a product API
  const categories = [
    { id: "men-jeans", gender: "men" as const },
    { id: "women-jeans", gender: "women" as const },
  ];

  for (const cat of categories) {
    if (products.length >= maxProducts) break;

    try {
      const url = `https://www.levi.com/US/en_US/c/${cat.id}?format=ajax&start=0&sz=60`;
      const response = await fetch(url, {
        headers: { "User-Agent": getRandomUserAgent() },
      });

      if (!response.ok) {
        errors.push(`Levi's ${cat.id}: ${response.status}`);
        continue;
      }

      const html = await response.text();

      // Parse product tiles from HTML
      const productRegex = /data-product-id="([^"]+)"[^>]*data-product-name="([^"]+)"[^>]*data-product-price="([^"]+)"/g;
      let match;

      while ((match = productRegex.exec(html)) !== null && products.length < maxProducts) {
        const [, id, name, price] = match;
        const imgMatch = html.match(new RegExp(`${id}[^>]*src="([^"]+\\.jpg)`));

        products.push({
          name: decodeHTMLEntities(name),
          description: `${decodeHTMLEntities(name)} from Levi's`,
          brand: "Levi's",
          price: parseFloat(price) || 0,
          category: "jeans",
          gender: cat.gender,
          condition: "new",
          sourceUrl: `https://www.levi.com/US/en_US/p/${id}`,
          sourcePlatform: "Levi's",
          imageUrl: imgMatch?.[1],
        });
      }

      console.log(`  Levi's ${cat.id}: ${products.length} products`);
      await delay(1000);
    } catch (error) {
      errors.push(`Error scraping Levi's: ${error}`);
    }
  }

  return { products, source: "Levi's", scrapedAt: new Date(), errors: errors.length > 0 ? errors : undefined };
}

// ==================== L.L. BEAN ====================
export async function scrapeLLBean(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 200;
  const products: ScrapedProduct[] = [];
  const errors: string[] = [];

  console.log("\nScraping L.L.Bean...");

  // L.L.Bean uses ATG Commerce
  const categories = [
    { path: "/llb/shop/mens-clothing", gender: "men" as const },
    { path: "/llb/shop/womens-clothing", gender: "women" as const },
  ];

  for (const cat of categories) {
    if (products.length >= maxProducts) break;

    try {
      const response = await fetch(`https://www.llbean.com${cat.path}?page=1&pageSize=48`, {
        headers: { "User-Agent": getRandomUserAgent() },
      });

      if (!response.ok) {
        errors.push(`L.L.Bean ${cat.path}: ${response.status}`);
        continue;
      }

      // Parse products from HTML
      const html = await response.text();
      const productMatches = html.matchAll(/data-product-id="(\d+)"[^>]*data-product-name="([^"]+)"[^>]*data-product-price="(\d+\.?\d*)"/g);

      for (const match of productMatches) {
        if (products.length >= maxProducts) break;
        const [, id, name, price] = match;

        products.push({
          name: decodeHTMLEntities(name),
          description: `${decodeHTMLEntities(name)} from L.L.Bean`,
          brand: "L.L.Bean",
          price: parseFloat(price) || 0,
          category: inferCategory(name),
          gender: cat.gender,
          condition: "new",
          sourceUrl: `https://www.llbean.com/llb/shop/${id}`,
          sourcePlatform: "L.L.Bean",
        });
      }

      console.log(`  L.L.Bean ${cat.gender}: ${products.length} products`);
      await delay(1000);
    } catch (error) {
      errors.push(`Error scraping L.L.Bean: ${error}`);
    }
  }

  return { products, source: "L.L.Bean", scrapedAt: new Date(), errors: errors.length > 0 ? errors : undefined };
}

// ==================== DICKIES ====================
export async function scrapeDickies(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 200;
  const products: ScrapedProduct[] = [];
  const errors: string[] = [];

  console.log("\nScraping Dickies...");

  // Dickies uses Salesforce Commerce
  try {
    const response = await fetch("https://www.dickies.com/on/demandware.store/Sites-dickies-us-Site/en_US/Search-UpdateGrid?cgid=men&start=0&sz=60", {
      headers: { "User-Agent": getRandomUserAgent() },
    });

    if (!response.ok) {
      errors.push(`Dickies: ${response.status}`);
    } else {
      const html = await response.text();
      // Parse product data from HTML response
      const productRegex = /data-pid="([^"]+)"[^>]*>\s*<[^>]*class="[^"]*product-name[^"]*"[^>]*>([^<]+)/g;
      let match;

      while ((match = productRegex.exec(html)) !== null && products.length < maxProducts) {
        const [, id, name] = match;
        const priceMatch = html.match(new RegExp(`${id}[\\s\\S]*?\\$([\\d.]+)`));

        products.push({
          name: name.trim(),
          description: `${name.trim()} from Dickies`,
          brand: "Dickies",
          price: priceMatch ? parseFloat(priceMatch[1]) : 0,
          category: inferCategory(name),
          gender: "unisex",
          condition: "new",
          sourceUrl: `https://www.dickies.com/product/${id}`,
          sourcePlatform: "Dickies",
        });
      }
    }
  } catch (error) {
    errors.push(`Error scraping Dickies: ${error}`);
  }

  console.log(`  Dickies: ${products.length} products`);
  return { products, source: "Dickies", scrapedAt: new Date(), errors: errors.length > 0 ? errors : undefined };
}

// ==================== HELPER FUNCTIONS ====================
function inferCategory(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('jean') || lower.includes('denim')) return 'jeans';
  if (lower.includes('pant') || lower.includes('chino') || lower.includes('trouser')) return 'pants';
  if (lower.includes('short')) return 'shorts';
  if (lower.includes('shirt') || lower.includes('tee') || lower.includes('top') || lower.includes('blouse')) return 'tops';
  if (lower.includes('sweater') || lower.includes('hoodie') || lower.includes('fleece') || lower.includes('pullover')) return 'sweaters';
  if (lower.includes('jacket') || lower.includes('coat') || lower.includes('vest') || lower.includes('parka')) return 'outerwear';
  if (lower.includes('dress')) return 'dresses';
  if (lower.includes('skirt')) return 'skirts';
  if (lower.includes('shoe') || lower.includes('boot') || lower.includes('sneaker')) return 'shoes';
  if (lower.includes('bag') || lower.includes('backpack') || lower.includes('tote')) return 'bags';
  if (lower.includes('hat') || lower.includes('cap') || lower.includes('beanie')) return 'accessories';
  if (lower.includes('sock')) return 'socks';
  return 'clothing';
}

function inferGender(tags: string[]): "men" | "women" | "unisex" {
  const lower = tags.map(t => t.toLowerCase());
  if (lower.some(t => t.includes('women') || t.includes('female'))) return 'women';
  if (lower.some(t => t.includes('men') || t.includes('male'))) return 'men';
  return 'unisex';
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

// Scrape all major retailers
export async function scrapeAllMajorRetailers(config: ScraperConfig = {}): Promise<ScraperResult> {
  const allProducts: ScrapedProduct[] = [];
  const allErrors: string[] = [];
  const maxPerBrand = Math.floor((config.maxProducts || 500) / 5);

  const scrapers = [
    scrapeCarhartt,
    scrapeLevis,
    scrapeDickies,
  ];

  for (const scraper of scrapers) {
    try {
      const result = await scraper({ maxProducts: maxPerBrand });
      allProducts.push(...result.products);
      if (result.errors) allErrors.push(...result.errors);
      await delay(2000);
    } catch (error) {
      allErrors.push(`Scraper error: ${error}`);
    }
  }

  return {
    products: allProducts,
    source: "Major Retailers",
    scrapedAt: new Date(),
    errors: allErrors.length > 0 ? allErrors : undefined,
  };
}
