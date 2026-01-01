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
  })
    .index("by_userId", ["userId"])
    .index("by_productId", ["productId"])
    .index("by_userId_productId", ["userId", "productId"]),

  products: defineTable({
    name: v.string(),
    description: v.string(),
    brand: v.string(),
    price: v.number(),
    material: v.optional(v.string()),
    size: v.optional(v.string()),
    category: v.string(),
    gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
    condition: v.union(v.literal("new"), v.literal("used"), v.literal("like_new")),
    sourceUrl: v.string(),
    sourcePlatform: v.string(),
    imageUrl: v.optional(v.string()),
  })
    .index("by_brand", ["brand"])
    .index("by_category", ["category"])
    .index("by_price", ["price"])
    .index("by_condition", ["condition"])
    .index("by_gender", ["gender"])
    .index("by_gender_category", ["gender", "category"])
    .index("by_sourcePlatform", ["sourcePlatform"]),

  tracked_items: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    targetPrice: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_productId", ["productId"])
    .index("by_userId_productId", ["userId", "productId"]),

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
