import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add a product to favorites
export const addFavorite = mutation({
  args: {
    clerkId: v.string(),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    // Get user by clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if already favorited
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_userId_productId", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("favorites", {
      userId: user._id,
      productId: args.productId,
      createdAt: Date.now(),
    });
  },
});

// Remove a product from favorites
export const removeFavorite = mutation({
  args: {
    clerkId: v.string(),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_userId_productId", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId)
      )
      .first();

    if (favorite) {
      await ctx.db.delete(favorite._id);
    }
  },
});

// Get all favorites for a user
export const getFavorites = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    // Fetch full product details
    const favoritesWithProducts = await Promise.all(
      favorites.map(async (fav) => {
        const product = await ctx.db.get(fav.productId);
        return {
          ...fav,
          product,
        };
      })
    );

    return favoritesWithProducts.filter((f) => f.product !== null);
  },
});

// Check if a product is favorited by user
export const isFavorite = query({
  args: {
    clerkId: v.string(),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return false;
    }

    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_userId_productId", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId)
      )
      .first();

    return favorite !== null;
  },
});

// Get all favorite product IDs for a user (for efficient batch checking)
export const getFavoriteIds = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    return favorites.map((f) => f.productId);
  },
});

// Toggle favorite status
export const toggleFavorite = mutation({
  args: {
    clerkId: v.string(),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_userId_productId", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { isFavorite: false };
    } else {
      await ctx.db.insert("favorites", {
        userId: user._id,
        productId: args.productId,
        createdAt: Date.now(),
      });
      return { isFavorite: true };
    }
  },
});
