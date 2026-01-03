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
        const product = item.productId ? await ctx.db.get(item.productId) : null;
        return {
          ...item,
          product,
        };
      })
    );

    // Filter out items where product no longer exists (for product-linked items) and sort by addedAt
    return itemsWithProducts
      .filter((item) => item.product !== null || item.source === "url" || item.source === "generated")
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

    return closetItems.map((item) => item.productId).filter((id): id is NonNullable<typeof id> => id !== undefined);
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
      closetItems.map((item) => item.productId ? ctx.db.get(item.productId) : null)
    );

    const validProducts = products.filter((p) => p !== null);

    const totalValue = validProducts.reduce((sum, p) => sum + (p?.price || 0), 0);

    const categories: Record<string, number> = {};
    for (const product of validProducts) {
      if (product) {
        categories[product.category] = (categories[product.category] || 0) + 1;
      }
    }

    // Include user-added items in category count
    for (const item of closetItems) {
      if (!item.productId && item.category) {
        categories[item.category] = (categories[item.category] || 0) + 1;
      }
    }

    return {
      totalItems: closetItems.length,
      totalValue,
      categories,
    };
  },
});

// Add item from scraped URL
export const addFromUrl = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    brand: v.string(),
    imageUrl: v.string(),
    size: v.string(),
    color: v.optional(v.string()),
    material: v.optional(v.string()),
    category: v.string(),
    sourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get next sort order
    const existingItems = await ctx.db
      .query("closet_items")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const maxSortOrder = Math.max(
      0,
      ...existingItems.map((item) => item.sortOrder ?? 0)
    );

    return await ctx.db.insert("closet_items", {
      userId: user._id,
      addedAt: Date.now(),
      source: "url",
      name: args.name,
      brand: args.brand,
      imageUrl: args.imageUrl,
      size: args.size,
      color: args.color,
      material: args.material,
      category: args.category,
      sourceUrl: args.sourceUrl,
      sortOrder: maxSortOrder + 1,
      wornCount: 0,
    });
  },
});

// Remove a closet item by ID (works for all item types)
export const removeClosetItem = mutation({
  args: {
    clerkId: v.string(),
    itemId: v.id("closet_items"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== user._id) {
      throw new Error("Item not found or access denied");
    }

    // If it's a generated item, also delete the stored image
    if (item.source === "generated" && item.generatedImageStorageId) {
      await ctx.storage.delete(item.generatedImageStorageId);
    }

    await ctx.db.delete(args.itemId);
  },
});

// Update closet item (works for all item types)
export const updateClosetItem = mutation({
  args: {
    clerkId: v.string(),
    itemId: v.id("closet_items"),
    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    size: v.optional(v.string()),
    color: v.optional(v.string()),
    material: v.optional(v.string()),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== user._id) {
      throw new Error("Item not found or access denied");
    }

    const updates: Record<string, string | undefined> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.brand !== undefined) updates.brand = args.brand;
    if (args.size !== undefined) updates.size = args.size;
    if (args.color !== undefined) updates.color = args.color;
    if (args.material !== undefined) updates.material = args.material;
    if (args.category !== undefined) updates.category = args.category;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.itemId, updates);
  },
});

