import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add a product to favorites
export const addFavorite = mutation({
  args: {
    clerkId: v.string(),
    productId: v.id("products"),
    selectedOptions: v.optional(v.record(v.string(), v.string())),
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
      // Update selected options if provided
      if (args.selectedOptions && Object.keys(args.selectedOptions).length > 0) {
        await ctx.db.patch(existing._id, { selectedOptions: args.selectedOptions });
      }
      return existing._id;
    }

    return await ctx.db.insert("favorites", {
      userId: user._id,
      productId: args.productId,
      createdAt: Date.now(),
      selectedOptions: args.selectedOptions,
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

// Get all favorites combined with tracked items for a user
export const getFavoritesWithTracking = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    // Get favorites
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    // Get tracked items
    const trackedItems = await ctx.db
      .query("tracked_items")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    // Create a map to combine items (tracked items can also be favorites)
    const itemMap = new Map<string, {
      productId: typeof favorites[0]["productId"];
      selectedOptions?: Record<string, string>;
      isFavorite: boolean;
      isTracking: boolean;
      targetPrice?: number;
      createdAt: number;
    }>();

    // Add favorites to map
    for (const fav of favorites) {
      itemMap.set(fav.productId, {
        productId: fav.productId,
        selectedOptions: fav.selectedOptions,
        isFavorite: true,
        isTracking: false,
        createdAt: fav.createdAt,
      });
    }

    // Add tracked items to map (merge with existing favorites)
    for (const tracked of trackedItems) {
      const existing = itemMap.get(tracked.productId);
      if (existing) {
        // Merge: item is both favorited and tracked
        existing.isTracking = true;
        existing.targetPrice = tracked.targetPrice;
        // Use tracked selectedOptions if favorite doesn't have them
        if (!existing.selectedOptions && tracked.selectedOptions) {
          existing.selectedOptions = tracked.selectedOptions;
        }
      } else {
        // Item is only tracked, not favorited
        itemMap.set(tracked.productId, {
          productId: tracked.productId,
          selectedOptions: tracked.selectedOptions,
          isFavorite: false,
          isTracking: true,
          targetPrice: tracked.targetPrice,
          createdAt: tracked.createdAt,
        });
      }
    }

    // Fetch product details for all items
    const itemsWithProducts = await Promise.all(
      Array.from(itemMap.values()).map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return {
          ...item,
          product,
        };
      })
    );

    // Filter out items where product no longer exists and sort by createdAt
    return itemsWithProducts
      .filter((item) => item.product !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Update favorite item options (size, color, category)
export const updateFavoriteOptions = mutation({
  args: {
    clerkId: v.string(),
    productId: v.id("products"),
    selectedOptions: v.record(v.string(), v.string()),
    customCategory: v.optional(v.string()),
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
      const updates: { selectedOptions: Record<string, string>; customCategory?: string } = {
        selectedOptions: args.selectedOptions,
      };
      if (args.customCategory !== undefined) {
        updates.customCategory = args.customCategory;
      }
      await ctx.db.patch(favorite._id, updates);
    }
  },
});

// Toggle favorite status
export const toggleFavorite = mutation({
  args: {
    clerkId: v.string(),
    productId: v.id("products"),
    selectedOptions: v.optional(v.record(v.string(), v.string())),
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
        selectedOptions: args.selectedOptions,
      });
      return { isFavorite: true };
    }
  },
});
