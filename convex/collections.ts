import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all collections for a user
export const getCollections = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const collections = await ctx.db
      .query("collections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Get item counts for each collection
    const collectionsWithCounts = await Promise.all(
      collections.map(async (collection) => {
        const items = await ctx.db
          .query("collection_items")
          .withIndex("by_collectionId", (q) => q.eq("collectionId", collection._id))
          .collect();
        return {
          ...collection,
          itemCount: items.length,
        };
      })
    );

    return collectionsWithCounts;
  },
});

// Get all collections for a user by clerkId
export const getCollectionsByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return [];

    const collections = await ctx.db
      .query("collections")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return collections;
  },
});

// Create a new collection by clerkId
export const createCollectionByClerkId = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    const now = Date.now();
    return await ctx.db.insert("collections", {
      userId: user._id,
      name: args.name,
      description: args.description,
      color: args.color || "#6366f1",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get a single collection with its items
export const getCollection = query({
  args: {
    collectionId: v.id("collections"),
  },
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(args.collectionId);
    if (!collection) return null;

    const items = await ctx.db
      .query("collection_items")
      .withIndex("by_collectionId", (q) => q.eq("collectionId", args.collectionId))
      .order("desc")
      .collect();

    // Get product details for each item
    const itemsWithProducts = await Promise.all(
      items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return {
          ...item,
          product,
        };
      })
    );

    return {
      ...collection,
      items: itemsWithProducts.filter((item) => item.product !== null),
    };
  },
});

// Create a new collection
export const createCollection = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("collections", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      color: args.color || "#6366f1",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a collection
export const updateCollection = mutation({
  args: {
    collectionId: v.id("collections"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(args.collectionId);
    if (!collection || collection.userId !== args.userId) {
      throw new Error("Collection not found or access denied");
    }

    const updates: Partial<typeof collection> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.collectionId, updates);
    return { success: true };
  },
});

// Delete a collection
export const deleteCollection = mutation({
  args: {
    collectionId: v.id("collections"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(args.collectionId);
    if (!collection || collection.userId !== args.userId) {
      throw new Error("Collection not found or access denied");
    }

    // Delete all items in the collection
    const items = await ctx.db
      .query("collection_items")
      .withIndex("by_collectionId", (q) => q.eq("collectionId", args.collectionId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.collectionId);
    return { success: true };
  },
});

// Add a product to a collection
export const addToCollection = mutation({
  args: {
    collectionId: v.id("collections"),
    productId: v.id("products"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already in collection
    const existing = await ctx.db
      .query("collection_items")
      .withIndex("by_collectionId_productId", (q) =>
        q.eq("collectionId", args.collectionId).eq("productId", args.productId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("collection_items", {
      collectionId: args.collectionId,
      productId: args.productId,
      addedAt: Date.now(),
      notes: args.notes,
    });
  },
});

// Remove a product from a collection
export const removeFromCollection = mutation({
  args: {
    collectionId: v.id("collections"),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query("collection_items")
      .withIndex("by_collectionId_productId", (q) =>
        q.eq("collectionId", args.collectionId).eq("productId", args.productId)
      )
      .first();

    if (item) {
      await ctx.db.delete(item._id);
    }

    return { success: true };
  },
});

// Update a collection by clerkId
export const updateCollectionByClerkId = mutation({
  args: {
    clerkId: v.string(),
    collectionId: v.id("collections"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    const collection = await ctx.db.get(args.collectionId);
    if (!collection || collection.userId !== user._id) {
      throw new Error("Collection not found or access denied");
    }

    const updates: Partial<typeof collection> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.collectionId, updates);
    return { success: true };
  },
});

// Delete a collection by clerkId
export const deleteCollectionByClerkId = mutation({
  args: {
    clerkId: v.string(),
    collectionId: v.id("collections"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) throw new Error("User not found");

    const collection = await ctx.db.get(args.collectionId);
    if (!collection || collection.userId !== user._id) {
      throw new Error("Collection not found or access denied");
    }

    // Delete all items in the collection
    const items = await ctx.db
      .query("collection_items")
      .withIndex("by_collectionId", (q) => q.eq("collectionId", args.collectionId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Clear collectionId from any outfits in this collection
    const outfits = await ctx.db
      .query("outfit_images")
      .filter((q) => q.eq(q.field("collectionId"), args.collectionId))
      .collect();

    for (const outfit of outfits) {
      await ctx.db.patch(outfit._id, { collectionId: undefined });
    }

    await ctx.db.delete(args.collectionId);
    return { success: true };
  },
});

// Get collections containing a specific product
export const getProductCollections = query({
  args: {
    productId: v.id("products"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all items for this product
    const items = await ctx.db
      .query("collection_items")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .collect();

    // Get the collections and filter by user
    const collections = await Promise.all(
      items.map(async (item) => {
        const collection = await ctx.db.get(item.collectionId);
        return collection;
      })
    );

    return collections.filter(
      (c) => c !== null && c.userId === args.userId
    );
  },
});
