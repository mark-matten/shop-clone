import { v } from "convex/values";
import { query } from "./_generated/server";

// Helper to get price from product (handles both new colorVariants and legacy structure)
function getProductPrice(product: { colorVariants?: Array<{ price: number }> | null; price?: number }): number | undefined {
  if (product.colorVariants && product.colorVariants.length > 0) {
    return product.colorVariants[0].price;
  }
  return product.price;
}

// Get personalized product recommendations for a user
export const getRecommendations = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      // Return random products for non-users
      const products = await ctx.db.query("products").take(limit);
      return { products, reason: "popular" };
    }

    const prefs = user.preferences;

    // Get user's favorites to understand their taste
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(20);

    const favoriteProductIds = favorites.map((f) => f.productId);

    // Get favorite products to analyze patterns
    const favoriteProducts = await Promise.all(
      favoriteProductIds.slice(0, 5).map((id) => ctx.db.get(id))
    );

    // Extract preferred brands and categories from favorites
    const preferredBrands = new Set<string>();
    const preferredCategories = new Set<string>();

    for (const product of favoriteProducts) {
      if (product) {
        preferredBrands.add(product.brand);
        preferredCategories.add(product.category);
      }
    }

    // Build recommendations based on preferences and favorites
    let recommendations: any[] = [];

    // Get products matching user's gender preferences
    const genderFilters: ("men" | "women" | "unisex")[] = [];
    if (prefs?.shopsMen) genderFilters.push("men", "unisex");
    if (prefs?.shopsWomen) genderFilters.push("women", "unisex");

    // If we have preferred brands, get products from those brands
    if (preferredBrands.size > 0) {
      for (const brand of Array.from(preferredBrands).slice(0, 3)) {
        const brandProducts = await ctx.db
          .query("products")
          .withIndex("by_brand", (q) => q.eq("brand", brand))
          .take(5);

        const filtered = brandProducts.filter(
          (p) =>
            !favoriteProductIds.includes(p._id) &&
            (genderFilters.length === 0 || !p.gender || genderFilters.includes(p.gender))
        );

        recommendations.push(...filtered);
      }
    }

    // If we have preferred categories, get products from those categories
    if (preferredCategories.size > 0) {
      for (const category of Array.from(preferredCategories).slice(0, 3)) {
        const categoryProducts = await ctx.db
          .query("products")
          .withIndex("by_category", (q) => q.eq("category", category))
          .take(5);

        const filtered = categoryProducts.filter(
          (p) =>
            !favoriteProductIds.includes(p._id) &&
            !recommendations.some((r) => r._id === p._id) &&
            (genderFilters.length === 0 || !p.gender || genderFilters.includes(p.gender))
        );

        recommendations.push(...filtered);
      }
    }

    // If still not enough, add some random products matching gender preference
    if (recommendations.length < limit) {
      const additionalProducts = await ctx.db.query("products").take(50);

      const filtered = additionalProducts.filter(
        (p) =>
          !favoriteProductIds.includes(p._id) &&
          !recommendations.some((r) => r._id === p._id) &&
          (genderFilters.length === 0 || !p.gender || genderFilters.includes(p.gender))
      );

      recommendations.push(...filtered.slice(0, limit - recommendations.length));
    }

    // Shuffle and limit
    const shuffled = recommendations.sort(() => Math.random() - 0.5).slice(0, limit);

    return {
      products: shuffled,
      reason: preferredBrands.size > 0 ? "based_on_favorites" : "based_on_preferences",
    };
  },
});

// Get similar products to a given product
export const getSimilarProducts = query({
  args: {
    productId: v.id("products"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 6;

    const product = await ctx.db.get(args.productId);
    if (!product) return [];

    // Helper to check gender compatibility
    // Products must match gender OR be unisex OR have undefined gender
    const isGenderCompatible = (p: { gender?: "men" | "women" | "unisex" | null }) => {
      // If current product has no gender, all products are compatible
      if (!product.gender) return true;
      // If candidate has no gender or is unisex, it's compatible
      if (!p.gender || p.gender === "unisex") return true;
      // If current product is unisex, all gendered products are compatible
      if (product.gender === "unisex") return true;
      // Otherwise, genders must match
      return p.gender === product.gender;
    };

    // Get products from same category (prioritize this)
    const categoryProducts = await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("category", product.category))
      .take(40);

    // Get products from same brand
    const brandProducts = await ctx.db
      .query("products")
      .withIndex("by_brand", (q) => q.eq("brand", product.brand))
      .take(20);

    // Combine and filter out the current product + filter by gender
    const combined = [...categoryProducts, ...brandProducts].filter(
      (p) => p._id !== args.productId && isGenderCompatible(p)
    );

    // Deduplicate
    const seen = new Set<string>();
    const unique = combined.filter((p) => {
      const id = p._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // Score by similarity - prioritize category, material, then brand
    const scored = unique.map((p) => {
      let score = 0;

      // Category match (highest priority)
      if (p.category === product.category) score += 4;

      // Material match (second priority)
      if (product.material && p.material &&
          p.material.toLowerCase() === product.material.toLowerCase()) {
        score += 3;
      }

      // Same brand bonus
      if (p.brand === product.brand) score += 2;

      // Similar price range bonus
      const pPrice = getProductPrice(p);
      const productPrice = getProductPrice(product);
      if (pPrice !== undefined && productPrice !== undefined) {
        const priceDiff = Math.abs(pPrice - productPrice);
        if (priceDiff < 25) score += 2;
        else if (priceDiff < 50) score += 1;
      }

      return { product: p, score };
    });

    // Sort by score and return top items
    const sorted = scored.sort((a, b) => b.score - a.score);

    return sorted.slice(0, limit).map((s) => s.product);
  },
});

// Get trending products (most favorited/tracked recently)
export const getTrendingProducts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    // Get recent favorites (last 7 days)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const recentFavorites = await ctx.db
      .query("favorites")
      .filter((q) => q.gte(q.field("createdAt"), weekAgo))
      .collect();

    // Count favorites per product
    const favoriteCounts: Record<string, number> = {};
    for (const fav of recentFavorites) {
      const id = fav.productId.toString();
      favoriteCounts[id] = (favoriteCounts[id] || 0) + 1;
    }

    // Sort by count and get top products
    const sortedIds = Object.entries(favoriteCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    // Fetch product details
    const products = await Promise.all(
      sortedIds.map(async (id) => {
        try {
          return await ctx.db.get(id as any);
        } catch {
          return null;
        }
      })
    );

    const validProducts = products.filter((p) => p !== null);

    // If not enough trending, fill with random products
    if (validProducts.length < limit) {
      const additional = await ctx.db.query("products").take(limit - validProducts.length);
      validProducts.push(...additional);
    }

    return validProducts;
  },
});
