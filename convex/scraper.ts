import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Scraper configuration
const SCRAPER_CONFIG = {
  poshmark: {
    enabled: true,
    categories: ["boots", "sneakers", "dresses", "jackets", "bags"],
    maxItemsPerCategory: 50,
  },
  // Add more platforms here as needed
};

// Simulated scrape result (in production, this would call actual scrapers)
interface ScrapedProduct {
  name: string;
  description: string;
  brand: string;
  price: number;
  material?: string;
  size?: string;
  category: string;
  gender?: "men" | "women" | "unisex";
  condition: "new" | "used" | "like_new";
  sourceUrl: string;
  sourcePlatform: string;
  imageUrl?: string;
}

// Main scraper action - runs periodically to update inventory
export const runScrapers = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    scrapedCount: number;
    addedCount: number;
    updatedCount: number;
    errors: string[];
  }> => {
    console.log("Starting scheduled scraper run...");

    const results = {
      scrapedCount: 0,
      addedCount: 0,
      updatedCount: 0,
      errors: [] as string[],
    };

    // For each enabled platform
    for (const [platform, config] of Object.entries(SCRAPER_CONFIG)) {
      if (!config.enabled) continue;

      console.log(`Scraping ${platform}...`);

      try {
        // In production, this would call actual scraper endpoints or functions
        // For now, we simulate with existing data updates
        const platformResults = await ctx.runAction(internal.scraper.scrapePlatform, {
          platform,
          categories: config.categories,
          maxItems: config.maxItemsPerCategory,
        });

        results.scrapedCount += platformResults.scraped;
        results.addedCount += platformResults.added;
        results.updatedCount += platformResults.updated;
      } catch (error) {
        const errorMsg = `Error scraping ${platform}: ${error}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    console.log(`Scraper run complete. Scraped: ${results.scrapedCount}, Added: ${results.addedCount}, Updated: ${results.updatedCount}`);
    return results;
  },
});

// Scrape a single platform
export const scrapePlatform = internalAction({
  args: {
    platform: v.string(),
    categories: v.array(v.string()),
    maxItems: v.number(),
  },
  handler: async (ctx, args): Promise<{
    scraped: number;
    added: number;
    updated: number;
  }> => {
    // In production, this would:
    // 1. Call the actual scraper (e.g., Poshmark scraper)
    // 2. Parse the results
    // 3. Upsert products into the database

    // For demo purposes, we'll simulate price updates on existing products
    const existingProducts = await ctx.runQuery(internal.scraper.getProductsByPlatform, {
      platform: args.platform,
      limit: args.maxItems * args.categories.length,
    });

    let updated = 0;

    for (const product of existingProducts) {
      // Get current price from colorVariants or legacy field
      const currentPrice = product.colorVariants?.[0]?.price ?? product.price;
      if (currentPrice === undefined) continue;

      // Simulate price fluctuation (5% chance of price change)
      if (Math.random() < 0.05) {
        const priceChange = (Math.random() - 0.5) * 0.2; // -10% to +10%
        const newPrice = Math.round(currentPrice * (1 + priceChange) * 100) / 100;

        await ctx.runMutation(internal.scraper.updateProductPrice, {
          productId: product._id,
          oldPrice: currentPrice,
          newPrice,
        });

        updated++;
      }
    }

    return {
      scraped: existingProducts.length,
      added: 0, // No new products in simulation
      updated,
    };
  },
});

// Get products by platform
export const getProductsByPlatform = internalQuery({
  args: {
    platform: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("sourcePlatform"), args.platform))
      .take(args.limit);

    return products;
  },
});

// Update product price and record history
// Supports both new colorVariants structure and legacy fields
export const updateProductPrice = internalMutation({
  args: {
    productId: v.id("products"),
    oldPrice: v.number(),
    newPrice: v.number(),
    colorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return;

    // If product has colorVariants (new structure), update the matching color variant
    if (product.colorVariants && product.colorVariants.length > 0) {
      const targetColorName = args.colorName || product.colorVariants[0].colorName;
      const updatedVariants = product.colorVariants.map(cv => {
        if (cv.colorName === targetColorName) {
          return { ...cv, price: args.newPrice };
        }
        return cv;
      });
      await ctx.db.patch(args.productId, { colorVariants: updatedVariants });
    } else {
      // Legacy: update price field directly
      await ctx.db.patch(args.productId, { price: args.newPrice });
    }

    // Record in price history
    await ctx.db.insert("price_history", {
      productId: args.productId,
      price: args.newPrice,
      checkedAt: Date.now(),
    });

    console.log(`Price updated: ${args.productId} from $${args.oldPrice} to $${args.newPrice}`);
  },
});

// Upsert a scraped product (for when real scrapers are implemented)
export const upsertProduct = internalMutation({
  args: {
    sourceUrl: v.string(),
    name: v.string(),
    description: v.string(),
    brand: v.string(),
    price: v.number(),
    material: v.optional(v.string()),
    size: v.optional(v.string()),
    category: v.string(),
    gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
    condition: v.union(v.literal("new"), v.literal("used"), v.literal("like_new")),
    sourcePlatform: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if product already exists by source URL
    const existing = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("sourceUrl"), args.sourceUrl))
      .first();

    if (existing) {
      // Update existing product
      const oldPrice = existing.price;
      await ctx.db.patch(existing._id, {
        name: args.name,
        description: args.description,
        price: args.price,
        imageUrl: args.imageUrl,
      });

      // Record price change if different
      if (oldPrice !== args.price) {
        await ctx.db.insert("price_history", {
          productId: existing._id,
          price: args.price,
          checkedAt: Date.now(),
        });
      }

      return { id: existing._id, isNew: false };
    } else {
      // Insert new product
      const id = await ctx.db.insert("products", args);

      // Record initial price
      await ctx.db.insert("price_history", {
        productId: id,
        price: args.price,
        checkedAt: Date.now(),
      });

      return { id, isNew: true };
    }
  },
});

// Color name to hex mapping for common colors
const COLOR_HEX_MAP: Record<string, string> = {
  // Neutrals
  black: "#000000",
  white: "#FFFFFF",
  ivory: "#FFFFF0",
  cream: "#FFFDD0",
  bone: "#E3DAC9",
  beige: "#F5F5DC",
  tan: "#D2B48C",
  taupe: "#483C32",
  grey: "#808080",
  gray: "#808080",
  charcoal: "#36454F",
  heather: "#9E9E9E",
  // Browns
  brown: "#8B4513",
  "dark brown": "#5C4033",
  chocolate: "#7B3F00",
  cognac: "#9A463D",
  camel: "#C19A6B",
  espresso: "#3C2415",
  // Reds/Pinks
  red: "#FF0000",
  burgundy: "#800020",
  wine: "#722F37",
  maroon: "#800000",
  pink: "#FFC0CB",
  blush: "#DE5D83",
  rose: "#FF007F",
  coral: "#FF7F50",
  // Blues
  blue: "#0000FF",
  navy: "#000080",
  "navy blue": "#000080",
  cobalt: "#0047AB",
  indigo: "#4B0082",
  teal: "#008080",
  // Greens
  green: "#008000",
  olive: "#808000",
  sage: "#BCB88A",
  forest: "#228B22",
  hunter: "#355E3B",
  moss: "#8A9A5B",
  // Yellows/Oranges
  yellow: "#FFFF00",
  gold: "#FFD700",
  mustard: "#FFDB58",
  orange: "#FFA500",
  rust: "#B7410E",
  // Purples
  purple: "#800080",
  violet: "#EE82EE",
  lavender: "#E6E6FA",
  plum: "#DDA0DD",
};

// Get hex color from color name
function getColorHex(colorName: string | undefined): string | undefined {
  if (!colorName) return undefined;
  const normalized = colorName.toLowerCase().trim();
  return COLOR_HEX_MAP[normalized];
}

// Interface for color variant data
interface ColorVariantData {
  handle: string;
  colorName: string;
  colorHex?: string;
  colorGroupId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  variants: Array<{
    id: string;
    title: string;
    available: boolean;
    price?: number;
    option1?: string;
    option2?: string;
    option3?: string;
  }>;
  options?: Array<{
    name: string;
    values: string[];
  }>;
}

// Interface for refreshed product data
interface RefreshedProductData {
  price?: number;
  originalPrice?: number;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  variants?: Array<{
    id: string;
    title: string;
    available: boolean;
    price?: number;
    option1?: string;
    option2?: string;
    option3?: string;
  }>;
  options?: Array<{
    name: string;
    values: string[];
  }>;
  colorGroupId?: string;
  colorName?: string;
  colorHex?: string;
  colorVariants?: ColorVariantData[];
}

// Helper to parse Everlane product JSON
function parseEverlaneProductJson(product: any, availabilityMap?: Map<number, boolean>): {
  price: number | undefined;
  originalPrice: number | undefined;
  description: string;
  colorGroupId: string | undefined;
  colorName: string | undefined;
  colorHex: string | undefined;
  imageUrl: string | undefined;
  imageUrls: string[] | undefined;
  variants: RefreshedProductData['variants'];
  options: RefreshedProductData['options'];
} {
  // Get the lowest price variant
  const prices = product.variants
    .map((v: { price: string }) => parseFloat(v.price))
    .filter((p: number) => !isNaN(p) && p > 0);

  const price = prices.length > 0 ? Math.min(...prices) : undefined;

  // Get original price if on sale
  const compareAtPrices = product.variants
    .map((v: { price: string; compare_at_price: string | null }) => ({
      price: parseFloat(v.price),
      compareAt: v.compare_at_price ? parseFloat(v.compare_at_price) : null
    }))
    .filter((p: { price: number; compareAt: number | null }) => p.compareAt && p.compareAt > p.price)
    .map((p: { compareAt: number | null }) => p.compareAt);

  const originalPrice = compareAtPrices.length > 0 ? Math.max(...compareAtPrices) : undefined;

  // Get description (strip HTML tags)
  const description = (product.body_html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Extract colorGroupId from tags (format: "Product Group: 1468")
  const tags = product.tags || "";
  const groupMatch = tags.match(/Product Group:\s*(\d+)/i);
  const colorGroupId = groupMatch ? groupMatch[1] : undefined;

  // Extract color name from title (format: "The Glove Boot | Burgundy")
  const titleParts = (product.title || "").split("|");
  const colorName = titleParts.length > 1 ? titleParts[1].trim() : undefined;

  // Get color hex from color name
  const colorHex = getColorHex(colorName);

  // Get main image and all images
  const imageUrl = product.images?.[0]?.src;
  const imageUrls = product.images?.map((img: { src: string }) => img.src).filter(Boolean);

  // Build variants array
  const variants = product.variants.map((v: { id: number; title: string; price: string; option1: string | null; option2: string | null; option3: string | null }) => ({
    id: v.id.toString(),
    title: v.title,
    available: availabilityMap ? (availabilityMap.get(v.id) ?? true) : true,
    price: parseFloat(v.price),
    option1: v.option1 || undefined,
    option2: v.option2 || undefined,
    option3: v.option3 || undefined,
  }));

  // Build options array
  const options = product.options
    ?.filter((opt: { name: string; values: string[] }) => opt.name !== 'Title' && opt.values.length > 0)
    ?.map((opt: { name: string; values: string[] }) => ({
      name: opt.name,
      values: opt.values,
    }));

  return {
    price,
    originalPrice,
    description,
    colorGroupId,
    colorName,
    colorHex,
    imageUrl,
    imageUrls: imageUrls?.length > 0 ? imageUrls : undefined,
    variants,
    options: options?.length > 0 ? options : undefined,
  };
}

// Fetch all color variants from Everlane - search multiple collections
async function fetchEverlaneColorVariants(colorGroupId: string, currentHandle: string, pageHtml?: string): Promise<ColorVariantData[]> {
  const colorVariants: ColorVariantData[] = [];
  const foundHandles = new Set<string>();

  try {
    // Method 1: Try to extract color variant handles from HTML page
    if (pageHtml) {
      // Look for color swatch links in the HTML (pattern: /products/handle)
      // Everlane typically has color swatches that are links to other product pages
      const handleMatches = pageHtml.matchAll(/href=["']\/products\/([a-z0-9-]+)["']/gi);
      for (const match of handleMatches) {
        const handle = match[1];
        if (handle !== currentHandle && !foundHandles.has(handle)) {
          foundHandles.add(handle);
        }
      }
    }

    // Method 2: Search multiple collections for products with same YGroup tag
    // Different products appear in different collections on Everlane
    const collectionsToSearch = [
      "mens-sale",
      "womens-sale",
      "sale",
      "all",
      "mens-tops",
      "womens-tops",
      "mens-tees-and-tanks",
      "womens-tees",
      "mens-tees-short-sleeve",
      "womens-tees-short-sleeve",
      "mens-basics",
      "womens-basics",
      "mens-new-arrivals",
      "womens-new-arrivals",
      "best-sellers",
    ];

    const yGroupTag = `YGroup_${colorGroupId}`;

    for (const collection of collectionsToSearch) {
      try {
        const searchUrl = `https://www.everlane.com/collections/${collection}/products.json?limit=250`;

        const response = await fetch(searchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          const products = data.products || [];

          // Filter products that have the same YGroup tag
          for (const product of products) {
            const tags = product.tags || [];
            // tags can be array or comma-separated string
            const tagList = Array.isArray(tags) ? tags : (tags as string).split(",").map((t: string) => t.trim());
            if (tagList.includes(yGroupTag) && product.handle !== currentHandle) {
              foundHandles.add(product.handle);
            }
          }
        }
      } catch {
        // Skip collections that fail
      }

      // If we found some variants, we can stop searching
      if (foundHandles.size >= 4) break;
    }

    // Now fetch each color variant's data
    for (const handle of foundHandles) {
      try {
        const variantUrl = `https://www.everlane.com/products/${handle}.json`;
        const variantResponse = await fetch(variantUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "application/json",
          },
        });

        if (!variantResponse.ok) continue;

        const variantData = await variantResponse.json();
        const product = variantData.product;
        if (!product) continue;

        const parsed = parseEverlaneProductJson(product);

        // Extract proper product name (without color)
        const titleParts = (product.title || "").split("|");
        const name = titleParts[0].trim();

        if (parsed.colorName && parsed.price !== undefined) {
          colorVariants.push({
            handle: product.handle,
            colorName: parsed.colorName,
            colorHex: parsed.colorHex,
            colorGroupId,
            name,
            description: parsed.description,
            price: parsed.price,
            originalPrice: parsed.originalPrice,
            imageUrl: parsed.imageUrl,
            variants: parsed.variants || [],
            options: parsed.options,
          });
        }
      } catch {
        // Skip variants that fail to fetch
      }
    }
  } catch (error) {
    console.error("Error fetching color variants:", error);
  }

  return colorVariants;
}

