import type { ScrapedProduct, ScraperResult, ScraperConfig, ProductVariant, ProductOption } from "./types";

// Rotating User-Agent strings
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms: number): Promise<void> {
  const jitter = Math.random() * 200;
  return new Promise(r => setTimeout(r, ms + jitter));
}

// Brand configurations for Shopify-based stores
interface BrandConfig {
  name: string;
  domain: string;
  gender?: "men" | "women" | "unisex";
  defaultCategory?: string;
}

export const SHOPIFY_BRANDS: BrandConfig[] = [
  // Athletic & Activewear
  { name: "Gymshark", domain: "gymshark.com", gender: "unisex", defaultCategory: "activewear" },
  { name: "Alo Yoga", domain: "aloyoga.com", gender: "unisex", defaultCategory: "activewear" },
  { name: "Outdoor Voices", domain: "outdoorvoices.com", gender: "unisex", defaultCategory: "activewear" },
  { name: "Figs", domain: "wearfigs.com", gender: "unisex", defaultCategory: "scrubs" },

  // Footwear
  { name: "Allbirds", domain: "allbirds.com", gender: "unisex", defaultCategory: "shoes" },
  { name: "Rothy's", domain: "rothys.com", gender: "women", defaultCategory: "shoes" },

  // Basics & Underwear
  { name: "Bombas", domain: "bombas.com", gender: "unisex", defaultCategory: "socks" },
  { name: "MeUndies", domain: "meundies.com", gender: "unisex", defaultCategory: "underwear" },
  { name: "Knix", domain: "knix.com", gender: "women", defaultCategory: "underwear" },
  { name: "Negative Underwear", domain: "negativeunderwear.com", gender: "women", defaultCategory: "underwear" },

  // Fashion & Apparel
  { name: "Fashion Nova", domain: "fashionnova.com", gender: "women", defaultCategory: "clothing" },
  { name: "Good American", domain: "goodamerican.com", gender: "women", defaultCategory: "jeans" },
  { name: "Chubbies", domain: "chubbiesshorts.com", gender: "men", defaultCategory: "shorts" },

  // Accessories
  { name: "Rebecca Minkoff", domain: "rebeccaminkoff.com", gender: "women", defaultCategory: "bags" },
  { name: "Clare V.", domain: "clarev.com", gender: "women", defaultCategory: "bags" },
  { name: "Pura Vida", domain: "puravidabracelets.com", gender: "unisex", defaultCategory: "jewelry" },

  // Sustainable / Premium Basics
  { name: "Quince", domain: "onquince.com", gender: "unisex", defaultCategory: "clothing" },
  { name: "Buck Mason", domain: "buckmason.com", gender: "men", defaultCategory: "clothing" },
  { name: "Taylor Stitch", domain: "taylorstitch.com", gender: "men", defaultCategory: "clothing" },
  { name: "Cuyana", domain: "cuyana.com", gender: "women", defaultCategory: "clothing" },
  { name: "Tentree", domain: "tentree.com", gender: "unisex", defaultCategory: "clothing" },
  { name: "Italic", domain: "italic.com", gender: "unisex", defaultCategory: "clothing" },
];

// Color name to hex mapping
const COLOR_HEX_MAP: Record<string, string> = {
  'black': '#000000', 'white': '#ffffff', 'grey': '#808080', 'gray': '#808080',
  'navy': '#1a237e', 'blue': '#0066cc', 'red': '#cc0000', 'green': '#228b22',
  'brown': '#8b4513', 'tan': '#d2b48c', 'beige': '#f5f5dc', 'cream': '#fffdd0',
  'pink': '#ffc0cb', 'purple': '#800080', 'orange': '#ff8c00', 'yellow': '#ffd700',
  'olive': '#808000', 'burgundy': '#800020', 'charcoal': '#36454f', 'khaki': '#c3b091',
  'coral': '#ff7f50', 'teal': '#008080', 'maroon': '#800000', 'mint': '#98ff98',
};

