import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to generate productKey
function generateProductKey(brand: string, name: string, platform: string): string {
  return `${brand}::${name}::${platform}`;
}

// Color variant schema for validation
const colorVariantSchema = v.object({
  colorName: v.string(),
  colorHex: v.optional(v.string()),
  sourceUrl: v.string(),
  imageUrl: v.optional(v.string()),
  imageUrls: v.optional(v.array(v.string())),
  price: v.number(),
  originalPrice: v.optional(v.number()),
  sizes: v.array(v.object({
    size: v.string(),
    available: v.boolean(),
    price: v.optional(v.number()),
    variantId: v.optional(v.string()),
  })),
});

// Add a new product with colorVariants structure
// Deduplicates by sourceUrl - if a product with any of the sourceUrls already exists, returns existing ID
export const addProduct = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    brand: v.string(),
    category: v.string(),
    gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
    condition: v.union(v.literal("new"), v.literal("used"), v.literal("like_new")),
    material: v.optional(v.string()),
    sourcePlatform: v.string(),
    colorVariants: v.array(colorVariantSchema),
  },
  handler: async (ctx, args) => {
    // Check if any of the colorVariant sourceUrls already exist
    if (args.colorVariants.length > 0) {
      const firstUrl = args.colorVariants[0].sourceUrl;

      // Check legacy sourceUrl index first
      const legacyMatch = await ctx.db
        .query("products")
        .withIndex("by_sourceUrl", (q) => q.eq("sourceUrl", firstUrl))
        .first();

      if (legacyMatch) {
        return legacyMatch._id;
      }

      // Check all products for matching colorVariant sourceUrls
      const products = await ctx.db.query("products").collect();
      const existingMatch = products.find(p =>
        p.colorVariants?.some(cv =>
          args.colorVariants.some(newCv => newCv.sourceUrl === cv.sourceUrl)
        )
      );

      if (existingMatch) {
        return existingMatch._id;
      }
    }

    const productKey = generateProductKey(args.brand, args.name, args.sourcePlatform);
    return await ctx.db.insert("products", {
      ...args,
      productKey,
    });
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

// Get product by productKey (brand::name::platform)
export const getProductByKey = query({
  args: { productKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_productKey", (q) => q.eq("productKey", args.productKey))
      .first();
  },
});

// Get other color variants of the same product (same productKey, different color)
export const getOtherColors = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || !product.productKey) return [];

    // Find all products with the same productKey
    const allColors = await ctx.db
      .query("products")
      .withIndex("by_productKey", (q) => q.eq("productKey", product.productKey!))
      .collect();

    // Filter out the current product and return others
    return allColors
      .filter(p => p._id !== args.productId)
      .map(p => ({
        _id: p._id,
        colorName: p.colorName || "Default",
        colorHex: p.colorHex,
        imageUrl: p.imageUrl,
        price: p.price,
      }));
  },
});

// Find product by any color variant's sourceUrl
export const getProductByColorUrl = query({
  args: { sourceUrl: v.string() },
  handler: async (ctx, args) => {
    // First try legacy sourceUrl index
    const legacyMatch = await ctx.db
      .query("products")
      .withIndex("by_sourceUrl", (q) => q.eq("sourceUrl", args.sourceUrl))
      .first();

    if (legacyMatch) return legacyMatch;

    // Search through colorVariants
    const products = await ctx.db.query("products").collect();
    return products.find(p =>
      p.colorVariants?.some(cv => cv.sourceUrl === args.sourceUrl)
    ) || null;
  },
});

// DEPRECATED: Get related color variants by colorGroupId
// Use getProduct and access colorVariants array instead
export const getColorVariants = query({
  args: { colorGroupId: v.string() },
  handler: async (ctx, args) => {
    // For backwards compatibility, return products with this colorGroupId
    // These should have been migrated to colorVariants already
    return await ctx.db
      .query("products")
      .withIndex("by_colorGroupId", (q) => q.eq("colorGroupId", args.colorGroupId))
      .collect();
  },
});

