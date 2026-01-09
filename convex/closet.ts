import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Category normalization and ordering (matches frontend closet categories)
const CATEGORY_ORDER = ["tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories", "activewear", "other"];

const CATEGORY_LABELS: Record<string, string> = {
  tops: "Tops",
  bottoms: "Bottoms",
  dresses: "Dresses",
  outerwear: "Outerwear",
  shoes: "Shoes",
  bags: "Bags",
  accessories: "Accessories",
  activewear: "Activewear",
  other: "Other",
};

function getCategoryKey(category: string): string {
  const lower = category.toLowerCase();

  if (lower.includes("top") || lower.includes("shirt") || lower.includes("blouse") ||
      lower.includes("sweater") || lower.includes("tee") || lower.includes("polo") ||
      lower.includes("bodysuit") || lower.includes("tank") || lower.includes("cami") ||
      lower.includes("henley") || lower.includes("cardigan") || lower.includes("pullover")) {
    return "tops";
  }

  if (lower.includes("bottom") || lower.includes("pant") || lower.includes("jean") ||
      lower.includes("skirt") || lower.includes("short") || lower.includes("chino") ||
      lower.includes("trouser") || lower.includes("legging") || lower.includes("jogger")) {
    return "bottoms";
  }

  if (lower.includes("dress") || lower.includes("jumpsuit") || lower.includes("romper")) {
    return "dresses";
  }

  if (lower.includes("jacket") || lower.includes("coat") || lower.includes("outerwear") ||
      lower.includes("blazer") || lower.includes("vest") || lower.includes("hoodie") ||
      lower.includes("parka") || lower.includes("windbreaker")) {
    return "outerwear";
  }

  if (lower.includes("shoe") || lower.includes("boot") || lower.includes("sneaker") ||
      lower.includes("heel") || lower.includes("sandal") || lower.includes("loafer") ||
      lower.includes("flat") || lower.includes("mule") || lower.includes("slipper") ||
      lower.includes("oxford") || lower.includes("pump") || lower.includes("wedge") ||
      lower.includes("footwear") || lower.includes("trainer") || lower.includes("kicks")) {
    return "shoes";
  }

  if (lower.includes("bag") || lower.includes("tote") || lower.includes("purse") ||
      lower.includes("backpack") || lower.includes("clutch") || lower.includes("satchel") ||
      lower.includes("crossbody") || lower.includes("wallet") || lower.includes("pouch")) {
    return "bags";
  }

  if (lower.includes("accessor") || lower.includes("jewelry") || lower.includes("hat") ||
      lower.includes("scarf") || lower.includes("belt") || lower.includes("watch") ||
      lower.includes("sock") || lower.includes("glove") || lower.includes("sunglasse") ||
      lower.includes("tie") || lower.includes("beanie") || lower.includes("cap")) {
    return "accessories";
  }

  if (lower.includes("active") || lower.includes("sport") || lower.includes("athletic") ||
      lower.includes("workout") || lower.includes("yoga") || lower.includes("gym") ||
      lower.includes("running") || lower.includes("training")) {
    return "activewear";
  }

  return "other";
}

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
    productId: v.string(), // Can be product ID or closet item ID for user-added items
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    let item = null;

    // First, try to get the item directly by ID (for user-added items)
    try {
      const directItem = await ctx.db.get(args.productId as any);
      if (directItem && (directItem as any).userId === user._id) {
        item = directItem;
      }
    } catch {
      // Not a valid closet_items ID, try as product ID
    }

    // If not found directly, try to find by productId (for product-linked items)
    if (!item) {
      item = await ctx.db
        .query("closet_items")
        .withIndex("by_userId_productId", (q) =>
          q.eq("userId", user._id).eq("productId", args.productId as any)
        )
        .first();
    }

    if (item) {
      // If it's a generated item, also delete the stored image
      if ((item as any).source === "generated" && (item as any).generatedImageStorageId) {
        await ctx.storage.delete((item as any).generatedImageStorageId);
      }
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

        // For generated items, resolve the storage URL
        let displayImageUrl: string | undefined = item.imageUrl;
        if (item.source === "generated" && item.generatedImageStorageId) {
          const storageUrl = await ctx.storage.getUrl(item.generatedImageStorageId);
          displayImageUrl = storageUrl ?? undefined;
        }

        return {
          ...item,
          product,
          displayImageUrl,
        };
      })
    );

    // Filter out items where product no longer exists (for product-linked items) and sort by sortOrder or addedAt
    return itemsWithProducts
      .filter((item) => item.product !== null || item.source === "url" || item.source === "generated")
      .sort((a, b) => {
        // Sort by sortOrder if both have it, otherwise by addedAt
        if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
          return a.sortOrder - b.sortOrder;
        }
        if (a.sortOrder !== undefined) return -1;
        if (b.sortOrder !== undefined) return 1;
        return b.addedAt - a.addedAt;
      });
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
    productId: v.union(v.id("products"), v.string()), // Accept both product IDs and closet_items IDs
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

    let item = null;

    // First, try to get the item directly by ID (for user-added items)
    try {
      const directItem = await ctx.db.get(args.productId as any);
      if (directItem && (directItem as any).userId === user._id) {
        item = directItem;
      }
    } catch {
      // Not a valid closet_items ID, try as product ID
    }

    // If not found directly, try to find by productId (for product-linked items)
    if (!item) {
      item = await ctx.db
        .query("closet_items")
        .withIndex("by_userId_productId", (q) =>
          q.eq("userId", user._id).eq("productId", args.productId as any)
        )
        .first();
    }

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
// Supports both product-linked items (productId) and user-added items (closet item ID)
export const updateClosetItemCategory = mutation({
  args: {
    clerkId: v.string(),
    productId: v.string(), // Can be product ID or closet item ID for user-added items
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

    let item = null;

    // First, try to get the item directly by ID (for user-added items)
    try {
      const directItem = await ctx.db.get(args.productId as any);
      if (directItem && (directItem as any).userId === user._id) {
        item = directItem;
      }
    } catch {
      // Not a valid closet_items ID, try as product ID
    }

    // If not found directly, try to find by productId (for product-linked items)
    if (!item) {
      item = await ctx.db
        .query("closet_items")
        .withIndex("by_userId_productId", (q) =>
          q.eq("userId", user._id).eq("productId", args.productId as any)
        )
        .first();
    }

    if (item) {
      await ctx.db.patch(item._id, {
        customCategory: args.customCategory,
      });
    }
  },
});

