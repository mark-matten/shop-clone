import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Helper to normalize phone numbers for search
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");
  // Handle US numbers: ensure 10 digits or 11 with leading 1
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  // Return with + prefix for international
  if (!phone.startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

// Search for user by phone number (exact match)
export const searchUserByPhone = query({
  args: {
    phoneNumber: v.string(),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get current user to exclude from results
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!currentUser) {
      return null;
    }

    // Normalize the phone number for search
    const normalizedPhone = normalizePhoneNumber(args.phoneNumber);

    // Search for user by phone number
    const foundUser = await ctx.db
      .query("users")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", normalizedPhone))
      .first();

    // Also try without normalization in case stored differently
    const foundUserAlt = !foundUser
      ? await ctx.db
          .query("users")
          .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
          .first()
      : null;

    const user = foundUser || foundUserAlt;

    // Don't return current user
    if (!user || user._id === currentUser._id) {
      return null;
    }

    // Return public info only
    return {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      isPublicCloset: user.isPublicCloset ?? true, // Default to public
    };
  },
});

// Get users the current user is following
export const getFollowing = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    // Get all follows where current user is the follower
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_followerId", (q) => q.eq("followerId", user._id))
      .collect();

    // Get user details and alert settings for each following
    const followingWithDetails = await Promise.all(
      follows.map(async (follow) => {
        const followedUser = await ctx.db.get(follow.followingId);
        if (!followedUser) return null;

        // Get alert settings for this following
        const alertSettings = await ctx.db
          .query("follow_alert_settings")
          .withIndex("by_userId_followingId", (q) =>
            q.eq("userId", user._id).eq("followingId", follow.followingId)
          )
          .first();

        return {
          _id: follow._id,
          followingId: follow.followingId,
          user: {
            _id: followedUser._id,
            firstName: followedUser.firstName,
            lastName: followedUser.lastName,
            isPublicCloset: followedUser.isPublicCloset ?? true,
          },
          alertSettings: alertSettings
            ? {
                notifyNewOwnedItems: alertSettings.notifyNewOwnedItems,
                notifyNewWishlistItems: alertSettings.notifyNewWishlistItems,
                notifyNewOutfits: alertSettings.notifyNewOutfits,
                alertsEnabled: alertSettings.alertsEnabled,
              }
            : {
                notifyNewOwnedItems: true,
                notifyNewWishlistItems: false,
                notifyNewOutfits: true,
                alertsEnabled: true,
              },
          createdAt: follow.createdAt,
        };
      })
    );

    return followingWithDetails.filter((f) => f !== null);
  },
});

// Get followers of the current user
export const getFollowers = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    // Get all follows where current user is being followed
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_followingId", (q) => q.eq("followingId", user._id))
      .collect();

    // Get user details for each follower
    const followersWithDetails = await Promise.all(
      follows.map(async (follow) => {
        const follower = await ctx.db.get(follow.followerId);
        if (!follower) return null;

        return {
          _id: follow._id,
          followerId: follow.followerId,
          user: {
            _id: follower._id,
            firstName: follower.firstName,
            lastName: follower.lastName,
            isPublicCloset: follower.isPublicCloset ?? true,
          },
          createdAt: follow.createdAt,
        };
      })
    );

    return followersWithDetails.filter((f) => f !== null);
  },
});

// Get pending follow requests (for private accounts)
export const getPendingFollowRequests = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    // Get pending requests where current user is the target
    const requests = await ctx.db
      .query("follow_requests")
      .withIndex("by_targetId_status", (q) =>
        q.eq("targetId", user._id).eq("status", "pending")
      )
      .collect();

    // Get requester details
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const requester = await ctx.db.get(request.requesterId);
        if (!requester) return null;

        return {
          _id: request._id,
          requesterId: request.requesterId,
          user: {
            _id: requester._id,
            firstName: requester.firstName,
            lastName: requester.lastName,
          },
          createdAt: request.createdAt,
        };
      })
    );

    return requestsWithDetails.filter((r) => r !== null);
  },
});

// Check follow status between current user and target
export const getFollowStatus = query({
  args: {
    clerkId: v.string(),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return { isFollowing: false, hasPendingRequest: false, isFollowedBy: false };
    }

    // Check if following
    const follow = await ctx.db
      .query("follows")
      .withIndex("by_followerId_followingId", (q) =>
        q.eq("followerId", user._id).eq("followingId", args.targetUserId)
      )
      .first();

    // Check for pending request
    const pendingRequest = await ctx.db
      .query("follow_requests")
      .withIndex("by_requesterId_targetId", (q) =>
        q.eq("requesterId", user._id).eq("targetId", args.targetUserId)
      )
      .first();

    // Check if followed by target
    const followedBy = await ctx.db
      .query("follows")
      .withIndex("by_followerId_followingId", (q) =>
        q.eq("followerId", args.targetUserId).eq("followingId", user._id)
      )
      .first();

    return {
      isFollowing: follow !== null,
      hasPendingRequest: pendingRequest?.status === "pending",
      isFollowedBy: followedBy !== null,
    };
  },
});

