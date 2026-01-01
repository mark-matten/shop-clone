import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createUser = mutation({
  args: {
    clerkId: v.string(),
    phoneNumber: v.string(),
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
      menBottomSizeMin: v.optional(v.string()),
      menBottomSizeMax: v.optional(v.string()),
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
      },
    };

    if (args.email !== undefined) {
      updates.email = args.email;
    }

    return await ctx.db.patch(user._id, updates);
  },
});