function getColorHex(colorName: string): string | undefined {
  const normalized = colorName.toLowerCase().trim();
  for (const [key, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (normalized.includes(key)) return hex;
  }
  return undefined;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string[];
  variants: Array<{
    id: number;
    title: string;
    price: string;
    compare_at_price: string | null;
    available: boolean;
    option1: string | null;
    option2: string | null;
    option3: string | null;
  }>;
  options: Array<{
    name: string;
    values: string[];
  }>;
  images: Array<{
    src: string;
  }>;
}

interface ShopifyResponse {
  products: ShopifyProduct[];
}

async function fetchShopifyProducts(domain: string, page: number = 1, limit: number = 250): Promise<ShopifyProduct[]> {
  try {
    const url = `https://www.${domain}/products.json?limit=${limit}&page=${page}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Accept": "application/json",
      },
    });

    if (response.status === 429) {
      // Rate limited - wait and return empty
      await delay(5000);
      return [];
    }

    if (!response.ok) {
      return [];
    }

    const data: ShopifyResponse = await response.json();
    return data.products || [];
  } catch (error) {
    return [];
  }
}

function shopifyToScrapedProduct(
  product: ShopifyProduct,
  brand: BrandConfig
): ScrapedProduct {
  // Get price info
  const prices = product.variants
    .map(v => parseFloat(v.price))
    .filter(p => !isNaN(p) && p > 0);
  const price = prices.length > 0 ? Math.min(...prices) : 0;

  // Get original price if on sale
  const comparePrices = product.variants
    .map(v => v.compare_at_price ? parseFloat(v.compare_at_price) : 0)
    .filter(p => p > price);
  const originalPrice = comparePrices.length > 0 ? Math.max(...comparePrices) : undefined;

  // Build variants
  const variants: ProductVariant[] = product.variants.map(v => ({
    id: v.id.toString(),
    title: v.title,
    available: v.available,
    price: parseFloat(v.price),
    option1: v.option1 || undefined,
    option2: v.option2 || undefined,
    option3: v.option3 || undefined,
  }));

  // Build options
  const options: ProductOption[] = product.options
    .filter(o => o.name !== 'Title')
    .map(o => ({
      name: o.name,
      values: o.values,
    }));

  // Extract color from first variant or title
  let colorName: string | undefined;
  const colorOption = product.options.find(o =>
    o.name.toLowerCase() === 'color' || o.name.toLowerCase() === 'colour'
  );
  if (colorOption && colorOption.values.length > 0) {
    colorName = colorOption.values[0];
  }

  // Get images
  const imageUrls = product.images.map(img => {
    let src = img.src;
    if (src.startsWith('//')) src = 'https:' + src;
    return src;
  });

  // Infer category from product type or tags
  let category = brand.defaultCategory || "clothing";
  const productType = product.product_type?.toLowerCase() || '';
  const tags = product.tags?.map(t => t.toLowerCase()) || [];

  if (productType.includes('shoe') || productType.includes('sneaker') || productType.includes('boot')) category = 'shoes';
  else if (productType.includes('pant') || productType.includes('jean')) category = 'pants';
  else if (productType.includes('shirt') || productType.includes('tee') || productType.includes('top')) category = 'tops';
  else if (productType.includes('dress')) category = 'dresses';
  else if (productType.includes('jacket') || productType.includes('coat')) category = 'outerwear';
  else if (productType.includes('short')) category = 'shorts';
  else if (productType.includes('sock')) category = 'socks';
  else if (productType.includes('underwear') || productType.includes('brief') || productType.includes('boxer')) category = 'underwear';
  else if (productType.includes('bag') || productType.includes('tote') || productType.includes('purse')) category = 'bags';

  // Infer gender from tags or product type
  let gender = brand.gender;
  if (tags.includes('mens') || tags.includes("men's") || productType.includes('men')) gender = 'men';
  else if (tags.includes('womens') || tags.includes("women's") || productType.includes('women')) gender = 'women';

  // Clean description
  const description = (product.body_html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500) || `${product.title} from ${brand.name}`;

  return {
    name: product.title,
    description,
    brand: brand.name,
    price,
    originalPrice,
    variants,
    options: options.length > 0 ? options : undefined,
    colorName,
    colorHex: colorName ? getColorHex(colorName) : undefined,
    category,
    gender,
    condition: "new",
    sourceUrl: `https://www.${brand.domain}/products/${product.handle}`,
    sourcePlatform: brand.name,
    imageUrl: imageUrls[0],
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
  };
}

export async function scrapeShopifyBrand(
  brand: BrandConfig,
  config: ScraperConfig = {}
): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 500;
  const products: ScrapedProduct[] = [];
  const errors: string[] = [];

  console.log(`\nScraping ${brand.name} (${brand.domain})...`);

  let page = 1;
  let hasMore = true;

  while (hasMore && products.length < maxProducts) {
    const shopifyProducts = await fetchShopifyProducts(brand.domain, page, 250);

    if (shopifyProducts.length === 0) {
      hasMore = false;
      if (page === 1) {
        errors.push(`Failed to fetch products from ${brand.domain}`);
      }
      break;
    }

    for (const sp of shopifyProducts) {
      if (products.length >= maxProducts) break;

      const product = shopifyToScrapedProduct(sp, brand);
      if (product.price > 0) {
        products.push(product);
      }
    }

    console.log(`  Page ${page}: ${products.length} products collected`);

    if (shopifyProducts.length < 250) {
      hasMore = false;
    } else {
      page++;
      await delay(500); // Rate limiting
    }
  }

  console.log(`  ${brand.name}: ${products.length} products total`);

  return {
    products,
    source: brand.name,
    scrapedAt: new Date(),
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Scrape all Shopify brands
export async function scrapeAllShopifyBrands(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxPerBrand = Math.floor((config.maxProducts || 1000) / SHOPIFY_BRANDS.length);
  const allProducts: ScrapedProduct[] = [];
  const allErrors: string[] = [];

  console.log(`\nScraping ${SHOPIFY_BRANDS.length} Shopify-based brands...`);

  for (const brand of SHOPIFY_BRANDS) {
    try {
      const result = await scrapeShopifyBrand(brand, { maxProducts: maxPerBrand });
      allProducts.push(...result.products);
      if (result.errors) allErrors.push(...result.errors);

      await delay(2000); // Delay between brands
    } catch (error) {
      allErrors.push(`Failed to scrape ${brand.name}: ${error}`);
    }
  }

  console.log(`\nTotal from Shopify brands: ${allProducts.length} products`);

  return {
    products: allProducts,
    source: "Shopify Brands",
    scrapedAt: new Date(),
    errors: allErrors.length > 0 ? allErrors : undefined,
  };
}

// Export individual brand scrapers
export async function scrapeGymshark(config: ScraperConfig = {}): Promise<ScraperResult> {
  return scrapeShopifyBrand(SHOPIFY_BRANDS.find(b => b.name === "Gymshark")!, config);
}

export async function scrapeAllbirds(config: ScraperConfig = {}): Promise<ScraperResult> {
  return scrapeShopifyBrand(SHOPIFY_BRANDS.find(b => b.name === "Allbirds")!, config);
}

export async function scrapeAloYoga(config: ScraperConfig = {}): Promise<ScraperResult> {
  return scrapeShopifyBrand(SHOPIFY_BRANDS.find(b => b.name === "Alo Yoga")!, config);
}

export async function scrapeOutdoorVoices(config: ScraperConfig = {}): Promise<ScraperResult> {
  return scrapeShopifyBrand(SHOPIFY_BRANDS.find(b => b.name === "Outdoor Voices")!, config);
}

export async function scrapeBombas(config: ScraperConfig = {}): Promise<ScraperResult> {
  return scrapeShopifyBrand(SHOPIFY_BRANDS.find(b => b.name === "Bombas")!, config);
}

export async function scrapeQuince(config: ScraperConfig = {}): Promise<ScraperResult> {
  return scrapeShopifyBrand(SHOPIFY_BRANDS.find(b => b.name === "Quince")!, config);
}

export async function scrapeBuckMason(config: ScraperConfig = {}): Promise<ScraperResult> {
  return scrapeShopifyBrand(SHOPIFY_BRANDS.find(b => b.name === "Buck Mason")!, config);
}

export async function scrapeTaylorStitch(config: ScraperConfig = {}): Promise<ScraperResult> {
  return scrapeShopifyBrand(SHOPIFY_BRANDS.find(b => b.name === "Taylor Stitch")!, config);
}

export async function scrapeGoodAmerican(config: ScraperConfig = {}): Promise<ScraperResult> {
  return scrapeShopifyBrand(SHOPIFY_BRANDS.find(b => b.name === "Good American")!, config);
}

export async function scrapeFigs(config: ScraperConfig = {}): Promise<ScraperResult> {
  return scrapeShopifyBrand(SHOPIFY_BRANDS.find(b => b.name === "Figs")!, config);
}

export async function scrapeRebeccaMinkoff(config: ScraperConfig = {}): Promise<ScraperResult> {
  return scrapeShopifyBrand(SHOPIFY_BRANDS.find(b => b.name === "Rebecca Minkoff")!, config);
}

export async function scrapeClareV(config: ScraperConfig = {}): Promise<ScraperResult> {
  return scrapeShopifyBrand(SHOPIFY_BRANDS.find(b => b.name === "Clare V.")!, config);
}

export async function scrapePuraVida(config: ScraperConfig = {}): Promise<ScraperResult> {
  return scrapeShopifyBrand(SHOPIFY_BRANDS.find(b => b.name === "Pura Vida")!, config);
}
