import { internalAction, internalMutation, internalQuery } from "./_generated/server";
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
