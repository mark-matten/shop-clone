import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    phoneNumber: v.string(),
    preferences: v.object({
      shoeSize: v.optional(v.string()),
      topSize: v.optional(v.string()),
      bottomSize: v.optional(v.string()),
      dressSize: v.optional(v.string()),
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
    .index("by_gender", ["gender"]),

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
});
