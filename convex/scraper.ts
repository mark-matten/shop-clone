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
      // Simulate price fluctuation (5% chance of price change)
      if (Math.random() < 0.05) {
        const priceChange = (Math.random() - 0.5) * 0.2; // -10% to +10%
        const newPrice = Math.round(product.price * (1 + priceChange) * 100) / 100;

        await ctx.runMutation(internal.scraper.updateProductPrice, {
          productId: product._id,
          oldPrice: product.price,
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
export const updateProductPrice = internalMutation({
  args: {
    productId: v.id("products"),
    oldPrice: v.number(),
    newPrice: v.number(),
  },
  handler: async (ctx, args) => {
    // Update the product price
    await ctx.db.patch(args.productId, { price: args.newPrice });

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

// Interface for refreshed product data
interface RefreshedProductData {
  price?: number;
  originalPrice?: number;
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

    // Build variants array - fetch availability from HTML page
    let variants: RefreshedProductData['variants'];

    // Try to get availability from HTML page
    try {
      const htmlResponse = await fetch(sourceUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html",
        },
      });

      if (htmlResponse.ok) {
        const html = await htmlResponse.text();
        const variantMatch = html.match(/window\.OnwardWalletsCurrentProduct\s*=\s*(\{[\s\S]*?\});?\s*(?:window\.|<\/script>)/);

        if (variantMatch) {
          const productData = JSON.parse(variantMatch[1]);
          if (productData.variants && Array.isArray(productData.variants)) {
            const availabilityMap = new Map<number, boolean>();
            for (const v of productData.variants) {
              availabilityMap.set(v.id, v.available ?? true);
            }

            variants = product.variants.map((v: { id: number; title: string; price: string; option1: string | null; option2: string | null; option3: string | null }) => ({
              id: v.id.toString(),
              title: v.title,
              available: availabilityMap.get(v.id) ?? true,
              price: parseFloat(v.price),
              option1: v.option1 || undefined,
              option2: v.option2 || undefined,
              option3: v.option3 || undefined,
            }));
          }
        }
      }
    } catch {
      // Fall back to assuming all variants available
    }

    // If we didn't get availability data, assume all available
    if (!variants) {
      variants = product.variants.map((v: { id: number; title: string; price: string; option1: string | null; option2: string | null; option3: string | null }) => ({
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
    const options = product.options
      ?.filter((opt: { name: string; values: string[] }) => opt.name !== 'Title' && opt.values.length > 0)
      ?.map((opt: { name: string; values: string[] }) => ({
        name: opt.name,
        values: opt.values,
      }));

    return {
      price,
      originalPrice,
      variants,
      options: options?.length > 0 ? options : undefined,
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

    // Fetch fresh data based on platform
    let refreshedData: RefreshedProductData | null = null;
    const platform = product.sourcePlatform?.toLowerCase() || "";

    if (platform.includes("everlane")) {
      refreshedData = await fetchEverlaneProduct(product.sourceUrl);
    } else if (platform.includes("jcrew") || platform.includes("j.crew") || platform.includes("j crew")) {
      refreshedData = await fetchJCrewProduct(product.sourceUrl);
    }
    // Add more platforms as needed

    if (!refreshedData || refreshedData.price === undefined) {
      // Still record the check to avoid hammering the source
      await ctx.runMutation(internal.scraper.recordPriceCheck, {
        productId: args.productId,
        price: product.price,
      });
      return { updated: false, priceChanged: false };
    }

    const oldPrice = product.price;
    const newPrice = refreshedData.price;
    const priceChanged = Math.abs(oldPrice - newPrice) > 0.01;

    // Update the product
    await ctx.runMutation(internal.scraper.updateProductFromRefresh, {
      productId: args.productId,
      price: newPrice,
      originalPrice: refreshedData.originalPrice,
      variants: refreshedData.variants,
      options: refreshedData.options,
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
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { price: args.price };

    if (args.originalPrice !== undefined) {
      updates.originalPrice = args.originalPrice;
    }
    if (args.variants !== undefined) {
      updates.variants = args.variants;
    }
    if (args.options !== undefined) {
      updates.options = args.options;
    }

    await ctx.db.patch(args.productId, updates);
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