// Update product price (for price tracking)
// Supports both legacy price field and new colorVariants structure
export const updatePrice = mutation({
  args: {
    id: v.id("products"),
    price: v.number(),
    colorName: v.optional(v.string()), // Which color variant to update
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) throw new Error("Product not found");

    // If product has colorVariants, update the specific variant's price
    if (product.colorVariants && product.colorVariants.length > 0) {
      const updatedVariants = product.colorVariants.map(cv => {
        if (args.colorName && cv.colorName === args.colorName) {
          return { ...cv, price: args.price };
        } else if (!args.colorName) {
          // Update first variant if no colorName specified
          return cv;
        }
        return cv;
      });

      // If no colorName specified, update the first variant
      if (!args.colorName && updatedVariants.length > 0) {
        updatedVariants[0] = { ...updatedVariants[0], price: args.price };
      }

      return await ctx.db.patch(args.id, { colorVariants: updatedVariants });
    }

    // Legacy: update the price field directly
    return await ctx.db.patch(args.id, { price: args.price });
  },
});

// Bulk add products (for importing from scrapers)
// Deduplicates by sourceUrl - skips products that already exist
export const bulkAddProducts = mutation({
  args: {
    products: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        brand: v.string(),
        price: v.number(),
        originalPrice: v.optional(v.number()),
        material: v.optional(v.string()),
        size: v.optional(v.string()),
        sizes: v.optional(v.array(v.string())),
        category: v.string(),
        gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
        condition: v.union(v.literal("new"), v.literal("used"), v.literal("like_new")),
        sourceUrl: v.string(),
        sourcePlatform: v.string(),
        imageUrl: v.optional(v.string()),
        imageUrls: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results: { id: string; action: "inserted" | "skipped" }[] = [];

    for (const product of args.products) {
      // Check if product already exists by sourceUrl
      const existing = await ctx.db
        .query("products")
        .withIndex("by_sourceUrl", (q) => q.eq("sourceUrl", product.sourceUrl))
        .first();

      if (existing) {
        results.push({ id: existing._id, action: "skipped" });
      } else {
        const id = await ctx.db.insert("products", product);
        results.push({ id, action: "inserted" });
      }
    }

    return results;
  },
});

// Delete a product
export const deleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Fix Depop image URLs (P10 -> P0 for better quality)
export const fixDepopImages = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let updated = 0;

    for (const product of products) {
      if (product.sourcePlatform === "Depop" && product.imageUrl) {
        let newUrl = product.imageUrl;
        if (newUrl.includes("/P10.jpg")) {
          newUrl = newUrl.replace("/P10.jpg", "/P0.jpg");
        } else if (newUrl.includes("/P8.jpg")) {
          newUrl = newUrl.replace("/P8.jpg", "/P0.jpg");
        }

        if (newUrl !== product.imageUrl) {
          await ctx.db.patch(product._id, { imageUrl: newUrl });
          updated++;
        }
      }
    }

    return { updated, total: products.length };
  },
});

// Debug: Search products and show colorGroupId info
export const debugColorGroups = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const products = await ctx.db.query("products").collect();
    const matches = products.filter(p =>
      p.name.toLowerCase().includes(args.searchTerm.toLowerCase())
    );
    return matches.map(p => ({
      _id: p._id,
      name: p.name,
      colorGroupId: p.colorGroupId || "NOT SET",
      colorName: p.colorName || "NOT SET",
      brand: p.brand,
    }));
  },
});

