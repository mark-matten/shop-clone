import * as cheerio from "cheerio";
import type { ScrapedProduct, ScraperResult, ScraperConfig, ProductVariant, ProductOption } from "./types";

interface EverlaneCategory {
  url: string;
  category: string;
  gender: "men" | "women" | "unisex";
}

const EVERLANE_CATEGORIES: EverlaneCategory[] = [
  // Women's categories
  { url: "/collections/womens-sweaters", category: "sweaters", gender: "women" },
  { url: "/collections/womens-tees", category: "tops", gender: "women" },
  { url: "/collections/womens-shirts", category: "tops", gender: "women" },
  { url: "/collections/womens-tops", category: "tops", gender: "women" },
  { url: "/collections/womens-bodysuits", category: "tops", gender: "women" },
  { url: "/collections/womens-dresses", category: "dresses", gender: "women" },
  { url: "/collections/womens-skirts", category: "skirts", gender: "women" },
  { url: "/collections/womens-pants", category: "pants", gender: "women" },
  { url: "/collections/womens-jeans", category: "jeans", gender: "women" },
  { url: "/collections/womens-shorts", category: "shorts", gender: "women" },
  { url: "/collections/womens-outerwear", category: "outerwear", gender: "women" },
  { url: "/collections/womens-shoes", category: "shoes", gender: "women" },
  { url: "/collections/womens-boots", category: "shoes", gender: "women" },
  { url: "/collections/womens-bags", category: "bags", gender: "women" },
  { url: "/collections/womens-accessories", category: "accessories", gender: "women" },
  { url: "/collections/womens-intimates", category: "intimates", gender: "women" },
  { url: "/collections/womens-active", category: "activewear", gender: "women" },
  { url: "/collections/womens-lounge", category: "loungewear", gender: "women" },
  { url: "/collections/womens-linen", category: "clothing", gender: "women" },
  // Men's categories
  { url: "/collections/mens-sweaters", category: "sweaters", gender: "men" },
  { url: "/collections/mens-tees", category: "tops", gender: "men" },
  { url: "/collections/mens-shirts", category: "tops", gender: "men" },
  { url: "/collections/mens-polos", category: "tops", gender: "men" },
  { url: "/collections/mens-pants", category: "pants", gender: "men" },
  { url: "/collections/mens-chinos", category: "pants", gender: "men" },
  { url: "/collections/mens-jeans", category: "jeans", gender: "men" },
  { url: "/collections/mens-shorts", category: "shorts", gender: "men" },
  { url: "/collections/mens-outerwear", category: "outerwear", gender: "men" },
  { url: "/collections/mens-shoes", category: "shoes", gender: "men" },
  { url: "/collections/mens-boots", category: "shoes", gender: "men" },
  { url: "/collections/mens-bags", category: "bags", gender: "men" },
  { url: "/collections/mens-accessories", category: "accessories", gender: "men" },
  { url: "/collections/mens-sweatpants", category: "pants", gender: "men" },
  { url: "/collections/mens-linen", category: "clothing", gender: "men" },
  // Unisex/general
  { url: "/collections/gift-cards", category: "gift cards", gender: "unisex" },
];

// Rotating User-Agent strings to avoid detection
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Delay with random jitter to appear more human-like
function delay(ms: number = 500): Promise<void> {
  const jitter = Math.random() * 200 - 100; // +/- 100ms jitter
  return new Promise(r => setTimeout(r, Math.max(100, ms + jitter)));
}

// Longer delay with more jitter for rate limit recovery
function longDelay(ms: number = 2000): Promise<void> {
  const jitter = Math.random() * 500; // 0-500ms additional
  return new Promise(r => setTimeout(r, ms + jitter));
}

