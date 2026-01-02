import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add a new product
export const addProduct = mutation({
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

// Get related color variants by colorGroupId
export const getColorVariants = query({
  args: { colorGroupId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_colorGroupId", (q) => q.eq("colorGroupId", args.colorGroupId))
      .collect();
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

// Upsert a product - update if exists (by sourceUrl), insert if not
export const upsertProduct = mutation({
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
      // Update only price, originalPrice, variants (availability), and images
      await ctx.db.patch(existing._id, {
        price: args.price,
        originalPrice: args.originalPrice,
        variants: args.variants,
        imageUrl: args.imageUrl,
        imageUrls: args.imageUrls,
      });
      return { id: existing._id, action: "updated" as const };
    } else {
      // Insert new product
      const id = await ctx.db.insert("products", args);
      return { id, action: "inserted" as const };
    }
  },
});
