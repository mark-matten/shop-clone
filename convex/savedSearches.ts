import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all saved searches for a user
export const getSavedSearches = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const searches = await ctx.db
      .query("saved_searches")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return searches;
  },
});

// Save a new search
export const saveSearch = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    query: v.string(),
    filters: v.optional(v.object({
      brands: v.optional(v.array(v.string())),
      conditions: v.optional(v.array(v.string())),
      priceMin: v.optional(v.string()),
      priceMax: v.optional(v.string()),
      sizes: v.optional(v.array(v.string())),
      platforms: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    const searchId = await ctx.db.insert("saved_searches", {
      userId: args.userId,
      name: args.name,
      query: args.query,
      filters: args.filters,
      createdAt: Date.now(),
    });

    return searchId;
  },
});

// Delete a saved search
export const deleteSavedSearch = mutation({
  args: {
    searchId: v.id("saved_searches"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const search = await ctx.db.get(args.searchId);
    if (!search || search.userId !== args.userId) {
      throw new Error("Saved search not found or access denied");
    }

    await ctx.db.delete(args.searchId);
    return { success: true };
  },
});

// Update a saved search name
export const updateSavedSearch = mutation({
  args: {
    searchId: v.id("saved_searches"),
    userId: v.id("users"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const search = await ctx.db.get(args.searchId);
    if (!search || search.userId !== args.userId) {
      throw new Error("Saved search not found or access denied");
    }

    await ctx.db.patch(args.searchId, { name: args.name });
    return { success: true };
  },
});