// Fetch product data from Everlane JSON API
async function fetchEverlaneProduct(sourceUrl: string): Promise<RefreshedProductData | null> {
  try {
    // Extract handle from URL: https://www.everlane.com/products/womens-day-glove-bone -> womens-day-glove-bone
    const handleMatch = sourceUrl.match(/\/products\/([^/?]+)/);
    if (!handleMatch) return null;

    const handle = handleMatch[1];
    const jsonUrl = `https://www.everlane.com/products/${handle}.json`;

    const response = await fetch(jsonUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const product = data.product;

    if (!product) return null;

    // Try to get availability from HTML page and save HTML for color variant extraction
    let availabilityMap: Map<number, boolean> | undefined;
    let pageHtml: string | undefined;
    try {
      const htmlResponse = await fetch(sourceUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html",
        },
      });

      if (htmlResponse.ok) {
        pageHtml = await htmlResponse.text();
        const variantMatch = pageHtml.match(/window\.OnwardWalletsCurrentProduct\s*=\s*(\{[\s\S]*?\});?\s*(?:window\.|<\/script>)/);

        if (variantMatch) {
          const productData = JSON.parse(variantMatch[1]);
          if (productData.variants && Array.isArray(productData.variants)) {
            availabilityMap = new Map<number, boolean>();
            for (const v of productData.variants) {
              availabilityMap.set(v.id, v.available ?? true);
            }
          }
        }
      }
    } catch {
      // Fall back to assuming all variants available
    }

    const parsed = parseEverlaneProductJson(product, availabilityMap);

    // Fetch color variants if we have a colorGroupId
    let colorVariants: ColorVariantData[] | undefined;
    if (parsed.colorGroupId) {
      colorVariants = await fetchEverlaneColorVariants(parsed.colorGroupId, handle, pageHtml);
    }

    return {
      price: parsed.price,
      originalPrice: parsed.originalPrice,
      description: parsed.description,
      imageUrl: parsed.imageUrl,
      imageUrls: parsed.imageUrls,
      variants: parsed.variants,
      options: parsed.options,
      colorGroupId: parsed.colorGroupId,
      colorName: parsed.colorName,
      colorHex: parsed.colorHex,
      colorVariants: colorVariants && colorVariants.length > 0 ? colorVariants : undefined,
    };
  } catch (error) {
    console.error("Error fetching Everlane product:", error);
    return null;
  }
}

