import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Save a search to history
export const saveSearch = mutation({
  args: {
    clerkId: v.optional(v.string()),
    query: v.string(),
    resultCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Get user if clerkId provided
    let userId = undefined;
    const clerkId = args.clerkId;
    if (clerkId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
        .first();
      userId = user?._id;
    }

    // Check for duplicate recent search (within last 5 minutes)
    const recentSearches = clerkId
      ? await ctx.db
          .query("search_history")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
          .order("desc")
          .take(1)
      : [];

    if (
      recentSearches.length > 0 &&
      recentSearches[0].query.toLowerCase() === args.query.toLowerCase() &&
      Date.now() - recentSearches[0].searchedAt < 5 * 60 * 1000
    ) {
      // Skip duplicate
      return null;
    }

    return await ctx.db.insert("search_history", {
      userId,
      clerkId: args.clerkId,
      query: args.query,
      resultCount: args.resultCount,
      searchedAt: Date.now(),
    });
  },
});

// Get recent searches for a user
export const getRecentSearches = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const searches = await ctx.db
      .query("search_history")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .order("desc")
      .take(limit);

    // Deduplicate by query text (keep most recent)
    const seen = new Set<string>();
    const unique = searches.filter((s) => {
      const key = s.query.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique;
  },
});

// Get popular searches (across all users)
export const getPopularSearches = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    // Get recent searches from the last 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const recentSearches = await ctx.db
      .query("search_history")
      .filter((q) => q.gte(q.field("searchedAt"), weekAgo))
      .collect();

    // Count occurrences
    const counts: Record<string, { query: string; count: number; avgResults: number }> = {};

    for (const search of recentSearches) {
      const key = search.query.toLowerCase();
      if (!counts[key]) {
        counts[key] = { query: search.query, count: 0, avgResults: 0 };
      }
      counts[key].count++;
      counts[key].avgResults += search.resultCount;
    }

    // Calculate averages and sort by count
    const popular = Object.values(counts)
      .map((c) => ({
        query: c.query,
        count: c.count,
        avgResults: Math.round(c.avgResults / c.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return popular;
  },
});

// Clear search history for a user
export const clearSearchHistory = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const searches = await ctx.db
      .query("search_history")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .collect();

    for (const search of searches) {
      await ctx.db.delete(search._id);
    }

    return { deleted: searches.length };
  },
});

// Get autocomplete suggestions based on query prefix
export const getAutocompleteSuggestions = query({
  args: {
    clerkId: v.optional(v.string()),
    prefix: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 8;
    const prefix = args.prefix.toLowerCase().trim();

    if (prefix.length < 2) {
      return [];
    }

    const suggestions: { query: string; type: "recent" | "popular" | "product" }[] = [];

    // Get user's recent searches matching prefix
    if (args.clerkId) {
      const recentSearches = await ctx.db
        .query("search_history")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
        .order("desc")
        .take(50);

      const matchingRecent = recentSearches
        .filter((s) => s.query.toLowerCase().includes(prefix))
        .slice(0, 3);

      for (const search of matchingRecent) {
        suggestions.push({ query: search.query, type: "recent" });
      }
    }

    // Get popular searches matching prefix
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const popularSearches = await ctx.db
      .query("search_history")
      .filter((q) => q.gte(q.field("searchedAt"), weekAgo))
      .collect();

    // Count and filter by prefix
    const counts: Record<string, number> = {};
    for (const search of popularSearches) {
      if (search.query.toLowerCase().includes(prefix)) {
        const key = search.query.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    }

    const sortedPopular = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([query]) => ({ query, type: "popular" as const }));

    for (const pop of sortedPopular) {
      if (!suggestions.find((s) => s.query.toLowerCase() === pop.query.toLowerCase())) {
        suggestions.push(pop);
      }
    }

    // Get product names/brands matching prefix
    const products = await ctx.db.query("products").take(200);
    const matchingProducts = new Set<string>();

    for (const product of products) {
      if (product.name.toLowerCase().includes(prefix)) {
        matchingProducts.add(product.name);
      }
      if (product.brand.toLowerCase().includes(prefix)) {
        matchingProducts.add(product.brand);
      }
    }

    const productSuggestions = Array.from(matchingProducts)
      .slice(0, 3)
      .map((query) => ({ query, type: "product" as const }));

    for (const prod of productSuggestions) {
      if (!suggestions.find((s) => s.query.toLowerCase() === prod.query.toLowerCase())) {
        suggestions.push(prod);
      }
    }

    return suggestions.slice(0, limit);
  },
});

// Get suggested searches based on user preferences
export const getSuggestedSearches = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user?.preferences) {
      return [];
    }

    const suggestions: string[] = [];
    const prefs = user.preferences;

    // Add suggestions based on gender preferences
    if (prefs.shopsWomen) {
      suggestions.push(
        "women's boots",
        "women's dresses under $100",
        "vintage designer bags",
        "women's cashmere sweaters"
      );
    }

    if (prefs.shopsMen) {
      suggestions.push(
        "men's leather boots",
        "men's vintage jackets",
        "men's designer sneakers",
        "men's cashmere sweaters"
      );
    }

    // Add size-specific suggestions
    if (prefs.womenShoeSizeMin && prefs.shopsWomen) {
      suggestions.push(`women's shoes size ${prefs.womenShoeSizeMin}`);
    }
    if (prefs.menShoeSizeMin && prefs.shopsMen) {
      suggestions.push(`men's shoes size ${prefs.menShoeSizeMin}`);
    }

    // Shuffle and return top 6
    return suggestions.sort(() => Math.random() - 0.5).slice(0, 6);
  },
});
