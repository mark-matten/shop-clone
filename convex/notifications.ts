import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all notifications for a user
export const getNotifications = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    const limit = args.limit ?? 50;

    // Get notifications ordered by createdAt descending
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    // Fetch sender details for each notification
    const notificationsWithDetails = await Promise.all(
      notifications.map(async (notification) => {
        let fromUser = null;
        if (notification.fromUserId) {
          const sender = await ctx.db.get(notification.fromUserId);
          if (sender) {
            fromUser = {
              _id: sender._id,
              firstName: sender.firstName,
              lastName: sender.lastName,
            };
          }
        }

        return {
          ...notification,
          fromUser,
        };
      })
    );

    return notificationsWithDetails;
  },
});

// Get unread notification count
export const getUnreadCount = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return 0;
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) => q.eq("userId", user._id).eq("read", false))
      .collect();

    return unreadNotifications.length;
  },
});

// Mark a single notification as read
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

// Mark all notifications as read for a user
export const markAllAsRead = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get all unread notifications
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) => q.eq("userId", user._id).eq("read", false))
      .collect();

    // Mark each as read
    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, { read: true })
      )
    );

    return { markedCount: unreadNotifications.length };
  },
});

// Delete a notification
export const deleteNotification = mutation({
  args: {
    clerkId: v.string(),
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify the notification belongs to this user
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      throw new Error("Notification not found");
    }

    await ctx.db.delete(args.notificationId);
  },
});

// Clear all notifications for a user
export const clearAllNotifications = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get all notifications for this user
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    // Delete each notification
    await Promise.all(
      notifications.map((notification) => ctx.db.delete(notification._id))
    );

    return { deletedCount: notifications.length };
  },
});

// Internal: Create a notification (called from other mutations)
export const createNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("new_follower"),
      v.literal("follow_request"),
      v.literal("follow_request_approved"),
      v.literal("new_closet_item"),
      v.literal("new_wishlist_item"),
      v.literal("new_outfit"),
      v.literal("price_drop"),
      v.literal("target_reached")
    ),
    fromUserId: v.optional(v.id("users")),
    relatedId: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      fromUserId: args.fromUserId,
      relatedId: args.relatedId,
      message: args.message,
      read: false,
      createdAt: Date.now(),
    });
  },
});

// Get notifications for price alerts (combines old price_alerts with new notifications)
export const getPriceAlertNotifications = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    // Get price-related notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    return notifications.filter(
      (n) => n.type === "price_drop" || n.type === "target_reached"
    );
  },
});

// Get social notifications only
export const getSocialNotifications = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return [];
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 20);

    // Filter to social notifications only
    const socialTypes = [
      "new_follower",
      "follow_request",
      "follow_request_approved",
      "new_closet_item",
      "new_wishlist_item",
      "new_outfit",
    ];

    const socialNotifications = notifications.filter((n) =>
      socialTypes.includes(n.type)
    );

    // Fetch sender details
    const notificationsWithDetails = await Promise.all(
      socialNotifications.map(async (notification) => {
        let fromUser = null;
        if (notification.fromUserId) {
          const sender = await ctx.db.get(notification.fromUserId);
          if (sender) {
            fromUser = {
              _id: sender._id,
              firstName: sender.firstName,
              lastName: sender.lastName,
            };
          }
        }

        return {
          ...notification,
          fromUser,
        };
      })
    );

    return notificationsWithDetails;
  },
});