// Get follower/following counts for a user (public data)
export const getUserSocialCounts = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Count followers (people following this user)
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_followingId", (q) => q.eq("followingId", args.userId))
      .collect();

    // Count following (people this user follows)
    const following = await ctx.db
      .query("follows")
      .withIndex("by_followerId", (q) => q.eq("followerId", args.userId))
      .collect();

    return {
      followers: followers.length,
      following: following.length,
    };
  },
});

// Get follow status by target user ID (for public closet page, uses userId not clerkId for target)
export const getFollowStatusByUserId = query({
  args: {
    viewerClerkId: v.string(),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const viewer = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.viewerClerkId))
      .first();

    if (!viewer) {
      return { isFollowing: false, hasPendingRequest: false };
    }

    // Check if following
    const follow = await ctx.db
      .query("follows")
      .withIndex("by_followerId_followingId", (q) =>
        q.eq("followerId", viewer._id).eq("followingId", args.targetUserId)
      )
      .first();

    // Check for pending request
    const pendingRequest = await ctx.db
      .query("follow_requests")
      .withIndex("by_requesterId_targetId", (q) =>
        q.eq("requesterId", viewer._id).eq("targetId", args.targetUserId)
      )
      .first();

    return {
      isFollowing: follow !== null,
      hasPendingRequest: pendingRequest?.status === "pending",
    };
  },
});

// Follow a user (public) or send follow request (private)
export const followUser = mutation({
  args: {
    clerkId: v.string(),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    // Can't follow yourself
    if (user._id === args.targetUserId) {
      throw new Error("Cannot follow yourself");
    }

    // Check if already following
    const existingFollow = await ctx.db
      .query("follows")
      .withIndex("by_followerId_followingId", (q) =>
        q.eq("followerId", user._id).eq("followingId", args.targetUserId)
      )
      .first();

    if (existingFollow) {
      return { status: "already_following" };
    }

    // Check for existing pending request
    const existingRequest = await ctx.db
      .query("follow_requests")
      .withIndex("by_requesterId_targetId", (q) =>
        q.eq("requesterId", user._id).eq("targetId", args.targetUserId)
      )
      .first();

    if (existingRequest?.status === "pending") {
      return { status: "request_pending" };
    }

    const isPublic = targetUser.isPublicCloset ?? true;

    if (isPublic) {
      // Public profile: create follow directly
      await ctx.db.insert("follows", {
        followerId: user._id,
        followingId: args.targetUserId,
        createdAt: Date.now(),
      });

      // Create default alert settings
      await ctx.db.insert("follow_alert_settings", {
        userId: user._id,
        followingId: args.targetUserId,
        notifyNewOwnedItems: true,
        notifyNewWishlistItems: false,
        notifyNewOutfits: true,
        alertsEnabled: true,
        createdAt: Date.now(),
      });

      // Create notification for the followed user
      const userName = user.firstName
        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : "Someone";

      await ctx.db.insert("notifications", {
        userId: args.targetUserId,
        type: "new_follower",
        fromUserId: user._id,
        message: `${userName} started following you`,
        read: false,
        createdAt: Date.now(),
      });

      return { status: "followed" };
    } else {
      // Private profile: create follow request
      await ctx.db.insert("follow_requests", {
        requesterId: user._id,
        targetId: args.targetUserId,
        status: "pending",
        createdAt: Date.now(),
      });

      // Create notification for the target user
      const userName = user.firstName
        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : "Someone";

      await ctx.db.insert("notifications", {
        userId: args.targetUserId,
        type: "follow_request",
        fromUserId: user._id,
        message: `${userName} requested to follow you`,
        read: false,
        createdAt: Date.now(),
      });

      return { status: "request_sent" };
    }
  },
});

// Unfollow a user
export const unfollowUser = mutation({
  args: {
    clerkId: v.string(),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Find and delete the follow
    const follow = await ctx.db
      .query("follows")
      .withIndex("by_followerId_followingId", (q) =>
        q.eq("followerId", user._id).eq("followingId", args.targetUserId)
      )
      .first();

    if (follow) {
      await ctx.db.delete(follow._id);
    }

    // Delete alert settings
    const alertSettings = await ctx.db
      .query("follow_alert_settings")
      .withIndex("by_userId_followingId", (q) =>
        q.eq("userId", user._id).eq("followingId", args.targetUserId)
      )
      .first();

    if (alertSettings) {
      await ctx.db.delete(alertSettings._id);
    }
  },
});