// Get all items for virtual try-on (closet + wishlist, no duplicates)
// Returns items with isOwned (checkmark) or isWishlist (heart) flags
export const getAllClosetItems = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    // Map to track items by productId to avoid duplicates
    const itemsByProductId = new Map<string, {
      _id: string;
      productId: string;
      displayName: string;
      displayBrand: string | undefined;
      displayCategory: string;
      displayImageUrl: string | null | undefined;
      isOwned: boolean;
      isWishlist: boolean;
      addedAt: number;
      sortOrder: number | undefined;
    }>();

    // 1. Get all closet items (owned) - these take priority
    const closetItems = await ctx.db
      .query("closet_items")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    for (const item of closetItems) {
      let displayName: string | undefined;
      let displayBrand: string | undefined;
      let displayCategory: string | undefined;
      let displayImageUrl: string | null | undefined;
      let productIdStr: string | undefined;

      if (item.productId) {
        const product = await ctx.db.get(item.productId);
        if (!product) continue; // Skip if product doesn't exist

        productIdStr = item.productId.toString();
        displayName = item.name ?? product.name;
        displayBrand = item.brand ?? product.brand;
        displayCategory = item.customCategory ?? item.category ?? product.category;
        displayImageUrl = item.imageUrl ?? product.imageUrl;
      } else if (item.source === "url") {
        productIdStr = `url-${item._id}`;
        displayName = item.name;
        displayBrand = item.brand;
        displayCategory = item.customCategory ?? item.category;
        displayImageUrl = item.imageUrl;
      } else if (item.source === "generated" && item.generatedImageStorageId) {
        productIdStr = `gen-${item._id}`;
        displayName = item.name;
        displayBrand = item.brand;
        displayCategory = item.customCategory ?? item.category;
        displayImageUrl = await ctx.storage.getUrl(item.generatedImageStorageId);
      } else {
        // Skip items without valid source
        continue;
      }

      if (productIdStr && displayName && displayCategory) {
        itemsByProductId.set(productIdStr, {
          _id: item._id,
          productId: productIdStr,
          displayName,
          displayBrand,
          displayCategory,
          displayImageUrl,
          isOwned: true,
          isWishlist: false,
          addedAt: item.addedAt,
          sortOrder: item.sortOrder,
        });
      }
    }

    // 2. Get all wishlist items (favorites) - only add if not already owned
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    console.log("[getAllClosetItems] favorites count:", favorites.length);
    console.log("[getAllClosetItems] closet items added:", itemsByProductId.size);

    for (const item of favorites) {
      const productIdStr = item.productId.toString();

      // Skip if already in closet (owned takes priority)
      if (itemsByProductId.has(productIdStr)) {
        console.log("[getAllClosetItems] Skipping wishlist item (already owned):", productIdStr);
        continue;
      }

      const product = await ctx.db.get(item.productId);
      if (!product) {
        console.log("[getAllClosetItems] Skipping wishlist item (product not found):", productIdStr);
        continue;
      }

      console.log("[getAllClosetItems] Adding wishlist item:", product.name, "category:", product.category);

      itemsByProductId.set(productIdStr, {
        _id: item._id,
        productId: productIdStr,
        displayName: product.name,
        displayBrand: product.brand,
        displayCategory: item.customCategory ?? product.category,
        displayImageUrl: product.imageUrl,
        isOwned: false,
        isWishlist: true,
        addedAt: item.createdAt,
        sortOrder: undefined,
      });
    }

    console.log("[getAllClosetItems] Total items:", itemsByProductId.size);

    // Convert map to array and sort
    const allItems = Array.from(itemsByProductId.values());

    // Sort: owned items first, then by addedAt (newest first)
    return allItems.sort((a, b) => {
      if (a.isOwned && !b.isOwned) return -1;
      if (!a.isOwned && b.isOwned) return 1;
      return b.addedAt - a.addedAt;
    });
  },
});

// Cleanup orphaned closet_items that reference non-existent products
export const cleanupOrphanedClosetItems = mutation({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let closetItems;

    if (args.clerkId) {
      const clerkId = args.clerkId;
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
        .first();

      if (!user) {
        return { deletedCount: 0, deletedItems: [] };
      }

      closetItems = await ctx.db
        .query("closet_items")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();
    } else {
      closetItems = await ctx.db.query("closet_items").collect();
    }

    let deletedCount = 0;
    const deletedItems: { id: string; productId: string; name?: string }[] = [];

    for (const item of closetItems) {
      // Only check items that have a productId (not URL-sourced or generated items)
      if (item.productId) {
        const product = await ctx.db.get(item.productId);
        if (!product) {
          // Product doesn't exist, delete the closet item
          await ctx.db.delete(item._id);
          deletedCount++;
          deletedItems.push({
            id: item._id,
            productId: item.productId,
            name: item.name,
          });
        }
      }
    }

    console.log(`[cleanupOrphanedClosetItems] Deleted ${deletedCount} orphaned closet items`);
    return { deletedCount, deletedItems };
  },
});

// Get closet items by category
export const getClosetItemsByCategory = query({
  args: {
    clerkId: v.string(),
    category: v.string(),
  },
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

    // Filter and map items
    const matchingItems = await Promise.all(
      closetItems.map(async (item) => {
        let itemCategory: string | undefined;
        let displayImageUrl: string | null | undefined;
        let displayName: string | undefined;
        let displayBrand: string | undefined;

        if (item.productId) {
          const product = await ctx.db.get(item.productId);
          if (!product) return null;
          itemCategory = item.customCategory ?? item.category ?? product.category;
          displayImageUrl = item.imageUrl ?? product.imageUrl;
          displayName = item.name ?? product.name;
          displayBrand = item.brand ?? product.brand;
        } else {
          itemCategory = item.customCategory ?? item.category;
          displayName = item.name;
          displayBrand = item.brand;

          if (item.source === "generated" && item.generatedImageStorageId) {
            displayImageUrl = await ctx.storage.getUrl(item.generatedImageStorageId);
          } else {
            displayImageUrl = item.imageUrl;
          }
        }

        // Check if category matches (case-insensitive)
        if (!itemCategory || itemCategory.toLowerCase() !== args.category.toLowerCase()) {
          return null;
        }

        return {
          ...item,
          displayName,
          displayBrand,
          displayCategory: itemCategory,
          displayImageUrl,
        };
      })
    );

    return matchingItems
      .filter((item) => item !== null)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },
});