// Update sort order for multiple items (for drag-and-drop reordering)
// Supports both product-linked items (productId) and user-added items (closet item ID)
export const updateClosetItemsOrder = mutation({
  args: {
    clerkId: v.string(),
    items: v.array(v.object({
      productId: v.string(), // Can be product ID or closet item ID for user-added items
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
      let item = null;

      // First, try to get the item directly by ID (for user-added items)
      try {
        const directItem = await ctx.db.get(update.productId as any);
        if (directItem && (directItem as any).userId === user._id) {
          item = directItem;
        }
      } catch {
        // Not a valid closet_items ID, try as product ID
      }

      // If not found directly, try to find by productId (for product-linked items)
      if (!item) {
        item = await ctx.db
          .query("closet_items")
          .withIndex("by_userId_productId", (q) =>
            q.eq("userId", user._id).eq("productId", update.productId as any)
          )
          .first();
      }

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

// Add item from scraped URL - creates a product and links closet item to it
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
    gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
    isWishlist: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if a product already exists with this sourceUrl
    let product = await ctx.db
      .query("products")
      .withIndex("by_sourceUrl", (q) => q.eq("sourceUrl", args.sourceUrl))
      .first();

    // If no existing product, create one
    if (!product) {
      const productId = await ctx.db.insert("products", {
        name: args.name,
        brand: args.brand,
        description: `${args.brand} ${args.name}`,
        category: args.category,
        condition: "new",
        sourcePlatform: new URL(args.sourceUrl).hostname.replace("www.", ""),
        sourceUrl: args.sourceUrl,
        imageUrl: args.imageUrl,
        imageUrls: [args.imageUrl],
        colorName: args.color,
        material: args.material,
        gender: args.gender,
        // Store size as array for consistency
        sizes: args.size ? [args.size] : [],
      });
      product = await ctx.db.get(productId);
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

    // Create closet item linked to product
    return await ctx.db.insert("closet_items", {
      userId: user._id,
      productId: product!._id,
      addedAt: Date.now(),
      source: "url",
      selectedSize: args.size,
      colorName: args.color,
      customCategory: args.category,
      sortOrder: maxSortOrder + 1,
      wornCount: 0,
      isWishlist: args.isWishlist ?? false,
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
    gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
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
    if (args.gender !== undefined) (updates as any).gender = args.gender;
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
      // Additional fields for item details popup
      source: "product" | "url" | "generated" | "wishlist";
      material: string | undefined;
      size: string | undefined;
      color: string | undefined;
      gender: "men" | "women" | "unisex" | undefined;
      linkedProductId: string | undefined; // For linking to /product/[id] page
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
      let source: "product" | "url" | "generated" = "product";
      let material: string | undefined;
      let size: string | undefined;
      let color: string | undefined;
      let gender: "men" | "women" | "unisex" | undefined;
      let linkedProductId: string | undefined;

      if (item.productId) {
        const product = await ctx.db.get(item.productId);
        if (!product) continue; // Skip if product doesn't exist

        productIdStr = item.productId.toString();
        displayName = item.name ?? product.name;
        displayBrand = item.brand ?? product.brand;
        displayCategory = item.customCategory ?? item.category ?? product.category;
        displayImageUrl = item.imageUrl ?? product.imageUrl;
        source = item.source ?? "product";
        material = item.material ?? product.material;
        size = item.selectedSize ?? item.size;
        color = item.colorName ?? item.color;
        gender = item.gender ?? product.gender;
        linkedProductId = item.productId.toString(); // Can link to product page
      } else if (item.source === "url") {
        productIdStr = `url-${item._id}`;
        displayName = item.name;
        displayBrand = item.brand;
        displayCategory = item.customCategory ?? item.category;
        displayImageUrl = item.imageUrl;
        source = "url";
        material = item.material;
        size = item.size;
        color = item.color;
        gender = item.gender;
        linkedProductId = undefined; // URL items don't link to product pages
      } else if (item.source === "generated" && item.generatedImageStorageId) {
        productIdStr = `gen-${item._id}`;
        displayName = item.name;
        displayBrand = item.brand;
        displayCategory = item.customCategory ?? item.category;
        displayImageUrl = await ctx.storage.getUrl(item.generatedImageStorageId);
        source = "generated";
        material = item.material;
        size = item.size;
        color = item.color;
        gender = item.gender;
        linkedProductId = undefined; // Generated items don't link to product pages
      } else {
        // Skip items without valid source
        continue;
      }

      if (productIdStr && displayName && displayCategory) {
        itemsByProductId.set(productIdStr, {
          _id: item._id.toString(),
          productId: productIdStr,
          displayName,
          displayBrand,
          displayCategory,
          displayImageUrl,
          isOwned: true,
          isWishlist: false,
          addedAt: item.addedAt,
          sortOrder: item.sortOrder,
          source,
          material,
          size,
          color,
          gender,
          linkedProductId,
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
        _id: item._id.toString(),
        productId: productIdStr,
        displayName: product.name,
        displayBrand: product.brand,
        displayCategory: item.customCategory ?? product.category,
        displayImageUrl: product.imageUrl,
        isOwned: false,
        isWishlist: true,
        addedAt: item.createdAt,
        sortOrder: undefined,
        source: "wishlist" as const,
        material: product.material,
        size: item.size, // Wishlist items may have size selected
        color: item.colorName, // Wishlist items may have color selected
        gender: product.gender,
        linkedProductId: item.productId.toString(), // Can link to product page
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

// Get public closet data (for sharing)
export const getPublicCloset = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Get the user to check if closet is public
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return null;

    if (!user.isPublicCloset) {
      return { isPrivate: true };
    }

    // Get all closet items (owned items only, not wishlist)
    const closetItems = await ctx.db
      .query("closet_items")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    // Filter to owned items only (not wishlist)
    const ownedItems = closetItems.filter((item) => !item.isWishlist);

    // Get item details with normalized categories
    const itemsWithDetails = await Promise.all(
      ownedItems.map(async (item) => {
        let imageUrl = item.imageUrl;
        let name = item.name;
        let brand = item.brand;
        let rawCategory = item.customCategory || item.category;

        // For generated items, resolve storage URL
        if (item.source === "generated" && item.generatedImageStorageId) {
          imageUrl = await ctx.storage.getUrl(item.generatedImageStorageId) ?? undefined;
        }

        // For product-linked items, get product details
        if (item.productId) {
          const product = await ctx.db.get(item.productId);
          if (product) {
            name = name || product.name;
            brand = brand || product.brand;
            imageUrl = imageUrl || product.imageUrl;
            rawCategory = rawCategory || product.category;
          }
        }

        // Normalize category to standard closet categories
        const normalizedCategory = getCategoryKey(rawCategory || "other");

        return {
          _id: item._id,
          name: name || "Unknown Item",
          brand: brand || "",
          imageUrl,
          category: normalizedCategory,
          categoryLabel: CATEGORY_LABELS[normalizedCategory] || "Other",
          colorName: item.color || item.colorName,
          addedAt: item.addedAt,
          sortOrder: item.sortOrder,
        };
      })
    );

    // Group by normalized category
    const byCategory: Record<string, typeof itemsWithDetails> = {};
    for (const item of itemsWithDetails) {
      const cat = item.category;
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(item);
    }

    // Sort items within each category by sortOrder
    for (const cat of Object.keys(byCategory)) {
      byCategory[cat].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }

    // Get categories in proper order (only those with items)
    const orderedCategories = CATEGORY_ORDER
      .filter((cat) => byCategory[cat] && byCategory[cat].length > 0)
      .map((cat) => ({
        id: cat,
        label: CATEGORY_LABELS[cat],
        count: byCategory[cat].length,
      }));

    return {
      isPrivate: false,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      items: itemsWithDetails,
      byCategory,
      orderedCategories,
      totalItems: itemsWithDetails.length,
    };
  },
});