interface EverlaneProductJson {
  product: {
    id: number;
    title: string;
    handle: string;
    description: string;
    vendor: string;
    type: string;
    tags: string[] | string; // Can be array or comma-separated string
    options: Array<{
      name: string;
      values: string[];
    }>;
    images: Array<{
      id: number;
      src: string;
      alt: string | null;
      width: number;
      height: number;
    }>;
    variants: Array<{
      id: number;
      title: string;
      price: string;
      compare_at_price: string | null;
      sku: string;
      option1: string | null;
      option2: string | null;
      option3: string | null;
    }>;
  };
}

// Color name to hex mapping - base colors for matching
const COLOR_HEX_MAP: Record<string, string> = {
  // Neutrals
  'black': '#000000',
  'white': '#ffffff',
  'grey': '#808080',
  'gray': '#808080',
  'charcoal': '#36454f',
  'graphite': '#4a4a4a',
  'slate': '#708090',
  'silver': '#c0c0c0',
  'ash': '#b2beb5',
  // Browns/Tans
  'brown': '#8b4513',
  'tan': '#d2b48c',
  'camel': '#c19a6b',
  'khaki': '#c3b091',
  'taupe': '#483c32',
  'espresso': '#3c2415',
  'chocolate': '#7b3f00',
  'coffee': '#6f4e37',
  'walnut': '#5d432c',
  'chestnut': '#954535',
  'cognac': '#9a463d',
  'saddle': '#8b4513',
  // Creams/Beiges
  'bone': '#e3dac9',
  'cream': '#fffdd0',
  'ivory': '#fffff0',
  'beige': '#f5f5dc',
  'oatmeal': '#d3c5a8',
  'sand': '#c2b280',
  'ecru': '#cdb891',
  'linen': '#faf0e6',
  'canvas': '#e5d3b3',
  // Blues
  'navy': '#1a237e',
  'blue': '#0066cc',
  'indigo': '#3f51b5',
  'denim': '#1560bd',
  'cobalt': '#0047ab',
  'royal': '#4169e1',
  'sky': '#87ceeb',
  'teal': '#008080',
  'cerulean': '#007ba7',
  'midnight': '#191970',
  'steel': '#4682b4',
  'ocean': '#006994',
  // Greens
  'green': '#228b22',
  'olive': '#808000',
  'sage': '#9dc183',
  'moss': '#8a9a5b',
  'forest': '#228b22',
  'hunter': '#355e3b',
  'emerald': '#50c878',
  'jade': '#00a86b',
  'mint': '#98ff98',
  'pine': '#01796f',
  'fern': '#4f7942',
  // Reds/Pinks
  'red': '#cc0000',
  'burgundy': '#800020',
  'wine': '#722f37',
  'maroon': '#800000',
  'cherry': '#de3163',
  'crimson': '#dc143c',
  'rust': '#b7410e',
  'terracotta': '#e2725b',
  'coral': '#ff7f50',
  'salmon': '#fa8072',
  'pink': '#ffc0cb',
  'blush': '#de5d83',
  'rose': '#ff007f',
  'dusty': '#d4a5a5',
  'mauve': '#e0b0ff',
  'berry': '#8e4585',
  // Yellows/Oranges
  'yellow': '#ffd700',
  'mustard': '#ffdb58',
  'gold': '#ffd700',
  'orange': '#ff8c00',
  'amber': '#ffbf00',
  'butterscotch': '#e09540',
  'honey': '#eb9605',
  'marigold': '#eaa221',
  // Purples
  'purple': '#800080',
  'plum': '#8e4585',
  'eggplant': '#614051',
  'lavender': '#e6e6fa',
  'lilac': '#c8a2c8',
  'violet': '#8f00ff',
  'grape': '#6f2da8',
};

