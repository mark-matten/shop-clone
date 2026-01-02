import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Track a product for price changes
export const trackProduct = mutation({
  args: {
    userId: v.id("users"),
    productId: v.id("products"),
    targetPrice: v.optional(v.number()),
    selectedOptions: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    // Check if already tracking
    const existing = await ctx.db
      .query("tracked_items")
      .withIndex("by_userId_productId", (q) =>
        q.eq("userId", args.userId).eq("productId", args.productId)
      )
      .first();

    if (existing) {
      // Update target price and selected options if provided
      const updates: { targetPrice?: number; selectedOptions?: Record<string, string> } = {};
      if (args.targetPrice !== undefined) {
        updates.targetPrice = args.targetPrice;
      }
      if (args.selectedOptions && Object.keys(args.selectedOptions).length > 0) {
        updates.selectedOptions = args.selectedOptions;
      }
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existing._id, updates);
      }
      return existing._id;
    }

    return await ctx.db.insert("tracked_items", {
      userId: args.userId,
      productId: args.productId,
      targetPrice: args.targetPrice,
      createdAt: Date.now(),
      selectedOptions: args.selectedOptions,
    });
  },
});

// Untrack a product
export const untrackProduct = mutation({
  args: {
    userId: v.id("users"),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const tracked = await ctx.db
      .query("tracked_items")
      .withIndex("by_userId_productId", (q) =>
        q.eq("userId", args.userId).eq("productId", args.productId)
      )
      .first();

    if (tracked) {
      await ctx.db.delete(tracked._id);
    }
  },
});

// Get all tracked items for a user
export const getTrackedItems = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const trackedItems = await ctx.db
      .query("tracked_items")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Fetch full product details for each tracked item
    const itemsWithProducts = await Promise.all(
      trackedItems.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        const priceHistory = await ctx.db
          .query("price_history")
          .withIndex("by_productId", (q) => q.eq("productId", item.productId))
          .order("desc")
          .take(10);

        return {
          ...item,
          product,
          priceHistory,
        };
      })
    );

    return itemsWithProducts;
  },
});

// Get price history for a product
export const getPriceHistory = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("price_history")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .order("desc")
      .take(30);
  },
});

// Internal mutation to record a price check
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

// Internal mutation to update product price
export const updateProductPrice = internalMutation({
  args: {
    productId: v.id("products"),
    newPrice: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, { price: args.newPrice });
  },
});

// Get all unique tracked product IDs (for cron job)
export const getAllTrackedProductIds = query({
  args: {},
  handler: async (ctx) => {
    const trackedItems = await ctx.db.query("tracked_items").collect();
    const uniqueProductIds = [...new Set(trackedItems.map((item) => item.productId))];
    return uniqueProductIds;
  },
});
