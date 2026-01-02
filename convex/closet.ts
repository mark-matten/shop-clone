import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add a product to closet (I own this)
export const addToCloset = mutation({
  args: {
    clerkId: v.string(),
    productId: v.id("products"),
    notes: v.optional(v.string()),
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

    // Check if already in closet
    const existing = await ctx.db
      .query("closet_items")
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

    return await ctx.db.insert("closet_items", {
      userId: user._id,
      productId: args.productId,
      addedAt: Date.now(),
      notes: args.notes,
      wornCount: 0,
      selectedOptions: args.selectedOptions,
    });
  },
});

// Remove a product from closet
export const removeFromCloset = mutation({
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

    const item = await ctx.db
      .query("closet_items")
      .withIndex("by_userId_productId", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId)
      )
      .first();

    if (item) {
      await ctx.db.delete(item._id);
    }
  },
});

// Toggle closet status
export const toggleCloset = mutation({
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
      .query("closet_items")
      .withIndex("by_userId_productId", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { isInCloset: false };
    } else {
      await ctx.db.insert("closet_items", {
        userId: user._id,
        productId: args.productId,
        addedAt: Date.now(),
        wornCount: 0,
        selectedOptions: args.selectedOptions,
      });
      return { isInCloset: true };
    }
  },
});

// Get all closet items for a user
export const getClosetItems = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    const closetItems = await ctx.db
      .query("closet_items")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    // Fetch product details for each closet item
    const itemsWithProducts = await Promise.all(
      closetItems.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return {
          ...item,
          product,
        };
      })
    );

    // Filter out items where product no longer exists and sort by addedAt
    return itemsWithProducts
      .filter((item) => item.product !== null)
      .sort((a, b) => b.addedAt - a.addedAt);
  },
});

// Get closet item IDs for checking ownership status
export const getClosetItemIds = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    const closetItems = await ctx.db
      .query("closet_items")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    return closetItems.map((item) => item.productId);
  },
});

// Check if a specific product is in closet
export const isInCloset = query({
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

    const item = await ctx.db
      .query("closet_items")
      .withIndex("by_userId_productId", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId)
      )
      .first();

    return item !== null;
  },
});

// Update worn count
export const markAsWorn = mutation({
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

    const item = await ctx.db
      .query("closet_items")
      .withIndex("by_userId_productId", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId)
      )
      .first();

    if (item) {
      await ctx.db.patch(item._id, {
        wornCount: (item.wornCount || 0) + 1,
        lastWorn: Date.now(),
      });
    }
  },
});

// Update closet item options (size, color, category)
export const updateClosetItemOptions = mutation({
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

    const item = await ctx.db
      .query("closet_items")
      .withIndex("by_userId_productId", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId)
      )
      .first();

    if (item) {
      const updates: { selectedOptions: Record<string, string>; customCategory?: string } = {
        selectedOptions: args.selectedOptions,
      };
      if (args.customCategory !== undefined) {
        updates.customCategory = args.customCategory;
      }
      await ctx.db.patch(item._id, updates);
    }
  },
});

// Update closet item category (for drag-and-drop)
export const updateClosetItemCategory = mutation({
  args: {
    clerkId: v.string(),
    productId: v.id("products"),
    customCategory: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const item = await ctx.db
      .query("closet_items")
      .withIndex("by_userId_productId", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId)
      )
      .first();

    if (item) {
      await ctx.db.patch(item._id, {
        customCategory: args.customCategory,
      });
    }
  },
});

// Update sort order for multiple items (for drag-and-drop reordering)
export const updateClosetItemsOrder = mutation({
  args: {
    clerkId: v.string(),
    items: v.array(v.object({
      productId: v.id("products"),
      sortOrder: v.number(),
      customCategory: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    for (const update of args.items) {
      const item = await ctx.db
        .query("closet_items")
        .withIndex("by_userId_productId", (q) =>
          q.eq("userId", user._id).eq("productId", update.productId)
        )
        .first();

      if (item) {
        const patchData: { sortOrder: number; customCategory?: string } = {
          sortOrder: update.sortOrder,
        };
        if (update.customCategory !== undefined) {
          patchData.customCategory = update.customCategory;
        }
        await ctx.db.patch(item._id, patchData);
      }
    }
  },
});

// Get closet stats
export const getClosetStats = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return { totalItems: 0, totalValue: 0, categories: {} };
    }

    const closetItems = await ctx.db
      .query("closet_items")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const products = await Promise.all(
      closetItems.map((item) => ctx.db.get(item.productId))
    );

    const validProducts = products.filter((p) => p !== null);

    const totalValue = validProducts.reduce((sum, p) => sum + (p?.price || 0), 0);

    const categories: Record<string, number> = {};
    for (const product of validProducts) {
      if (product) {
        categories[product.category] = (categories[product.category] || 0) + 1;
      }
    }

    return {
      totalItems: validProducts.length,
      totalValue,
      categories,
    };
  },
});
