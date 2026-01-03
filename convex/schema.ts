import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    phoneNumber: v.string(),
    email: v.optional(v.string()),
    preferences: v.object({
      // Gender preferences (at least one required)
      shopsMen: v.optional(v.boolean()),
      shopsWomen: v.optional(v.boolean()),
      // Women's size ranges (min/max)
      womenShoeSizeMin: v.optional(v.string()),
      womenShoeSizeMax: v.optional(v.string()),
      womenTopSizeMin: v.optional(v.string()),
      womenTopSizeMax: v.optional(v.string()),
      womenBottomSizeMin: v.optional(v.string()),
      womenBottomSizeMax: v.optional(v.string()),
      womenDressSizeMin: v.optional(v.string()),
      womenDressSizeMax: v.optional(v.string()),
      // Men's size ranges (min/max)
      menShoeSizeMin: v.optional(v.string()),
      menShoeSizeMax: v.optional(v.string()),
      menTopSizeMin: v.optional(v.string()),
      menTopSizeMax: v.optional(v.string()),
      menBottomSizeMin: v.optional(v.string()),
      menBottomSizeMax: v.optional(v.string()),
      // Legacy fields (for backwards compatibility)
      womenShoeSize: v.optional(v.string()),
      womenTopSize: v.optional(v.string()),
      womenBottomSize: v.optional(v.string()),
      womenDressSize: v.optional(v.string()),
      menShoeSize: v.optional(v.string()),
      menTopSize: v.optional(v.string()),
      menBottomSize: v.optional(v.string()),
      shoeSize: v.optional(v.string()),
      topSize: v.optional(v.string()),
      bottomSize: v.optional(v.string()),
      dressSize: v.optional(v.string()),
      // Notification preferences
      emailNotifications: v.optional(v.boolean()),
      emailPriceDrops: v.optional(v.boolean()),
      emailTargetReached: v.optional(v.boolean()),
      emailWeeklyDigest: v.optional(v.boolean()),
    }),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_phoneNumber", ["phoneNumber"]),

  favorites: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    createdAt: v.number(),
    // Selected variant options (e.g., { "Color": "Black", "Size": "M" })
    selectedOptions: v.optional(v.record(v.string(), v.string())),
    // Custom category override (user can change from product's default category)
    customCategory: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_productId", ["productId"])
    .index("by_userId_productId", ["userId", "productId"]),

  products: defineTable({
    name: v.string(),
    description: v.string(),
    brand: v.string(),
    price: v.number(),
    originalPrice: v.optional(v.number()), // For sale items - the original/compare-at price
    material: v.optional(v.string()),
    size: v.optional(v.string()),
    sizes: v.optional(v.array(v.string())), // All available sizes (legacy)
    // Variant data for color/size selection
    variants: v.optional(v.array(v.object({
      id: v.string(),
      title: v.string(), // e.g., "31 / 28" or "M"
      available: v.boolean(),
      price: v.optional(v.number()),
      option1: v.optional(v.string()), // e.g., waist size "31"
      option2: v.optional(v.string()), // e.g., length "28"
      option3: v.optional(v.string()),
    }))),
    options: v.optional(v.array(v.object({
      name: v.string(), // e.g., "Waist", "Length", "Size"
      values: v.array(v.string()), // e.g., ["28", "29", "30", ...]
    }))),
    // Color grouping
    colorGroupId: v.optional(v.string()), // YGroup ID to link related colors
    colorName: v.optional(v.string()), // e.g., "Graphite", "Black"
    colorHex: v.optional(v.string()), // e.g., "#4a4a4a"
    category: v.string(),
    gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
    condition: v.union(v.literal("new"), v.literal("used"), v.literal("like_new")),
    sourceUrl: v.string(),
    sourcePlatform: v.string(),
    imageUrl: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
  })
    .index("by_brand", ["brand"])
    .index("by_category", ["category"])
    .index("by_price", ["price"])
    .index("by_condition", ["condition"])
    .index("by_gender", ["gender"])
    .index("by_gender_category", ["gender", "category"])
    .index("by_sourcePlatform", ["sourcePlatform"])
    .index("by_colorGroupId", ["colorGroupId"])
    .index("by_sourceUrl", ["sourceUrl"]),

  tracked_items: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    targetPrice: v.optional(v.number()),
    createdAt: v.number(),
    // Selected variant options (e.g., { "Color": "Black", "Size": "M" })
    selectedOptions: v.optional(v.record(v.string(), v.string())),
  })
    .index("by_userId", ["userId"])
    .index("by_productId", ["productId"])
    .index("by_userId_productId", ["userId", "productId"]),

  closet_items: defineTable({
    userId: v.id("users"),
    productId: v.optional(v.id("products")), // Optional for user-added items
    addedAt: v.number(),
    notes: v.optional(v.string()),
    wornCount: v.optional(v.number()),
    lastWorn: v.optional(v.number()),
    // Selected variant options (e.g., { "Color": "Black", "Size": "M" })
    selectedOptions: v.optional(v.record(v.string(), v.string())),
    // Custom category override (user can change from product's default category)
    customCategory: v.optional(v.string()),
    // Sort order within category for drag-and-drop reordering
    sortOrder: v.optional(v.number()),
    // Source of the item: linked product, URL scrape, or AI-generated
    source: v.optional(v.union(v.literal("product"), v.literal("url"), v.literal("generated"))),
    // For user-added items (url or generated sources)
    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    size: v.optional(v.string()),
    color: v.optional(v.string()),
    material: v.optional(v.string()),
    category: v.optional(v.string()),
    sourceUrl: v.optional(v.string()), // Original URL for URL-sourced items
    // For AI-generated items
    generatedImageStorageId: v.optional(v.id("_storage")),
    userDescription: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_productId", ["productId"])
    .index("by_userId_productId", ["userId", "productId"])
    .index("by_userId_addedAt", ["userId", "addedAt"])
    .index("by_userId_source", ["userId", "source"]),

  // User photos for virtual try-on
  user_photos: defineTable({
    clerkId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    uploadedAt: v.number(),
    isDefault: v.boolean(), // User's preferred photo for try-ons
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_clerkId_default", ["clerkId", "isDefault"]),

  // Generated outfit images from virtual try-on
  outfit_images: defineTable({
    clerkId: v.string(),
    storageId: v.id("_storage"),
    closetItemIds: v.array(v.id("closet_items")),
    userPhotoId: v.optional(v.id("user_photos")), // null = faceless model
    generatedAt: v.number(),
    prompt: v.string(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_clerkId_generatedAt", ["clerkId", "generatedAt"]),

  price_history: defineTable({
    productId: v.id("products"),
    price: v.number(),
    checkedAt: v.number(),
  })
    .index("by_productId", ["productId"])
    .index("by_productId_checkedAt", ["productId", "checkedAt"]),

  price_alerts: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    trackedItemId: v.id("tracked_items"),
    previousPrice: v.number(),
    newPrice: v.number(),
    targetPrice: v.number(),
    alertType: v.union(v.literal("target_reached"), v.literal("price_drop")),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_unread", ["userId", "sentAt"]),

  search_history: defineTable({
    userId: v.optional(v.id("users")),
    clerkId: v.optional(v.string()),
    query: v.string(),
    resultCount: v.number(),
    searchedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_userId", ["userId"])
    .index("by_searchedAt", ["searchedAt"])
    .index("by_clerkId_searchedAt", ["clerkId", "searchedAt"]),

  user_stats: defineTable({
    userId: v.id("users"),
    totalSavings: v.number(),
    itemsTracked: v.number(),
    alertsReceived: v.number(),
    favoriteCount: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  saved_searches: defineTable({
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
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_createdAt", ["userId", "createdAt"]),

  collections: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_createdAt", ["userId", "createdAt"]),

  collection_items: defineTable({
    collectionId: v.id("collections"),
    productId: v.id("products"),
    addedAt: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_collectionId", ["collectionId"])
    .index("by_productId", ["productId"])
    .index("by_collectionId_productId", ["collectionId", "productId"]),

  analytics_events: defineTable({
    clerkId: v.optional(v.string()),
    sessionId: v.string(),
    eventType: v.string(),
    eventData: v.optional(v.any()),
    page: v.optional(v.string()),
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_eventType", ["eventType"])
    .index("by_timestamp", ["timestamp"]),

  referrals: defineTable({
    referrerId: v.id("users"),
    referralCode: v.string(),
    referredUserId: v.optional(v.id("users")),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("expired")),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_referrerId", ["referrerId"])
    .index("by_referralCode", ["referralCode"])
    .index("by_referredUserId", ["referredUserId"]),

  coupons: defineTable({
    code: v.string(),
    description: v.string(),
    platform: v.string(),
    discountType: v.union(v.literal("percentage"), v.literal("fixed"), v.literal("free_shipping")),
    discountValue: v.optional(v.number()),
    minPurchase: v.optional(v.number()),
    categories: v.optional(v.array(v.string())),
    expiresAt: v.optional(v.number()),
    isVerified: v.boolean(),
    usageCount: v.number(),
    successRate: v.optional(v.number()),
    addedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_platform", ["platform"])
    .index("by_code", ["code"])
    .index("by_expiresAt", ["expiresAt"])
    .index("by_isVerified", ["isVerified"]),

  coupon_reports: defineTable({
    couponId: v.id("coupons"),
    userId: v.id("users"),
    worked: v.boolean(),
    reportedAt: v.number(),
  })
    .index("by_couponId", ["couponId"])
    .index("by_userId", ["userId"]),

  user_saved_coupons: defineTable({
    userId: v.id("users"),
    couponId: v.id("coupons"),
    savedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_couponId", ["userId", "couponId"]),
});
