import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add a new product
export const addProduct = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    brand: v.string(),
    price: v.number(),
    material: v.optional(v.string()),
    size: v.optional(v.string()),
    category: v.string(),
    gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
    condition: v.union(v.literal("new"), v.literal("used"), v.literal("like_new")),
    sourceUrl: v.string(),
    sourcePlatform: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("products", args);
  },
});

// Get product by ID
export const getProduct = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// List products with optional filters
export const listProducts = query({
  args: {
    brand: v.optional(v.string()),
    category: v.optional(v.string()),
    condition: v.optional(v.union(v.literal("new"), v.literal("used"), v.literal("like_new"))),
    gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.brand) {
      return await ctx.db.query("products").withIndex("by_brand", (q) => q.eq("brand", args.brand!)).take(limit);
    } else if (args.category) {
      return await ctx.db.query("products").withIndex("by_category", (q) => q.eq("category", args.category!)).take(limit);
    } else if (args.condition) {
      return await ctx.db.query("products").withIndex("by_condition", (q) => q.eq("condition", args.condition!)).take(limit);
    } else if (args.gender) {
      return await ctx.db.query("products").withIndex("by_gender", (q) => q.eq("gender", args.gender!)).take(limit);
    }

    return await ctx.db.query("products").take(limit);
  },
});

// Get all products
export const getAllProducts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});

// Update product price (for price tracking)
export const updatePrice = mutation({
  args: {
    id: v.id("products"),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { price: args.price });
  },
});

// Bulk add products (for importing from scrapers)
export const bulkAddProducts = mutation({
  args: {
    products: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        brand: v.string(),
        price: v.number(),
        material: v.optional(v.string()),
        size: v.optional(v.string()),
        category: v.string(),
        gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
        condition: v.union(v.literal("new"), v.literal("used"), v.literal("like_new")),
        sourceUrl: v.string(),
        sourcePlatform: v.string(),
        imageUrl: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const product of args.products) {
      const id = await ctx.db.insert("products", product);
      ids.push(id);
    }
    return ids;
  },
});

// Delete a product
export const deleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