// Fetch product data from J.Crew (simplified - just price from HTML)
async function fetchJCrewProduct(sourceUrl: string): Promise<RefreshedProductData | null> {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Try to extract price from JSON-LD or page content
    // Look for product JSON-LD
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        try {
          const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
          const data = JSON.parse(jsonContent);
          if (data['@type'] === 'Product' && data.offers) {
            const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
            const prices = offers
              .map((o: { price: string | number }) => typeof o.price === 'string' ? parseFloat(o.price) : o.price)
              .filter((p: number) => !isNaN(p) && p > 0);

            if (prices.length > 0) {
              return { price: Math.min(...prices) };
            }
          }
        } catch {
          // Continue to next JSON-LD block
        }
      }
    }

    // Fallback: extract price from common patterns
    const priceMatch = html.match(/\$(\d+(?:\.\d{2})?)/);
    if (priceMatch) {
      return { price: parseFloat(priceMatch[1]) };
    }

    return null;
  } catch (error) {
    console.error("Error fetching J.Crew product:", error);
    return null;
  }
}

// Public action to refresh product data from source URL
export const refreshProductFromSource = action({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args): Promise<{
    updated: boolean;
    priceChanged: boolean;
    oldPrice?: number;
    newPrice?: number;
    error?: string;
  }> => {
    // Get the product
    const product = await ctx.runQuery(internal.scraper.getProductById, {
      productId: args.productId,
    });

    if (!product) {
      return { updated: false, priceChanged: false, error: "Product not found" };
    }

    // Check if we've refreshed recently (within last hour)
    const lastCheck = await ctx.runQuery(internal.scraper.getLastPriceCheck, {
      productId: args.productId,
    });

    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (lastCheck && lastCheck.checkedAt > oneHourAgo) {
      // Already checked recently, skip
      return { updated: false, priceChanged: false };
    }

    // Get sourceUrl
    if (!product.sourceUrl) {
      return { updated: false, priceChanged: false, error: "No source URL" };
    }

    // Fetch fresh data based on platform
    let refreshedData: RefreshedProductData | null = null;
    const platform = product.sourcePlatform?.toLowerCase() || "";

    if (platform.includes("everlane")) {
      refreshedData = await fetchEverlaneProduct(product.sourceUrl);
    } else if (platform.includes("jcrew") || platform.includes("j.crew") || platform.includes("j crew")) {
      refreshedData = await fetchJCrewProduct(product.sourceUrl);
    }
    // Add more platforms as needed

    const currentPrice = product.price ?? 0;

    if (!refreshedData || refreshedData.price === undefined) {
      // Still record the check to avoid hammering the source
      await ctx.runMutation(internal.scraper.recordPriceCheck, {
        productId: args.productId,
        price: currentPrice,
      });
      return { updated: false, priceChanged: false };
    }

    const oldPrice = currentPrice;
    const newPrice = refreshedData.price;
    const priceChanged = Math.abs(oldPrice - newPrice) > 0.01;

    // Update the product with fresh data
    await ctx.runMutation(internal.scraper.updateProductFromRefresh, {
      productId: args.productId,
      price: newPrice,
      originalPrice: refreshedData.originalPrice,
      description: refreshedData.description,
      imageUrl: refreshedData.imageUrl,
      imageUrls: refreshedData.imageUrls,
      variants: refreshedData.variants,
      options: refreshedData.options,
      colorName: refreshedData.colorName,
      colorHex: refreshedData.colorHex,
    });

    // Record price check
    await ctx.runMutation(internal.scraper.recordPriceCheck, {
      productId: args.productId,
      price: newPrice,
    });

    return {
      updated: true,
      priceChanged,
      oldPrice: priceChanged ? oldPrice : undefined,
      newPrice: priceChanged ? newPrice : undefined,
    };
  },
});