// Fix colorGroupId for products that should be grouped together
// Groups products by name + brand and assigns same colorGroupId to all variants
export const fixColorGroups = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();

    // Group products by normalized name + brand
    const groups = new Map<string, typeof products>();

    for (const product of products) {
      // Normalize name: remove color mentions, trim, lowercase
      const normalizedName = product.name
        .toLowerCase()
        .trim();
      const key = `${product.brand.toLowerCase()}::${normalizedName}`;

      const existing = groups.get(key);
      if (existing) {
        existing.push(product);
      } else {
        groups.set(key, [product]);
      }
    }

    let updatedCount = 0;
    let groupCount = 0;

    // Process each group
    for (const [key, groupProducts] of groups) {
      // Only process groups with multiple products (color variants)
      if (groupProducts.length > 1) {
        groupCount++;

        // Find an existing colorGroupId or generate a new one
        let colorGroupId = groupProducts.find(p => p.colorGroupId)?.colorGroupId;
        if (!colorGroupId) {
          // Generate a new colorGroupId based on the first product's ID
          colorGroupId = `group_${groupProducts[0]._id.slice(-8)}`;
        }

        // Update all products in the group to have the same colorGroupId
        for (const product of groupProducts) {
          if (product.colorGroupId !== colorGroupId) {
            await ctx.db.patch(product._id, { colorGroupId });
            updatedCount++;
          }
        }
      }
    }

    return {
      groupsFound: groupCount,
      productsUpdated: updatedCount,
    };
  },
});

// Delete all products from a specific platform
export const deleteByPlatform = mutation({
  args: { platform: v.string() },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_sourcePlatform", (q) => q.eq("sourcePlatform", args.platform))
      .collect();

    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    return products.length;
  },
});

// Upsert a product with colorVariants - update if exists (by productKey), insert if not
export const upsertProduct = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    brand: v.string(),
    category: v.string(),
    gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
    condition: v.union(v.literal("new"), v.literal("used"), v.literal("like_new")),
    material: v.optional(v.string()),
    sourcePlatform: v.string(),
    colorVariants: v.array(colorVariantSchema),
  },
  handler: async (ctx, args) => {
    const productKey = generateProductKey(args.brand, args.name, args.sourcePlatform);

    // Check if product already exists by productKey
    const existing = await ctx.db
      .query("products")
      .withIndex("by_productKey", (q) => q.eq("productKey", productKey))
      .first();

    if (existing) {
      // Merge colorVariants: update existing colors, add new ones
      const existingVariants = existing.colorVariants || [];
      const existingColorNames = new Set(existingVariants.map(cv => cv.colorName));
      const updatedVariants = [...existingVariants];

      for (const newVariant of args.colorVariants) {
        const existingIndex = updatedVariants.findIndex(
          cv => cv.colorName === newVariant.colorName
        );
        if (existingIndex >= 0) {
          // Update existing color variant
          updatedVariants[existingIndex] = newVariant;
        } else {
          // Add new color variant
          updatedVariants.push(newVariant);
        }
      }

      await ctx.db.patch(existing._id, {
        colorVariants: updatedVariants,
        description: args.description,
        material: args.material,
        gender: args.gender,
      });
      return { id: existing._id, action: "updated" as const };
    } else {
      // Insert new product
      const id = await ctx.db.insert("products", {
        ...args,
        productKey,
      });
      return { id, action: "inserted" as const };
    }
  },
});

// Find duplicate products by sourceUrl
export const findDuplicates = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();

    // Group by sourceUrl
    const urlGroups = new Map<string, typeof products>();

    for (const product of products) {
      const url = product.sourceUrl;
      if (!url) continue;

      const existing = urlGroups.get(url);
      if (existing) {
        existing.push(product);
      } else {
        urlGroups.set(url, [product]);
      }
    }

    // Find groups with duplicates
    const duplicates: { sourceUrl: string; count: number; ids: string[] }[] = [];

    for (const [url, group] of urlGroups) {
      if (group.length > 1) {
        duplicates.push({
          sourceUrl: url,
          count: group.length,
          ids: group.map(p => p._id),
        });
      }
    }

    return {
      totalProducts: products.length,
      duplicateGroups: duplicates.length,
      totalDuplicates: duplicates.reduce((sum, d) => sum + d.count - 1, 0),
      duplicates,
    };
  },
});

// Remove duplicate products by ID list - pass in the IDs to delete
export const removeDuplicatesById = mutation({
  args: {
    idsToDelete: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    let deletedCount = 0;

    for (const idStr of args.idsToDelete) {
      try {
        // Cast string to Id type
        const id = idStr as unknown as typeof args.idsToDelete[0];
        await ctx.db.delete(id as any);
        deletedCount++;
      } catch (e) {
        // Skip if already deleted or invalid
      }
    }

    return {
      deletedCount,
      message: `Deleted ${deletedCount} products`,
    };
  },
});

