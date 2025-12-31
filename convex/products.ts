import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Add a new product with automatic embedding generation
export const addProduct = action({
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
    // Generate embedding from product text
    const textForEmbedding = [
      args.name,
      args.description,
      args.brand,
      args.category,
      args.material,
      args.gender,
      args.condition,
    ]
      .filter(Boolean)
      .join(" ");

    const embedding = await ctx.runAction(internal.search.generateEmbedding, {
      text: textForEmbedding,
    });

    // Insert product with embedding
    return await ctx.runMutation(internal.products.insertProduct, {
      ...args,
      embedding,
    });
  },
});

// Internal mutation to insert product (called from action)
export const insertProduct = internalMutation({
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
    embedding: v.array(v.float64()),
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
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let query = ctx.db.query("products");

    if (args.brand) {
      query = query.withIndex("by_brand", (q) => q.eq("brand", args.brand!));
    } else if (args.category) {
      query = query.withIndex("by_category", (q) => q.eq("category", args.category!));
    } else if (args.condition) {
      query = query.withIndex("by_condition", (q) => q.eq("condition", args.condition!));
    }

    return await query.take(limit);
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
export const bulkAddProducts = action({
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
    const results = [];

    for (const product of args.products) {
      try {
        // Generate embedding
        const textForEmbedding = [
          product.name,
          product.description,
          product.brand,
          product.category,
          product.material,
          product.gender,
          product.condition,
        ]
          .filter(Boolean)
          .join(" ");

        const embedding = await ctx.runAction(internal.search.generateEmbedding, {
          text: textForEmbedding,
        });

        const id = await ctx.runMutation(internal.products.insertProduct, {
          ...product,
          embedding,
        });
        results.push({ success: true, id, name: product.name });
      } catch (error) {
        results.push({ success: false, name: product.name, error: String(error) });
      }
    }

    return results;
  },
});
