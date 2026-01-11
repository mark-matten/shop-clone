import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Helper to generate productKey
function generateProductKey(brand: string, name: string, platform: string): string {
  return `${brand}::${name}::${platform}`;
}

// Helper to extract base product name (remove color suffix like "| Black")
function getBaseProductName(name: string): string {
  // Remove color suffix pattern like "| Black" or "| Heathered Charcoal"
  const pipeIndex = name.lastIndexOf("|");
  if (pipeIndex > 0) {
    return name.substring(0, pipeIndex).trim();
  }
  return name;
}

// Get all products for migration analysis
export const getProductsForMigration = internalQuery({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    return products;
  },
});

// Migrate products to new structure
export const migrateProducts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();

    // Skip if products already have colorVariants (already migrated)
    const alreadyMigrated = products.filter(p => p.colorVariants && p.colorVariants.length > 0);
    if (alreadyMigrated.length > 0) {
      console.log(`Found ${alreadyMigrated.length} already migrated products, skipping those`);
    }

    // Filter products that need migration (no colorVariants yet)
    const toMigrate = products.filter(p => !p.colorVariants || p.colorVariants.length === 0);

    if (toMigrate.length === 0) {
      return { message: "No products to migrate", migratedCount: 0 };
    }

    console.log(`Migrating ${toMigrate.length} products...`);

    // Group products by colorGroupId, or by brand+baseName+platform if no colorGroupId
    const groups = new Map<string, typeof toMigrate>();

    for (const product of toMigrate) {
      let groupKey: string;

      if (product.colorGroupId) {
        // Use colorGroupId as group key
        groupKey = `colorGroup::${product.colorGroupId}`;
      } else {
        // Fall back to brand + base name + platform
        const baseName = getBaseProductName(product.name);
        groupKey = `key::${product.brand}::${baseName}::${product.sourcePlatform}`;
      }

      const existing = groups.get(groupKey);
      if (existing) {
        existing.push(product);
      } else {
        groups.set(groupKey, [product]);
      }
    }

    console.log(`Found ${groups.size} product groups`);

    let migratedCount = 0;
    let deletedCount = 0;

    // Process each group
    for (const [groupKey, groupProducts] of groups) {
      // Sort by creation time to get consistent ordering
      groupProducts.sort((a, b) => a._creationTime - b._creationTime);

      // Use the first product as the base
      const baseProduct = groupProducts[0];
      const baseName = getBaseProductName(baseProduct.name);

      // Build colorVariants array from all products in group
      const colorVariants = groupProducts.map(p => {
        // Define the size type
        type SizeEntry = {
          size: string;
          available: boolean;
          price?: number;
          variantId?: string;
        };

        // Convert old variants to new sizes format
        const sizes: SizeEntry[] = (p.variants || []).map(v => ({
          size: v.option1 || v.title || "One Size",
          available: v.available,
          price: v.price,
          variantId: v.id,
        }));

        // If no variants, create a single size entry from the product's size field
        if (sizes.length === 0 && p.size) {
          sizes.push({
            size: p.size,
            available: true,
          });
        }

        // If still no sizes, create a default
        if (sizes.length === 0) {
          sizes.push({
            size: "One Size",
            available: true,
          });
        }

        return {
          colorName: p.colorName || "Default",
          colorHex: p.colorHex,
          sourceUrl: p.sourceUrl || "",
          imageUrl: p.imageUrl,
          imageUrls: p.imageUrls,
          price: p.price || 0,
          originalPrice: p.originalPrice,
          sizes,
        };
      });

      // Generate productKey
      const productKey = generateProductKey(
        baseProduct.brand,
        baseName,
        baseProduct.sourcePlatform
      );

      // Update the first product with new structure
      await ctx.db.patch(baseProduct._id, {
        productKey,
        name: baseName,
        colorVariants,
      });

      migratedCount++;

      // Delete the other products in the group (they're now merged into the first one)
      for (let i = 1; i < groupProducts.length; i++) {
        await ctx.db.delete(groupProducts[i]._id);
        deletedCount++;
      }
    }

    return {
      message: `Migration complete`,
      groupsProcessed: groups.size,
      migratedCount,
      deletedCount,
    };
  },
});