// Remove duplicate products - keeps the oldest one (first by _creationTime)
// Batched version to avoid hitting limits - uses index for pagination
export const removeDuplicates = mutation({
  args: {
    batchSize: v.optional(v.number()),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;

    // Get products by platform to avoid loading everything
    let products;
    if (args.platform) {
      products = await ctx.db
        .query("products")
        .withIndex("by_sourcePlatform", (q) => q.eq("sourcePlatform", args.platform!))
        .collect();
    } else {
      // Get a sample of products
      products = await ctx.db.query("products").take(5000);
    }

    // Group by sourceUrl
    const urlGroups = new Map<string, typeof products>();

    for (const product of products) {
      const url = product.sourceUrl;
      if (!url) continue;

      const existing = urlGroups.get(url);
      if (existing) {
        existing.push(product);
      } else {
        urlGroups.set(url, [product]);
      }
    }

    let deletedCount = 0;
    let processedGroups = 0;

    // Process each group with duplicates (limited by batchSize)
    for (const [url, group] of urlGroups) {
      if (group.length > 1 && deletedCount < batchSize) {
        processedGroups++;

        // Sort by creation time (oldest first)
        group.sort((a, b) => a._creationTime - b._creationTime);

        // Keep the first (oldest), delete the rest
        for (let i = 1; i < group.length && deletedCount < batchSize; i++) {
          await ctx.db.delete(group[i]._id);
          deletedCount++;
        }
      }
    }

    // Count remaining duplicates
    const remainingDuplicates = Array.from(urlGroups.values()).filter(g => g.length > 1).length - processedGroups;

    return {
      deletedCount,
      remainingDuplicateGroups: Math.max(0, remainingDuplicates),
      message: `Deleted ${deletedCount} duplicate products. ${remainingDuplicates > 0 ? `Run again to process more.` : "All duplicates removed."}`,
    };
  },
});

// Legacy upsert for backwards compatibility during transition
export const upsertProductLegacy = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    brand: v.string(),
    price: v.number(),
    originalPrice: v.optional(v.number()),
    material: v.optional(v.string()),
    size: v.optional(v.string()),
    sizes: v.optional(v.array(v.string())),
    variants: v.optional(v.array(v.object({
      id: v.string(),
      title: v.string(),
      available: v.boolean(),
      price: v.optional(v.number()),
      option1: v.optional(v.string()),
      option2: v.optional(v.string()),
      option3: v.optional(v.string()),
    }))),
    options: v.optional(v.array(v.object({
      name: v.string(),
      values: v.array(v.string()),
    }))),
    colorGroupId: v.optional(v.string()),
    colorName: v.optional(v.string()),
    colorHex: v.optional(v.string()),
    category: v.string(),
    gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
    condition: v.union(v.literal("new"), v.literal("used"), v.literal("like_new")),
    sourceUrl: v.string(),
    sourcePlatform: v.string(),
    imageUrl: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Check if product already exists by sourceUrl
    const existing = await ctx.db
      .query("products")
      .withIndex("by_sourceUrl", (q) => q.eq("sourceUrl", args.sourceUrl))
      .first();

    if (existing) {
      const updates: Record<string, unknown> = {
        price: args.price,
        originalPrice: args.originalPrice,
        variants: args.variants,
        imageUrl: args.imageUrl,
        imageUrls: args.imageUrls,
      };
      if (args.colorHex !== undefined) {
        updates.colorHex = args.colorHex;
      }
      if (args.colorName !== undefined) {
        updates.colorName = args.colorName;
      }
      if (args.colorGroupId !== undefined) {
        updates.colorGroupId = args.colorGroupId;
      }
      await ctx.db.patch(existing._id, updates);
      return { id: existing._id, action: "updated" as const };
    } else {
      const id = await ctx.db.insert("products", args);
      return { id, action: "inserted" as const };
    }
  },
});