// Get hex color from color name - supports partial matching
function getColorHex(colorName: string): string | undefined {
  const normalized = colorName.toLowerCase().trim();

  // Try exact match first
  if (COLOR_HEX_MAP[normalized]) {
    return COLOR_HEX_MAP[normalized];
  }

  // Try to find a color keyword in the name
  // Sort by length (longest first) to match "charcoal" before "coal"
  const colorKeys = Object.keys(COLOR_HEX_MAP).sort((a, b) => b.length - a.length);

  for (const key of colorKeys) {
    if (normalized.includes(key)) {
      return COLOR_HEX_MAP[key];
    }
  }

  // Check for common color modifiers that indicate a base color
  if (normalized.includes('heather')) {
    return COLOR_HEX_MAP['grey'];
  }
  if (normalized.includes('washed') || normalized.includes('faded')) {
    // Try to find the base color after the modifier
    const parts = normalized.split(/\s+/);
    for (const part of parts) {
      if (COLOR_HEX_MAP[part]) {
        return COLOR_HEX_MAP[part];
      }
    }
  }

  return undefined;
}

// Interface for variant availability data from HTML
interface HtmlVariantData {
  variants: Array<{
    id: number;
    title: string;
    available: boolean;
    option1: string | null;
    option2: string | null;
    option3: string | null;
  }>;
  yGroupId?: string;
}

// Fetch variant availability from HTML page
async function fetchVariantAvailability(handle: string): Promise<HtmlVariantData | null> {
  try {
    const url = `https://www.everlane.com/products/${handle}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Accept": "text/html",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Extract variant data from window.OnwardWalletsCurrentProduct.variants
    const variantMatch = html.match(/window\.OnwardWalletsCurrentProduct\s*=\s*(\{[\s\S]*?\});?\s*(?:window\.|<\/script>)/);
    let variants: HtmlVariantData['variants'] = [];

    if (variantMatch) {
      try {
        const productData = JSON.parse(variantMatch[1]);
        if (productData.variants && Array.isArray(productData.variants)) {
          variants = productData.variants.map((v: { id: number; title: string; available: boolean; option1: string | null; option2: string | null; option3: string | null }) => ({
            id: v.id,
            title: v.title,
            available: v.available ?? true,
            option1: v.option1,
            option2: v.option2,
            option3: v.option3,
          }));
        }
      } catch (e) {
        // JSON parse failed, try regex extraction
      }
    }

    // If we didn't get variants from the main object, try to find them directly
    if (variants.length === 0) {
      const variantsArrayMatch = html.match(/"variants"\s*:\s*\[([\s\S]*?)\]\s*,\s*"images"/);
      if (variantsArrayMatch) {
        try {
          const variantsArray = JSON.parse(`[${variantsArrayMatch[1]}]`);
          variants = variantsArray.map((v: { id: number; title: string; available?: boolean; option1?: string; option2?: string; option3?: string }) => ({
            id: v.id,
            title: v.title,
            available: v.available ?? true,
            option1: v.option1 || null,
            option2: v.option2 || null,
            option3: v.option3 || null,
          }));
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    // Extract YGroup ID from tags
    let yGroupId: string | undefined;
    const yGroupMatch = html.match(/YGroup[_-]?(\d+)/i);
    if (yGroupMatch) {
      yGroupId = yGroupMatch[1];
    }

    return { variants, yGroupId };
  } catch (error) {
    return null;
  }
}

// Fetch product data from JSON API with retry on rate limit
async function fetchProductJson(handle: string, retries = 3): Promise<EverlaneProductJson | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const url = `https://www.everlane.com/products/${handle}.json`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": getRandomUserAgent(),
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
      });

      if (response.status === 429) {
        // Rate limited - wait and retry
        const waitTime = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
        console.log(`      Rate limited, waiting ${waitTime/1000}s...`);
        await longDelay(waitTime);
        continue;
      }

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      if (attempt < retries - 1) {
        await delay(1000);
        continue;
      }
      return null;
    }
  }
  return null;
}

