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
  { url: "/collections/womens-dresses", category: "dresses", gender: "women" },
  { url: "/collections/womens-pants", category: "pants", gender: "women" },
  { url: "/collections/womens-jeans", category: "jeans", gender: "women" },
  { url: "/collections/womens-outerwear", category: "outerwear", gender: "women" },
  { url: "/collections/womens-shoes", category: "shoes", gender: "women" },
  { url: "/collections/womens-bags", category: "bags", gender: "women" },
  // Men's categories
  { url: "/collections/mens-sweaters", category: "sweaters", gender: "men" },
  { url: "/collections/mens-tees", category: "tops", gender: "men" },
  { url: "/collections/mens-shirts", category: "tops", gender: "men" },
  { url: "/collections/mens-pants", category: "pants", gender: "men" },
  { url: "/collections/mens-jeans", category: "jeans", gender: "men" },
  { url: "/collections/mens-outerwear", category: "outerwear", gender: "men" },
  { url: "/collections/mens-shoes", category: "shoes", gender: "men" },
  { url: "/collections/mens-bags", category: "bags", gender: "men" },
];

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Small delay between requests to be polite
function delay(ms: number = 500): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
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
        "User-Agent": USER_AGENT,
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

// Fetch product data from JSON API
async function fetchProductJson(handle: string): Promise<EverlaneProductJson | null> {
  try {
    const url = `https://www.everlane.com/products/${handle}.json`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

// Extract product handles from category page HTML
async function getProductHandlesFromCategory(categoryUrl: string): Promise<string[]> {
  try {
    const url = `https://www.everlane.com${categoryUrl}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
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

// Get product handles from sitemap
async function getProductHandlesFromSitemap(): Promise<string[]> {
  const handles: string[] = [];

  try {
    // First, get the sitemap index to find product sitemap URLs
    const indexResponse = await fetch("https://www.everlane.com/sitemap.xml", {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!indexResponse.ok) return handles;

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

    // Fetch each product sitemap
    for (const sitemapUrl of sitemapUrls) {
      try {
        const response = await fetch(sitemapUrl, {
          headers: { "User-Agent": USER_AGENT },
        });

        if (!response.ok) continue;

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

        console.log(`    Sitemap loaded: ${handles.length} products total`);
        await delay(200);
      } catch (error) {
        // Continue to next sitemap
      }
    }
  } catch (error) {
    console.log(`    Sitemap fetch failed, will use category pages`);
  }

  return handles;
}

export async function scrapeEverlane(config: ScraperConfig = {}): Promise<ScraperResult> {
  const maxProducts = config.maxProducts || 200;
  const products: ScrapedProduct[] = [];
  const errors: string[] = [];
  const seenHandles = new Set<string>();

  console.log("Starting Everlane scraper (JSON API)...");
  console.log(`  Target: ${maxProducts} products`);
  console.log(`  Method: Sitemap + Category pages + JSON API (fast, reliable)`);

  // Step 1: Try sitemap first for comprehensive product list
  console.log("\n  Trying sitemap for product handles...");
  const sitemapHandles = await getProductHandlesFromSitemap();

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
      if (handleLower.includes("sweater") || handleLower.includes("cardigan")) category = "sweaters";
      else if (handleLower.includes("tee") || handleLower.includes("shirt") || handleLower.includes("top")) category = "tops";
      else if (handleLower.includes("jean") || handleLower.includes("denim")) category = "jeans";
      else if (handleLower.includes("pant") || handleLower.includes("chino") || handleLower.includes("trouser")) category = "pants";
      else if (handleLower.includes("dress")) category = "dresses";
      else if (handleLower.includes("jacket") || handleLower.includes("coat") || handleLower.includes("blazer")) category = "outerwear";
      else if (handleLower.includes("shoe") || handleLower.includes("boot") || handleLower.includes("sneaker") || handleLower.includes("loafer")) category = "shoes";
      else if (handleLower.includes("bag") || handleLower.includes("tote") || handleLower.includes("backpack")) category = "bags";

      allHandles.push({ handle, category, gender });
    }
  }

  // Step 2: If sitemap didn't work, fall back to category pages
  if (allHandles.length < maxProducts) {
    console.log("\n  Collecting additional handles from category pages...");

    for (const category of EVERLANE_CATEGORIES) {
      if (allHandles.length >= maxProducts * 2) break;

      console.log(`    Loading: ${category.url}`);
      const handles = await getProductHandlesFromCategory(category.url);
      console.log(`    Found ${handles.length} products`);

      for (const handle of handles) {
        if (!seenHandles.has(handle)) {
          seenHandles.add(handle);
          allHandles.push({ handle, category: category.category, gender: category.gender });
        }
      }

      await delay(300);
    }
  }

  console.log(`\n  Total unique handles: ${allHandles.length}`);

  // Step 2: Fetch product details from JSON API + HTML for availability
  console.log(`\n  Fetching product details via JSON API + HTML...`);
  const handlesToFetch = allHandles.slice(0, maxProducts);

  for (let i = 0; i < handlesToFetch.length; i++) {
    const { handle, category, gender } = handlesToFetch[i];

    // Fetch both JSON and HTML data in parallel
    const [json, htmlData] = await Promise.all([
      fetchProductJson(handle),
      fetchVariantAvailability(handle),
    ]);

    if (json && json.product) {
      const product = jsonToProduct(json, category, gender, htmlData);
      if (product.price > 0) {
        products.push(product);
      }
    } else {
      errors.push(`Failed to fetch: ${handle}`);
    }

    // Progress update every 10 products
    if ((i + 1) % 10 === 0 || i === handlesToFetch.length - 1) {
      const avgImages = products.length > 0
        ? (products.reduce((sum, p) => sum + (p.imageUrls?.length || 1), 0) / products.length).toFixed(1)
        : '0';
      const withVariants = products.filter(p => p.variants && p.variants.length > 0).length;
      console.log(`    Progress: ${i + 1}/${handlesToFetch.length} fetched, ${products.length} valid (${withVariants} with variants, avg ${avgImages} images/product)`);
    }

    await delay(200); // Small delay between API requests
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
