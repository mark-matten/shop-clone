import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createUser = mutation({
  args: {
    clerkId: v.string(),
    phoneNumber: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      phoneNumber: args.phoneNumber,
      firstName: args.firstName,
      lastName: args.lastName,
      isPublicCloset: true, // Public by default
      preferences: {},
    });
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const updateUserPreferences = mutation({
  args: {
    clerkId: v.string(),
    preferences: v.object({
      // Gender preferences
      shopsMen: v.optional(v.boolean()),
      shopsWomen: v.optional(v.boolean()),
      // Women's size ranges
      womenShoeSizeMin: v.optional(v.string()),
      womenShoeSizeMax: v.optional(v.string()),
      womenTopSizeMin: v.optional(v.string()),
      womenTopSizeMax: v.optional(v.string()),
      womenBottomSizeMin: v.optional(v.string()),
      womenBottomSizeMax: v.optional(v.string()),
      womenDressSizeMin: v.optional(v.string()),
      womenDressSizeMax: v.optional(v.string()),
      // Men's size ranges
      menShoeSizeMin: v.optional(v.string()),
      menShoeSizeMax: v.optional(v.string()),
      menTopSizeMin: v.optional(v.string()),
      menTopSizeMax: v.optional(v.string()),
      // Legacy men's bottom (kept for backwards compatibility)
      menBottomSizeMin: v.optional(v.string()),
      menBottomSizeMax: v.optional(v.string()),
      // New men's bottom with separate waist/length
      menBottomWaistMin: v.optional(v.string()),
      menBottomWaistMax: v.optional(v.string()),
      menBottomLengthMin: v.optional(v.string()),
      menBottomLengthMax: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    // Create user if they don't exist
    if (!user) {
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        phoneNumber: "",
        isPublicCloset: true, // Public by default
        preferences: args.preferences,
      });
      return userId;
    }

    return await ctx.db.patch(user._id, {
      preferences: args.preferences,
    });
  },
});

export const updateEmailSettings = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    emailNotifications: v.optional(v.boolean()),
    emailPriceDrops: v.optional(v.boolean()),
    emailTargetReached: v.optional(v.boolean()),
    emailWeeklyDigest: v.optional(v.boolean()),
    smsNotifications: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Update email if provided
    const updates: { email?: string; preferences: typeof user.preferences } = {
      preferences: {
        ...user.preferences,
        emailNotifications: args.emailNotifications ?? user.preferences.emailNotifications,
        emailPriceDrops: args.emailPriceDrops ?? user.preferences.emailPriceDrops,
        emailTargetReached: args.emailTargetReached ?? user.preferences.emailTargetReached,
        emailWeeklyDigest: args.emailWeeklyDigest ?? user.preferences.emailWeeklyDigest,
        smsNotifications: args.smsNotifications ?? user.preferences.smsNotifications,
      },
    };

    if (args.email !== undefined) {
      updates.email = args.email;
    }

    return await ctx.db.patch(user._id, updates);
  },
});

export const updateModelPreferences = mutation({
  args: {
    clerkId: v.string(),
    modelHeight: v.optional(v.number()),
    modelWeight: v.optional(v.number()),
    modelSkinTone: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db.patch(user._id, {
      preferences: {
        ...user.preferences,
        modelHeight: args.modelHeight ?? user.preferences.modelHeight,
        modelWeight: args.modelWeight ?? user.preferences.modelWeight,
        modelSkinTone: args.modelSkinTone ?? user.preferences.modelSkinTone,
      },
    });
  },
});

// Update closet privacy setting
export const updateClosetPrivacy = mutation({
  args: {
    clerkId: v.string(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db.patch(user._id, {
      isPublicCloset: args.isPublic,
    });
  },
});

// Update user name
export const updateUserName = mutation({
  args: {
    clerkId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const updates: { firstName?: string; lastName?: string } = {};
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;

    return await ctx.db.patch(user._id, updates);
  },
});

// Get user by ID (for public profile pages)
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Only return public info
    return {
      _id: user._id,
      isPublicCloset: user.isPublicCloset ?? false,
      // Don't expose email, phone, or clerkId
    };
  },
});

// Get public user info by clerkId (for share links)
export const getPublicUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return null;

    return {
      _id: user._id,
      isPublicCloset: user.isPublicCloset ?? false,
    };
  },
});

// Get try-on usage stats for rate limiting
export const getTryOnUsage = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return { isPaidUser: false, genericUsedToday: 0, customUsedThisWeek: 0 };
    }

    // Get today's date string
    const today = new Date().toISOString().split("T")[0];

    // Get today's usage record
    const usage = await ctx.db
      .query("try_on_usage")
      .withIndex("by_clerkId_date", (q) => q.eq("clerkId", args.clerkId).eq("date", today))
      .first();

    // Calculate week's custom usage (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];

    const weekUsage = await ctx.db
      .query("try_on_usage")
      .withIndex("by_clerkId_date", (q) => q.eq("clerkId", args.clerkId))
      .filter((q) => q.gte(q.field("date"), weekAgoStr))
      .collect();

    const customUsedThisWeek = weekUsage.reduce((sum, u) => sum + u.customCount, 0);

    return {
      isPaidUser: user.isPaidUser ?? false,
      genericUsedToday: usage?.genericCount ?? 0,
      customUsedThisWeek,
    };
  },
});

// Increment try-on usage (called after successful generation)
export const incrementTryOnUsage = mutation({
  args: {
    clerkId: v.string(),
    isCustomModel: v.boolean(),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];

    // Get or create today's usage record
    const existing = await ctx.db
      .query("try_on_usage")
      .withIndex("by_clerkId_date", (q) => q.eq("clerkId", args.clerkId).eq("date", today))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        genericCount: existing.genericCount + (args.isCustomModel ? 0 : 1),
        customCount: existing.customCount + (args.isCustomModel ? 1 : 0),
      });
    } else {
      await ctx.db.insert("try_on_usage", {
        clerkId: args.clerkId,
        date: today,
        genericCount: args.isCustomModel ? 0 : 1,
        customCount: args.isCustomModel ? 1 : 0,
      });
    }
  },
});

// Admin function to reset try-on usage for a user (for testing/support)
export const resetTryOnUsage = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];

    // Find and delete today's usage record
    const existing = await ctx.db
      .query("try_on_usage")
      .withIndex("by_clerkId_date", (q) => q.eq("clerkId", args.clerkId).eq("date", today))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { success: true, message: "Usage reset for today" };
    }

    return { success: true, message: "No usage found for today" };
  },
});