// Extract product handles from category page HTML
async function getProductHandlesFromCategory(categoryUrl: string): Promise<string[]> {
  try {
    const url = `https://www.everlane.com${categoryUrl}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Accept": "text/html",
      },
    });

    if (!response.ok) {
      console.log(`    Failed to fetch ${url}: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const handles: string[] = [];

    // Method 1: Extract from collectionView JSON in script tags
    const collectionViewMatch = html.match(/collectionView['"]\s*:\s*(\{[\s\S]*?\})\s*,\s*['"]/);
    if (collectionViewMatch) {
      try {
        // Find all product handles in the JSON
        const handleMatches = html.matchAll(/["']handle["']\s*:\s*["']([^"']+)["']/g);
        for (const match of handleMatches) {
          if (match[1] && !handles.includes(match[1])) {
            handles.push(match[1]);
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    // Method 2: Look for product handles in any script or data attribute
    const handlePattern = /\/products\/([a-z0-9][a-z0-9-]+[a-z0-9])/gi;
    let match;
    while ((match = handlePattern.exec(html)) !== null) {
      const handle = match[1];
      // Filter out non-product paths (collection slugs, etc)
      if (handle &&
          !handles.includes(handle) &&
          handle.length > 10 &&
          !handle.endsWith('-collection')) {
        handles.push(handle);
      }
    }

    // Method 3: Fallback to cheerio for href links
    if (handles.length === 0) {
      const $ = cheerio.load(html);
      $('a[href*="/products/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const linkMatch = href.match(/\/products\/([^/?]+)/);
          if (linkMatch && linkMatch[1] && !handles.includes(linkMatch[1])) {
            handles.push(linkMatch[1]);
          }
        }
      });
    }

    return handles;
  } catch (error) {
    console.log(`    Error fetching category ${categoryUrl}:`, error);
    return [];
  }
}

// Convert JSON product to ScrapedProduct
function jsonToProduct(
  json: EverlaneProductJson,
  category: string,
  gender: "men" | "women" | "unisex",
  htmlData?: HtmlVariantData | null
): ScrapedProduct {
  const product = json.product;

  // Get the lowest price variant and its compare_at_price
  const priceData = product.variants
    .map(v => ({
      price: parseFloat(v.price),
      compareAt: v.compare_at_price ? parseFloat(v.compare_at_price) : null
    }))
    .filter(p => !isNaN(p.price) && p.price > 0);

  const price = priceData.length > 0 ? Math.min(...priceData.map(p => p.price)) : 0;

  // Get original price if item is on sale (compare_at_price > price)
  let originalPrice: number | undefined;
  const compareAtPrices = priceData
    .filter(p => p.compareAt && p.compareAt > p.price)
    .map(p => p.compareAt!);
  if (compareAtPrices.length > 0) {
    originalPrice = Math.max(...compareAtPrices);
  }

  // Extract material from tags (look for "fabric: X")
  // Tags can be an array or a comma-separated string
  let material: string | undefined;
  const rawTags = product.tags || [];
  const tags: string[] = Array.isArray(rawTags)
    ? rawTags
    : typeof rawTags === 'string'
      ? rawTags.split(',').map(t => t.trim())
      : [];

  for (const tag of tags) {
    const tagLower = tag.toLowerCase();
    if (tagLower.startsWith('fabric:')) {
      material = tag.split(':')[1]?.trim();
      // Capitalize first letter
      if (material) {
        material = material.charAt(0).toUpperCase() + material.slice(1);
      }
      break;
    }
  }

  // Extract sizes from options or variants (legacy field)
  let sizes: string[] | undefined;
  const sizeOption = product.options?.find(opt =>
    opt.name.toLowerCase() === 'size' || opt.name.toLowerCase() === 'sizes'
  );
  if (sizeOption && sizeOption.values.length > 0) {
    sizes = sizeOption.values;
  } else {
    // Fallback: get unique sizes from variants
    const variantSizes = product.variants
      .map(v => v.title || v.option1)
      .filter((s): s is string => !!s && s !== 'Default Title');
    if (variantSizes.length > 0) {
      sizes = [...new Set(variantSizes)];
    }
  }

  // Build variants array with availability from HTML data
  let variants: ProductVariant[] | undefined;
  if (htmlData && htmlData.variants.length > 0) {
    // Create availability map from HTML data
    const availabilityMap = new Map<number, boolean>();
    for (const v of htmlData.variants) {
      availabilityMap.set(v.id, v.available);
    }

    variants = product.variants.map(v => ({
      id: v.id.toString(),
      title: v.title,
      available: availabilityMap.get(v.id) ?? true, // Default to available if not found
      price: parseFloat(v.price),
      option1: v.option1 || undefined,
      option2: v.option2 || undefined,
      option3: v.option3 || undefined,
    }));
  } else {
    // Fallback: assume all variants are available
    variants = product.variants.map(v => ({
      id: v.id.toString(),
      title: v.title,
      available: true,
      price: parseFloat(v.price),
      option1: v.option1 || undefined,
      option2: v.option2 || undefined,
      option3: v.option3 || undefined,
    }));
  }

  // Build options array
  let options: ProductOption[] | undefined;
  if (product.options && product.options.length > 0) {
    options = product.options
      .filter(opt => opt.name !== 'Title' && opt.values.length > 0)
      .map(opt => ({
        name: opt.name,
        values: opt.values,
      }));
    if (options.length === 0) options = undefined;
  }

  // Extract color name from product title (after "|")
  let colorName: string | undefined;
  const titleMatch = product.title.match(/\|\s*([^|]+)$/);
  if (titleMatch) {
    colorName = titleMatch[1].trim();
  }

  // Get hex color
  const colorHex = colorName ? getColorHex(colorName) : undefined;

  // Get YGroup ID for color linking
  const colorGroupId = htmlData?.yGroupId;

  // Get all image URLs (already deduplicated by Everlane)
  const imageUrls = product.images.map(img => {
    let src = img.src;
    if (src.startsWith('//')) {
      src = 'https:' + src;
    }
    return src;
  });

  // Clean up title (remove color suffix like "| Heathered Grey")
  const name = product.title.replace(/\s*\|\s*[^|]+$/, '').trim();

  // Clean up description (remove HTML tags)
  const description = (product.description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500); // Limit length

  return {
    name,
    description: description || `${name} from Everlane`,
    brand: "Everlane",
    price,
    originalPrice,
    material,
    sizes,
    variants,
    options,
    colorGroupId,
    colorName,
    colorHex,
    category,
    gender,
    condition: "new",
    sourceUrl: `https://www.everlane.com/products/${product.handle}`,
    sourcePlatform: "Everlane",
    imageUrl: imageUrls[0] || '',
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
  };
}

// Get product handles from sitemap with rate limit handling
async function getProductHandlesFromSitemap(): Promise<string[]> {
  const handles: string[] = [];

  // Helper to fetch with retry
  async function fetchWithRetry(url: string, retries = 3): Promise<Response | null> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": getRandomUserAgent(),
            "Accept": "text/xml,application/xml",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });

        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt + 1) * 2000; // 4s, 8s, 16s
          console.log(`    Rate limited, waiting ${waitTime/1000}s...`);
          await longDelay(waitTime);
          continue;
        }

        return response;
      } catch (error) {
        if (attempt < retries - 1) {
          await delay(2000);
          continue;
        }
      }
    }
    return null;
  }

  try {
    // First, get the sitemap index to find product sitemap URLs
    const indexResponse = await fetchWithRetry("https://www.everlane.com/sitemap.xml");

    if (!indexResponse || !indexResponse.ok) {
      console.log(`    Sitemap index fetch failed`);
      return handles;
    }

    const indexXml = await indexResponse.text();

    // Extract product sitemap URLs (they have query params)
    const sitemapMatches = indexXml.matchAll(/<loc>([^<]+sitemap_products[^<]+)<\/loc>/gi);
    const sitemapUrls: string[] = [];

    for (const match of sitemapMatches) {
      // Decode HTML entities (&amp; -> &)
      const url = match[1].replace(/&amp;/g, '&');
      sitemapUrls.push(url);
    }

    console.log(`    Found ${sitemapUrls.length} product sitemaps`);

    // Fetch each product sitemap with delays
    for (let i = 0; i < sitemapUrls.length; i++) {
      const sitemapUrl = sitemapUrls[i];
      try {
        await longDelay(1500); // Longer delay between sitemaps
        const response = await fetchWithRetry(sitemapUrl);

        if (!response || !response.ok) {
          console.log(`    Sitemap ${i+1} fetch failed`);
          continue;
        }

        const xml = await response.text();

        // Extract product URLs
        const urlMatches = xml.matchAll(/<loc>([^<]+\/products\/[^<]+)<\/loc>/gi);
        for (const match of urlMatches) {
          const url = match[1];
          const handleMatch = url.match(/\/products\/([^/?]+)/);
          if (handleMatch && handleMatch[1] && !handles.includes(handleMatch[1])) {
            handles.push(handleMatch[1]);
          }
        }

        console.log(`    Sitemap ${i+1}/${sitemapUrls.length} loaded: ${handles.length} products total`);
      } catch (error) {
        console.log(`    Error fetching sitemap: ${error}`);
      }
    }
  } catch (error) {
    console.log(`    Sitemap fetch failed: ${error}`);
  }

  return handles;
}