// Cancel a pending follow request
export const cancelFollowRequest = mutation({
  args: {
    clerkId: v.string(),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Find and delete the pending request
    const request = await ctx.db
      .query("follow_requests")
      .withIndex("by_requesterId_targetId", (q) =>
        q.eq("requesterId", user._id).eq("targetId", args.targetUserId)
      )
      .first();

    if (request && request.status === "pending") {
      await ctx.db.delete(request._id);
    }
  },
});

// Approve a follow request
export const approveFollowRequest = mutation({
  args: {
    clerkId: v.string(),
    requesterId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Find the pending request
    const request = await ctx.db
      .query("follow_requests")
      .withIndex("by_requesterId_targetId", (q) =>
        q.eq("requesterId", args.requesterId).eq("targetId", user._id)
      )
      .first();

    if (!request || request.status !== "pending") {
      throw new Error("No pending request found");
    }

    // Update request status
    await ctx.db.patch(request._id, {
      status: "approved",
      respondedAt: Date.now(),
    });

    // Create the follow relationship
    await ctx.db.insert("follows", {
      followerId: args.requesterId,
      followingId: user._id,
      createdAt: Date.now(),
    });

    // Create default alert settings for the new follower
    await ctx.db.insert("follow_alert_settings", {
      userId: args.requesterId,
      followingId: user._id,
      notifyNewOwnedItems: true,
      notifyNewWishlistItems: false,
      notifyNewOutfits: true,
      alertsEnabled: true,
      createdAt: Date.now(),
    });

    // Notify the requester that their request was approved
    const userName = user.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : "Someone";

    await ctx.db.insert("notifications", {
      userId: args.requesterId,
      type: "follow_request_approved",
      fromUserId: user._id,
      message: `${userName} accepted your follow request`,
      read: false,
      createdAt: Date.now(),
    });
  },
});

// Reject a follow request
export const rejectFollowRequest = mutation({
  args: {
    clerkId: v.string(),
    requesterId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Find the pending request
    const request = await ctx.db
      .query("follow_requests")
      .withIndex("by_requesterId_targetId", (q) =>
        q.eq("requesterId", args.requesterId).eq("targetId", user._id)
      )
      .first();

    if (!request || request.status !== "pending") {
      throw new Error("No pending request found");
    }

    // Update request status (no notification for rejection)
    await ctx.db.patch(request._id, {
      status: "rejected",
      respondedAt: Date.now(),
    });
  },
});

// Update follow alert settings
export const updateFollowAlertSettings = mutation({
  args: {
    clerkId: v.string(),
    followingId: v.id("users"),
    notifyNewOwnedItems: v.optional(v.boolean()),
    notifyNewWishlistItems: v.optional(v.boolean()),
    notifyNewOutfits: v.optional(v.boolean()),
    alertsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Find existing settings
    const settings = await ctx.db
      .query("follow_alert_settings")
      .withIndex("by_userId_followingId", (q) =>
        q.eq("userId", user._id).eq("followingId", args.followingId)
      )
      .first();

    const updates: Partial<{
      notifyNewOwnedItems: boolean;
      notifyNewWishlistItems: boolean;
      notifyNewOutfits: boolean;
      alertsEnabled: boolean;
    }> = {};

    if (args.notifyNewOwnedItems !== undefined) {
      updates.notifyNewOwnedItems = args.notifyNewOwnedItems;
    }
    if (args.notifyNewWishlistItems !== undefined) {
      updates.notifyNewWishlistItems = args.notifyNewWishlistItems;
    }
    if (args.notifyNewOutfits !== undefined) {
      updates.notifyNewOutfits = args.notifyNewOutfits;
    }
    if (args.alertsEnabled !== undefined) {
      updates.alertsEnabled = args.alertsEnabled;
    }

    if (settings) {
      await ctx.db.patch(settings._id, updates);
    } else {
      // Create new settings if they don't exist
      await ctx.db.insert("follow_alert_settings", {
        userId: user._id,
        followingId: args.followingId,
        notifyNewOwnedItems: args.notifyNewOwnedItems ?? true,
        notifyNewWishlistItems: args.notifyNewWishlistItems ?? false,
        notifyNewOutfits: args.notifyNewOutfits ?? true,
        alertsEnabled: args.alertsEnabled ?? true,
        createdAt: Date.now(),
      });
    }
  },
});