// Dry run migration to see what would happen
export const dryRunMigration = internalQuery({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();

    // Filter products that need migration (no colorVariants yet)
    const toMigrate = products.filter(p => !p.colorVariants || p.colorVariants.length === 0);

    // Group products by colorGroupId, or by brand+baseName+platform if no colorGroupId
    const groups = new Map<string, typeof toMigrate>();

    for (const product of toMigrate) {
      let groupKey: string;

      if (product.colorGroupId) {
        groupKey = `colorGroup::${product.colorGroupId}`;
      } else {
        const baseName = getBaseProductName(product.name);
        groupKey = `key::${product.brand}::${baseName}::${product.sourcePlatform}`;
      }

      const existing = groups.get(groupKey);
      if (existing) {
        existing.push(product);
      } else {
        groups.set(groupKey, [product]);
      }
    }

    // Summarize groups
    const groupSummary = Array.from(groups.entries()).map(([key, products]) => ({
      groupKey: key,
      productCount: products.length,
      products: products.map(p => ({
        id: p._id,
        name: p.name,
        colorName: p.colorName || "Default",
        price: p.price,
      })),
    }));

    // Sort by product count descending to show multi-color groups first
    groupSummary.sort((a, b) => b.productCount - a.productCount);

    return {
      totalProducts: products.length,
      alreadyMigrated: products.length - toMigrate.length,
      toMigrate: toMigrate.length,
      groupCount: groups.size,
      wouldDelete: toMigrate.length - groups.size,
      groups: groupSummary.slice(0, 20), // Show top 20 groups
    };
  },
});

// Split colorVariants back into individual products (one color per product)
export const splitColorVariants = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();

    // Find products that have colorVariants
    const productsWithVariants = products.filter(
      p => p.colorVariants && p.colorVariants.length > 0
    );

    if (productsWithVariants.length === 0) {
      return { message: "No products with colorVariants to split", splitCount: 0 };
    }

    console.log(`Splitting ${productsWithVariants.length} products with colorVariants...`);

    let splitCount = 0;
    let createdCount = 0;

    for (const product of productsWithVariants) {
      const colorVariants = product.colorVariants!;
      const productKey = product.productKey || generateProductKey(
        product.brand,
        product.name,
        product.sourcePlatform
      );

      // First color variant updates the existing product
      const firstVariant = colorVariants[0];
      await ctx.db.patch(product._id, {
        productKey,
        colorName: firstVariant.colorName,
        colorHex: firstVariant.colorHex,
        sourceUrl: firstVariant.sourceUrl,
        imageUrl: firstVariant.imageUrl,
        imageUrls: firstVariant.imageUrls,
        price: firstVariant.price,
        originalPrice: firstVariant.originalPrice,
        // Convert sizes back to variants format
        variants: firstVariant.sizes?.map((s, idx) => ({
          id: s.variantId || `size-${idx}`,
          title: s.size,
          available: s.available,
          price: s.price,
          option1: s.size,
        })),
        // Clear colorVariants since we're splitting
        colorVariants: undefined,
      });
      splitCount++;

      // Create new products for remaining color variants
      for (let i = 1; i < colorVariants.length; i++) {
        const cv = colorVariants[i];
        await ctx.db.insert("products", {
          productKey,
          name: product.name,
          description: product.description,
          brand: product.brand,
          category: product.category,
          gender: product.gender,
          condition: product.condition,
          material: product.material,
          sourcePlatform: product.sourcePlatform,
          colorName: cv.colorName,
          colorHex: cv.colorHex,
          sourceUrl: cv.sourceUrl,
          imageUrl: cv.imageUrl,
          imageUrls: cv.imageUrls,
          price: cv.price,
          originalPrice: cv.originalPrice,
          variants: cv.sizes?.map((s, idx) => ({
            id: s.variantId || `size-${idx}`,
            title: s.size,
            available: s.available,
            price: s.price,
            option1: s.size,
          })),
        });
        createdCount++;
      }
    }

    return {
      message: "Split complete",
      productsProcessed: productsWithVariants.length,
      splitCount,
      createdCount,
      totalProducts: splitCount + createdCount,
    };
  },
});

// Dry run for split migration
export const dryRunSplit = internalQuery({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();

    const productsWithVariants = products.filter(
      p => p.colorVariants && p.colorVariants.length > 0
    );

    const summary = productsWithVariants.slice(0, 10).map(p => ({
      id: p._id,
      name: p.name,
      colorCount: p.colorVariants?.length || 0,
      colors: p.colorVariants?.map(cv => cv.colorName) || [],
    }));

    const totalNewProducts = productsWithVariants.reduce(
      (sum, p) => sum + (p.colorVariants?.length || 1) - 1,
      0
    );

    return {
      currentProductCount: products.length,
      productsWithVariants: productsWithVariants.length,
      totalColorsAcrossAll: productsWithVariants.reduce(
        (sum, p) => sum + (p.colorVariants?.length || 0),
        0
      ),
      newProductsToCreate: totalNewProducts,
      finalProductCount: products.length + totalNewProducts,
      sampleProducts: summary,
    };
  },
});

