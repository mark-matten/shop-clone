import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all coupons for a platform
export const getCouponsForPlatform = query({
  args: {
    platform: v.string(),
    includeExpired: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    let coupons = await ctx.db
      .query("coupons")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .collect();

    // Filter expired unless requested
    if (!args.includeExpired) {
      coupons = coupons.filter(
        (c) => !c.expiresAt || c.expiresAt > now
      );
    }

    // Sort by verified first, then by usage count
    return coupons.sort((a, b) => {
      if (a.isVerified !== b.isVerified) {
        return a.isVerified ? -1 : 1;
      }
      return b.usageCount - a.usageCount;
    });
  },
});

// Get all active coupons
export const getActiveCoupons = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const now = Date.now();

    const coupons = await ctx.db
      .query("coupons")
      .withIndex("by_isVerified", (q) => q.eq("isVerified", true))
      .collect();

    // Filter expired and sort
    return coupons
      .filter((c) => !c.expiresAt || c.expiresAt > now)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  },
});

// Search coupons
export const searchCoupons = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const searchQuery = args.query.toLowerCase();
    const now = Date.now();

    const allCoupons = await ctx.db.query("coupons").collect();

    return allCoupons
      .filter((c) => {
        // Filter expired
        if (c.expiresAt && c.expiresAt < now) return false;

        // Search in platform, code, description
        return (
          c.platform.toLowerCase().includes(searchQuery) ||
          c.code.toLowerCase().includes(searchQuery) ||
          c.description.toLowerCase().includes(searchQuery)
        );
      })
      .sort((a, b) => {
        if (a.isVerified !== b.isVerified) {
          return a.isVerified ? -1 : 1;
        }
        return b.usageCount - a.usageCount;
      });
  },
});

// Add a new coupon
export const addCoupon = mutation({
  args: {
    code: v.string(),
    description: v.string(),
    platform: v.string(),
    discountType: v.union(v.literal("percentage"), v.literal("fixed"), v.literal("free_shipping")),
    discountValue: v.optional(v.number()),
    minPurchase: v.optional(v.number()),
    categories: v.optional(v.array(v.string())),
    expiresAt: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if coupon already exists
    const existing = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .first();

    if (existing) {
      return { success: false, message: "Coupon already exists", couponId: existing._id };
    }

    const couponId = await ctx.db.insert("coupons", {
      code: args.code.toUpperCase(),
      description: args.description,
      platform: args.platform,
      discountType: args.discountType,
      discountValue: args.discountValue,
      minPurchase: args.minPurchase,
      categories: args.categories,
      expiresAt: args.expiresAt,
      isVerified: false,
      usageCount: 0,
      addedBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, couponId };
  },
});

// Report coupon success/failure
export const reportCoupon = mutation({
  args: {
    couponId: v.id("coupons"),
    userId: v.id("users"),
    worked: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Add report
    await ctx.db.insert("coupon_reports", {
      couponId: args.couponId,
      userId: args.userId,
      worked: args.worked,
      reportedAt: Date.now(),
    });

    // Update coupon stats
    const coupon = await ctx.db.get(args.couponId);
    if (!coupon) return { success: false };

    const reports = await ctx.db
      .query("coupon_reports")
      .withIndex("by_couponId", (q) => q.eq("couponId", args.couponId))
      .collect();

    const successCount = reports.filter((r) => r.worked).length;
    const successRate = reports.length > 0 ? (successCount / reports.length) * 100 : 0;

    // If user reports it worked, increment usage
    const newUsageCount = args.worked ? coupon.usageCount + 1 : coupon.usageCount;

    // Verify if success rate is high enough
    const shouldVerify = reports.length >= 3 && successRate >= 70;

    await ctx.db.patch(args.couponId, {
      usageCount: newUsageCount,
      successRate: Math.round(successRate),
      isVerified: shouldVerify || coupon.isVerified,
      updatedAt: Date.now(),
    });

    return { success: true, newSuccessRate: successRate };
  },
});

// Save a coupon for later
export const saveCoupon = mutation({
  args: {
    couponId: v.id("coupons"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if already saved
    const existing = await ctx.db
      .query("user_saved_coupons")
      .withIndex("by_userId_couponId", (q) =>
        q.eq("userId", args.userId).eq("couponId", args.couponId)
      )
      .first();

    if (existing) {
      return { success: false, message: "Already saved" };
    }

    await ctx.db.insert("user_saved_coupons", {
      userId: args.userId,
      couponId: args.couponId,
      savedAt: Date.now(),
    });

    return { success: true };
  },
});

// Remove saved coupon
export const unsaveCoupon = mutation({
  args: {
    couponId: v.id("coupons"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const saved = await ctx.db
      .query("user_saved_coupons")
      .withIndex("by_userId_couponId", (q) =>
        q.eq("userId", args.userId).eq("couponId", args.couponId)
      )
      .first();

    if (saved) {
      await ctx.db.delete(saved._id);
    }

    return { success: true };
  },
});

// Get user's saved coupons
export const getSavedCoupons = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const saved = await ctx.db
      .query("user_saved_coupons")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const coupons = await Promise.all(
      saved.map(async (s) => {
        const coupon = await ctx.db.get(s.couponId);
        return coupon
          ? { ...coupon, savedAt: s.savedAt }
          : null;
      })
    );

    return coupons.filter((c) => c !== null);
  },
});

// Get popular platforms with coupon counts
export const getPopularPlatforms = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const coupons = await ctx.db.query("coupons").collect();

    // Count active coupons per platform
    const platformCounts: Record<string, number> = {};

    for (const coupon of coupons) {
      if (coupon.expiresAt && coupon.expiresAt < now) continue;

      platformCounts[coupon.platform] = (platformCounts[coupon.platform] || 0) + 1;
    }

    return Object.entries(platformCounts)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);
  },
});

// Check if user has saved a coupon
export const isCouponSaved = query({
  args: {
    couponId: v.id("coupons"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const saved = await ctx.db
      .query("user_saved_coupons")
      .withIndex("by_userId_couponId", (q) =>
        q.eq("userId", args.userId).eq("couponId", args.couponId)
      )
      .first();

    return !!saved;
  },
});