export async function scrapeEverlane(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 2500; // Full catalog is ~2000 products
  const products: ScrapedProduct[] = [];
  const errors: string[] = [];
  const seenHandles = new Set<string>();

  console.log("Starting Everlane scraper (JSON API)...");
  console.log(`  Target: ${maxProducts} products`);
  console.log(`  Method: Sitemap + JSON API (conservative rate limiting)`);

  // Step 1: Try sitemap first for comprehensive product list
  console.log("\n  Fetching sitemap for product handles...");
  console.log("  (Using conservative delays to avoid rate limiting)");

  await delay(1000); // Initial delay
  const sitemapHandles = await getProductHandlesFromSitemap();

  // If sitemap fails, we won't fall back to category pages to avoid more rate limiting
  if (sitemapHandles.length === 0) {
    console.log("\n  Sitemap fetch failed - rate limited. Please try again in a few minutes.");
    return {
      products: [],
      source: "Everlane",
      scrapedAt: new Date(),
      errors: ["Rate limited - please try again later"],
    };
  }

  const allHandles: Array<{ handle: string; category: string; gender: "men" | "women" | "unisex" }> = [];

  if (sitemapHandles.length > 0) {
    // Use sitemap handles - infer category and gender from handle name
    for (const handle of sitemapHandles) {
      if (allHandles.length >= maxProducts * 2) break;
      if (seenHandles.has(handle)) continue;

      seenHandles.add(handle);

      // Infer gender and category from handle
      const handleLower = handle.toLowerCase();
      let gender: "men" | "women" | "unisex" = "unisex";
      if (handleLower.includes("womens") || handleLower.includes("women")) gender = "women";
      else if (handleLower.includes("mens") || handleLower.includes("men")) gender = "men";

      let category = "clothing";
      // Order matters - check more specific patterns first
      if (handleLower.includes("gift-card") || handleLower.includes("giftcard")) category = "gift cards";
      else if (handleLower.includes("sweater") || handleLower.includes("cardigan") || handleLower.includes("pullover")) category = "sweaters";
      else if (handleLower.includes("bodysuit")) category = "tops";
      else if (handleLower.includes("tee") || handleLower.includes("-shirt") || handleLower.includes("blouse") || handleLower.includes("tank") || handleLower.includes("polo") || handleLower.includes("henley")) category = "tops";
      else if (handleLower.includes("jean") || handleLower.includes("denim")) category = "jeans";
      else if (handleLower.includes("chino") || handleLower.includes("trouser") || handleLower.includes("slack") || handleLower.includes("sweatpant") || handleLower.includes("jogger")) category = "pants";
      else if (handleLower.includes("pant") && !handleLower.includes("sweatpant")) category = "pants";
      else if (handleLower.includes("short") && !handleLower.includes("shortie")) category = "shorts";
      else if (handleLower.includes("dress") && !handleLower.includes("undress")) category = "dresses";
      else if (handleLower.includes("skirt")) category = "skirts";
      else if (handleLower.includes("jacket") || handleLower.includes("coat") || handleLower.includes("blazer") || handleLower.includes("parka") || handleLower.includes("puffer") || handleLower.includes("vest")) category = "outerwear";
      else if (handleLower.includes("boot") || handleLower.includes("loafer") || handleLower.includes("mule") || handleLower.includes("flat") || handleLower.includes("heel") || handleLower.includes("sandal") || handleLower.includes("slipper")) category = "shoes";
      else if (handleLower.includes("shoe") || handleLower.includes("sneaker")) category = "shoes";
      else if (handleLower.includes("bag") || handleLower.includes("tote") || handleLower.includes("backpack") || handleLower.includes("clutch") || handleLower.includes("crossbody") || handleLower.includes("wallet")) category = "bags";
      else if (handleLower.includes("hat") || handleLower.includes("beanie") || handleLower.includes("scarf") || handleLower.includes("belt") || handleLower.includes("sock") || handleLower.includes("glove")) category = "accessories";
      else if (handleLower.includes("bra") || handleLower.includes("underwear") || handleLower.includes("brief") || handleLower.includes("boxer")) category = "intimates";
      else if (handleLower.includes("hoodie") || handleLower.includes("sweatshirt")) category = "sweaters";
      else if (handleLower.includes("top")) category = "tops";

      allHandles.push({ handle, category, gender });
    }
  }

  console.log(`\n  Total unique handles: ${allHandles.length}`);

  // Step 2: Fetch product details from JSON API (parallel batches with adaptive rate limiting)
  console.log(`\n  Fetching product details via JSON API...`);
  const handlesToFetch = allHandles.slice(0, maxProducts);
  let concurrency = 5; // Start with 5 concurrent requests
  let consecutiveErrors = 0;

  for (let i = 0; i < handlesToFetch.length; i += concurrency) {
    const batch = handlesToFetch.slice(i, i + concurrency);

    // Fetch batch in parallel
    const batchResults = await Promise.all(
      batch.map(async ({ handle, category, gender }) => {
        const json = await fetchProductJson(handle);
        if (json && json.product) {
          const product = jsonToProduct(json, category, gender, null);
          if (product.price > 0) {
            return { success: true, product };
          }
        }
        return { success: false, handle };
      })
    );

    let batchErrors = 0;
    for (const result of batchResults) {
      if (result.success && result.product) {
        products.push(result.product);
        consecutiveErrors = 0;
      } else {
        batchErrors++;
        consecutiveErrors++;
      }
    }

    // Adaptive rate limiting - slow down if seeing errors
    if (batchErrors > batch.length / 2) {
      concurrency = Math.max(2, concurrency - 1);
      await longDelay(3000); // Extra delay when seeing errors
    } else if (consecutiveErrors === 0 && concurrency < 5) {
      concurrency = Math.min(5, concurrency + 1); // Speed up if doing well
    }

    // Progress update every 50 products
    if ((i + concurrency) % 50 === 0 || i + concurrency >= handlesToFetch.length) {
      const successRate = products.length > 0 ? ((products.length / (i + batch.length)) * 100).toFixed(0) : '0';
      console.log(`    Progress: ${Math.min(i + batch.length, handlesToFetch.length)}/${handlesToFetch.length} fetched, ${products.length} valid (${successRate}% success, concurrency: ${concurrency})`);
    }

    // Variable delay based on concurrency
    await delay(200 + (5 - concurrency) * 100);
  }

  console.log(`\nEverlane: Found ${products.length} total products`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
  }

  return {
    products,
    source: "Everlane",
    scrapedAt: new Date(),
    errors: errors.length > 0 ? errors : undefined,
  };
}