// Internal query to get product by ID
export const getProductById = internalQuery({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.productId);
  },
});

// Internal query to get the last price check
export const getLastPriceCheck = internalQuery({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("price_history")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .order("desc")
      .first();
  },
});

// Internal mutation to update product from refresh
export const updateProductFromRefresh = internalMutation({
  args: {
    productId: v.id("products"),
    price: v.number(),
    originalPrice: v.optional(v.number()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    variants: v.optional(v.array(v.object({
      id: v.string(),
      title: v.string(),
      available: v.boolean(),
      price: v.optional(v.number()),
      option1: v.optional(v.string()),
      option2: v.optional(v.string()),
      option3: v.optional(v.string()),
    }))),
    options: v.optional(v.array(v.object({
      name: v.string(),
      values: v.array(v.string()),
    }))),
    colorName: v.optional(v.string()),
    colorHex: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return;

    const updates: Record<string, unknown> = { price: args.price };

    if (args.originalPrice !== undefined) {
      updates.originalPrice = args.originalPrice;
    }
    if (args.description !== undefined && args.description.length > 0) {
      updates.description = args.description;
    }
    if (args.imageUrl !== undefined) {
      updates.imageUrl = args.imageUrl;
    }
    if (args.imageUrls !== undefined) {
      updates.imageUrls = args.imageUrls;
    }
    if (args.variants !== undefined) {
      updates.variants = args.variants;
    }
    if (args.options !== undefined) {
      updates.options = args.options;
    }
    if (args.colorName !== undefined) {
      updates.colorName = args.colorName;
    }
    if (args.colorHex !== undefined) {
      updates.colorHex = args.colorHex;
    }

    await ctx.db.patch(args.productId, updates);
  },
});

// Internal mutation to upsert a color variant
export const upsertColorVariant = internalMutation({
  args: {
    sourceUrl: v.string(),
    name: v.string(),
    description: v.string(),
    brand: v.string(),
    price: v.number(),
    originalPrice: v.optional(v.number()),
    category: v.string(),
    gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
    condition: v.union(v.literal("new"), v.literal("used"), v.literal("like_new")),
    sourcePlatform: v.string(),
    imageUrl: v.optional(v.string()),
    colorGroupId: v.string(),
    colorName: v.string(),
    colorHex: v.optional(v.string()),
    variants: v.array(v.object({
      id: v.string(),
      title: v.string(),
      available: v.boolean(),
      price: v.optional(v.number()),
      option1: v.optional(v.string()),
      option2: v.optional(v.string()),
      option3: v.optional(v.string()),
    })),
    options: v.optional(v.array(v.object({
      name: v.string(),
      values: v.array(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    // Check if product already exists by sourceUrl
    const existing = await ctx.db
      .query("products")
      .withIndex("by_sourceUrl", (q) => q.eq("sourceUrl", args.sourceUrl))
      .first();

    if (existing) {
      // Update existing product
      await ctx.db.patch(existing._id, {
        price: args.price,
        originalPrice: args.originalPrice,
        description: args.description,
        imageUrl: args.imageUrl,
        variants: args.variants,
        options: args.options,
        colorGroupId: args.colorGroupId,
        colorName: args.colorName,
        colorHex: args.colorHex,
      });
      return { id: existing._id, isNew: false };
    } else {
      // Insert new product
      const id = await ctx.db.insert("products", {
        name: args.name,
        description: args.description,
        brand: args.brand,
        price: args.price,
        originalPrice: args.originalPrice,
        category: args.category,
        gender: args.gender,
        condition: args.condition,
        sourceUrl: args.sourceUrl,
        sourcePlatform: args.sourcePlatform,
        imageUrl: args.imageUrl,
        colorGroupId: args.colorGroupId,
        colorName: args.colorName,
        colorHex: args.colorHex,
        variants: args.variants,
        options: args.options,
      });
      return { id, isNew: true };
    }
  },
});

// Internal mutation to record price check
export const recordPriceCheck = internalMutation({
  args: {
    productId: v.id("products"),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("price_history", {
      productId: args.productId,
      price: args.price,
      checkedAt: Date.now(),
    });
  },
});

// Internal mutation to update all color variants at once
export const updateAllColorVariants = internalMutation({
  args: {
    productId: v.id("products"),
    colorVariants: v.array(v.object({
      colorName: v.string(),
      colorHex: v.optional(v.string()),
      sourceUrl: v.string(),
      imageUrl: v.optional(v.string()),
      imageUrls: v.optional(v.array(v.string())),
      price: v.number(),
      originalPrice: v.optional(v.number()),
      sizes: v.array(v.object({
        size: v.string(),
        available: v.boolean(),
        price: v.optional(v.number()),
        variantId: v.optional(v.string()),
      })),
    })),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      colorVariants: args.colorVariants,
    };
    if (args.description !== undefined && args.description.length > 0) {
      updates.description = args.description;
    }
    await ctx.db.patch(args.productId, updates);
  },
});