// Update user references (favorites, closet, tracking) to include colorName
export const migrateUserReferences = internalMutation({
  args: {},
  handler: async (ctx) => {
    let updatedFavorites = 0;
    let updatedCloset = 0;
    let updatedTracking = 0;

    // Migrate favorites
    const favorites = await ctx.db.query("favorites").collect();
    for (const fav of favorites) {
      if (fav.colorName) continue; // Already has colorName

      // Try to get colorName from selectedOptions or from product
      let colorName = fav.selectedOptions?.Color || fav.selectedOptions?.color;

      if (!colorName && fav.productId) {
        const product = await ctx.db.get(fav.productId);
        if (product?.colorVariants && product.colorVariants.length > 0) {
          colorName = product.colorVariants[0].colorName;
        } else if (product?.colorName) {
          colorName = product.colorName;
        }
      }

      if (colorName) {
        await ctx.db.patch(fav._id, { colorName });
        updatedFavorites++;
      }
    }

    // Migrate closet items
    const closetItems = await ctx.db.query("closet_items").collect();
    for (const item of closetItems) {
      if (item.colorName || !item.productId) continue;

      let colorName = item.selectedOptions?.Color || item.selectedOptions?.color || item.color;

      if (!colorName && item.productId) {
        const product = await ctx.db.get(item.productId);
        if (product?.colorVariants && product.colorVariants.length > 0) {
          colorName = product.colorVariants[0].colorName;
        } else if (product?.colorName) {
          colorName = product.colorName;
        }
      }

      if (colorName) {
        await ctx.db.patch(item._id, { colorName });
        updatedCloset++;
      }
    }

    // Migrate tracked items
    const trackedItems = await ctx.db.query("tracked_items").collect();
    for (const item of trackedItems) {
      if (item.colorName) continue;

      let colorName = item.selectedOptions?.Color || item.selectedOptions?.color;

      if (!colorName) {
        const product = await ctx.db.get(item.productId);
        if (product?.colorVariants && product.colorVariants.length > 0) {
          colorName = product.colorVariants[0].colorName;
        } else if (product?.colorName) {
          colorName = product.colorName;
        }
      }

      if (colorName) {
        await ctx.db.patch(item._id, { colorName });
        updatedTracking++;
      }
    }

    return {
      updatedFavorites,
      updatedCloset,
      updatedTracking,
    };
  },
});

// Color words to detect in product names/descriptions
const COLOR_WORDS = [
  "white", "black", "blue", "navy", "grey", "gray", "brown", "tan", "green",
  "red", "pink", "cream", "ivory", "beige", "olive", "burgundy", "purple",
  "orange", "yellow", "gold", "silver", "teal", "coral", "maroon", "charcoal",
  "khaki", "mint", "lavender", "rose", "blush", "nude", "camel", "rust",
  "indigo", "denim", "chambray", "heather", "mauve", "plum", "sage", "forest",
  "mustard", "wine", "berry", "peach", "aqua", "turquoise", "cobalt", "slate"
];

// Extract color from product name or description
function extractColorFromText(name: string, description?: string): string | null {
  const text = `${name} ${description || ""}`.toLowerCase();

  // Check for color words at word boundaries
  for (const color of COLOR_WORDS) {
    // Match color as a whole word (not part of another word)
    const regex = new RegExp(`\\b${color}\\b`, "i");
    if (regex.test(text)) {
      // Capitalize first letter
      return color.charAt(0).toUpperCase() + color.slice(1);
    }
  }

  return null;
}

// Extract colors from product names/descriptions for products without colorName
// Processes a small batch at a time - call repeatedly until done
export const extractColorsFromNames = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get a batch of products without colorName
    const products = await ctx.db
      .query("products")
      .take(200);

    let updatedCount = 0;
    let skippedCount = 0;
    const colorCounts: Record<string, number> = {};

    for (const product of products) {
      // Skip products that already have colorName
      if (product.colorName) {
        skippedCount++;
        continue;
      }

      const extractedColor = extractColorFromText(product.name, product.description);
      const key = extractedColor || "No color found";
      colorCounts[key] = (colorCounts[key] || 0) + 1;

      if (extractedColor && !args.dryRun) {
        await ctx.db.patch(product._id, { colorName: extractedColor });
        updatedCount++;
      }
    }

    return {
      batchSize: products.length,
      skipped: skippedCount,
      processed: products.length - skippedCount,
      updated: updatedCount,
      dryRun: args.dryRun || false,
      colorCounts,
    };
  },
});