// Remove a follower
export const removeFollower = mutation({
  args: {
    clerkId: v.string(),
    followerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Find and delete the follow where the specified user is following current user
    const follow = await ctx.db
      .query("follows")
      .withIndex("by_followerId_followingId", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", user._id)
      )
      .first();

    if (follow) {
      await ctx.db.delete(follow._id);
    }

    // Delete their alert settings for following current user
    const alertSettings = await ctx.db
      .query("follow_alert_settings")
      .withIndex("by_userId_followingId", (q) =>
        q.eq("userId", args.followerId).eq("followingId", user._id)
      )
      .first();

    if (alertSettings) {
      await ctx.db.delete(alertSettings._id);
    }
  },
});

// Get follow counts for a user
export const getFollowCounts = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return { followingCount: 0, followersCount: 0, pendingRequestsCount: 0 };
    }

    const following = await ctx.db
      .query("follows")
      .withIndex("by_followerId", (q) => q.eq("followerId", user._id))
      .collect();

    const followers = await ctx.db
      .query("follows")
      .withIndex("by_followingId", (q) => q.eq("followingId", user._id))
      .collect();

    const pendingRequests = await ctx.db
      .query("follow_requests")
      .withIndex("by_targetId_status", (q) =>
        q.eq("targetId", user._id).eq("status", "pending")
      )
      .collect();

    return {
      followingCount: following.length,
      followersCount: followers.length,
      pendingRequestsCount: pendingRequests.length,
    };
  },
});

// Internal: Notify followers when user adds a closet item
export const notifyFollowersOfNewItem = internalMutation({
  args: {
    userId: v.id("users"),
    itemName: v.string(),
    isWishlist: v.boolean(),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    // Get all followers
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_followingId", (q) => q.eq("followingId", args.userId))
      .collect();

    if (followers.length === 0) return;

    // Batch fetch all alert settings for this user's followers (optimized: single query)
    const allSettings = await ctx.db
      .query("follow_alert_settings")
      .withIndex("by_followingId", (q) => q.eq("followingId", args.userId))
      .collect();

    // Create a Map for quick lookup by userId
    const settingsMap = new Map(
      allSettings.map((s) => [s.userId.toString(), s])
    );

    const userName = user.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : "Someone you follow";

    // Filter followers who should receive notifications
    const followersToNotify = followers.filter((follow) => {
      const settings = settingsMap.get(follow.followerId.toString());
      if (!settings?.alertsEnabled) return false;
      if (args.isWishlist && !settings.notifyNewWishlistItems) return false;
      if (!args.isWishlist && !settings.notifyNewOwnedItems) return false;
      return true;
    });

    // Batch insert all notifications in parallel
    await Promise.all(
      followersToNotify.map((follow) =>
        ctx.db.insert("notifications", {
          userId: follow.followerId,
          type: args.isWishlist ? "new_wishlist_item" : "new_closet_item",
          fromUserId: args.userId,
          relatedId: args.itemId,
          message: args.isWishlist
            ? `${userName} added "${args.itemName}" to their wishlist`
            : `${userName} added "${args.itemName}" to their closet`,
          read: false,
          createdAt: Date.now(),
        })
      )
    );
  },
});

// Internal: Notify followers when user saves an outfit
export const notifyFollowersOfNewOutfit = internalMutation({
  args: {
    userId: v.id("users"),
    outfitName: v.optional(v.string()),
    outfitId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    // Get all followers
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_followingId", (q) => q.eq("followingId", args.userId))
      .collect();

    if (followers.length === 0) return;

    // Batch fetch all alert settings for this user's followers (optimized: single query)
    const allSettings = await ctx.db
      .query("follow_alert_settings")
      .withIndex("by_followingId", (q) => q.eq("followingId", args.userId))
      .collect();

    // Create a Map for quick lookup by userId
    const settingsMap = new Map(
      allSettings.map((s) => [s.userId.toString(), s])
    );

    const userName = user.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : "Someone you follow";

    // Filter followers who should receive outfit notifications
    const followersToNotify = followers.filter((follow) => {
      const settings = settingsMap.get(follow.followerId.toString());
      return settings?.alertsEnabled && settings.notifyNewOutfits;
    });

    // Batch insert all notifications in parallel
    await Promise.all(
      followersToNotify.map((follow) =>
        ctx.db.insert("notifications", {
          userId: follow.followerId,
          type: "new_outfit",
          fromUserId: args.userId,
          relatedId: args.outfitId,
          message: args.outfitName
            ? `${userName} saved a new outfit: "${args.outfitName}"`
            : `${userName} saved a new outfit`,
          read: false,
          createdAt: Date.now(),
        })
      )
    );
  },
});
