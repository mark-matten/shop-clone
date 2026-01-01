import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate a unique referral code
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Get or create a user's referral code
export const getOrCreateReferralCode = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if user already has an active referral code
    const existingReferral = await ctx.db
      .query("referrals")
      .withIndex("by_referrerId", (q) => q.eq("referrerId", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingReferral) {
      return existingReferral.referralCode;
    }

    // Generate a new unique code
    let code = generateReferralCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await ctx.db
        .query("referrals")
        .withIndex("by_referralCode", (q) => q.eq("referralCode", code))
        .first();

      if (!existing) break;
      code = generateReferralCode();
      attempts++;
    }

    // Create new referral entry
    await ctx.db.insert("referrals", {
      referrerId: args.userId,
      referralCode: code,
      status: "pending",
      createdAt: Date.now(),
    });

    return code;
  },
});

// Get user's referral stats
export const getReferralStats = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrerId", (q) => q.eq("referrerId", args.userId))
      .collect();

    const completed = referrals.filter((r) => r.status === "completed").length;
    const pending = referrals.filter((r) => r.status === "pending").length;

    // Get referral code for sharing
    const activeReferral = referrals.find((r) => r.status === "pending");

    return {
      referralCode: activeReferral?.referralCode || null,
      completedReferrals: completed,
      pendingReferrals: pending,
      totalReferrals: referrals.length,
    };
  },
});

// Validate a referral code
export const validateReferralCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const referral = await ctx.db
      .query("referrals")
      .withIndex("by_referralCode", (q) => q.eq("referralCode", args.code.toUpperCase()))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (!referral) {
      return { valid: false, message: "Invalid or expired referral code" };
    }

    // Get referrer info
    const referrer = await ctx.db.get(referral.referrerId);

    return {
      valid: true,
      referrerName: referrer?.email?.split("@")[0] || "A friend",
    };
  },
});

// Complete a referral (called when referred user signs up)
export const completeReferral = mutation({
  args: {
    referralCode: v.string(),
    referredUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const referral = await ctx.db
      .query("referrals")
      .withIndex("by_referralCode", (q) => q.eq("referralCode", args.referralCode.toUpperCase()))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (!referral) {
      return { success: false, message: "Invalid referral code" };
    }

    // Check if referred user is not the referrer
    if (referral.referrerId === args.referredUserId) {
      return { success: false, message: "Cannot refer yourself" };
    }

    // Check if user was already referred
    const existingReferred = await ctx.db
      .query("referrals")
      .withIndex("by_referredUserId", (q) => q.eq("referredUserId", args.referredUserId))
      .first();

    if (existingReferred) {
      return { success: false, message: "User was already referred" };
    }

    // Mark as completed
    await ctx.db.patch(referral._id, {
      referredUserId: args.referredUserId,
      status: "completed",
      completedAt: Date.now(),
    });

    // Create a new pending referral code for the referrer
    const newCode = generateReferralCode();
    await ctx.db.insert("referrals", {
      referrerId: referral.referrerId,
      referralCode: newCode,
      status: "pending",
      createdAt: Date.now(),
    });

    return { success: true, message: "Referral completed!" };
  },
});

// Get referral leaderboard
export const getReferralLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const allReferrals = await ctx.db
      .query("referrals")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Count by referrer
    const counts: Record<string, number> = {};
    for (const referral of allReferrals) {
      const referrerId = referral.referrerId;
      counts[referrerId] = (counts[referrerId] || 0) + 1;
    }

    // Sort and get top referrers
    const topReferrers = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);

    // Fetch user details
    const leaderboard = await Promise.all(
      topReferrers.map(async ([userId, count], index) => {
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), userId))
          .first();
        return {
          rank: index + 1,
          userId,
          displayName: user?.email?.split("@")[0] || `User ${index + 1}`,
          referralCount: count,
        };
      })
    );

    return leaderboard;
  },
});

// Get user's referred friends
export const getReferredFriends = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrerId", (q) => q.eq("referrerId", args.userId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const friends = await Promise.all(
      referrals.map(async (referral) => {
        if (!referral.referredUserId) return null;
        const user = await ctx.db.get(referral.referredUserId);
        return {
          id: referral.referredUserId,
          displayName: user?.email?.split("@")[0] || "Anonymous",
          joinedAt: referral.completedAt,
        };
      })
    );

    return friends.filter((f) => f !== null);
  },
});
