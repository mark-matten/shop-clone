import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Get all alerts for a user
export const getUserAlerts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query("price_alerts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);

    // Get product details for each alert
    const alertsWithProducts = await Promise.all(
      alerts.map(async (alert) => {
        const product = await ctx.db.get(alert.productId);
        return {
          ...alert,
          product,
        };
      })
    );

    return alertsWithProducts;
  },
});

// Get unread alerts count for a user
export const getUnreadAlertsCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query("price_alerts")
      .withIndex("by_userId_unread", (q) => q.eq("userId", args.userId).eq("sentAt", undefined))
      .collect();

    return alerts.length;
  },
});

// Mark alert as read/sent
export const markAlertSent = mutation({
  args: { alertId: v.id("price_alerts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, { sentAt: Date.now() });
  },
});

// Mark all alerts as read for a user
export const markAllAlertsRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query("price_alerts")
      .withIndex("by_userId_unread", (q) => q.eq("userId", args.userId).eq("sentAt", undefined))
      .collect();

    for (const alert of alerts) {
      await ctx.db.patch(alert._id, { sentAt: Date.now() });
    }

    return { marked: alerts.length };
  },
});

// Internal mutation to create an alert
export const createAlert = internalMutation({
  args: {
    userId: v.id("users"),
    productId: v.id("products"),
    trackedItemId: v.id("tracked_items"),
    previousPrice: v.number(),
    newPrice: v.number(),
    targetPrice: v.number(),
    alertType: v.union(v.literal("target_reached"), v.literal("price_drop")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("price_alerts", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Check prices and create alerts for items that hit target
export const checkPricesAndAlert = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Checking prices for alerts...");

    // Get all tracked items with their current prices
    const trackedItems = await ctx.runQuery(internal.alerts.getTrackedItemsWithPrices);

    let alertsCreated = 0;

    for (const item of trackedItems) {
      if (!item.product || !item.targetPrice) continue;

      const currentPrice = item.product.price;
      const previousPrice = item.lastKnownPrice || currentPrice;

      // Check if price dropped to or below target
      if (currentPrice <= item.targetPrice && previousPrice > item.targetPrice) {
        await ctx.runMutation(internal.alerts.createAlert, {
          userId: item.userId,
          productId: item.productId,
          trackedItemId: item._id,
          previousPrice,
          newPrice: currentPrice,
          targetPrice: item.targetPrice,
          alertType: "target_reached",
        });
        alertsCreated++;
        console.log(`Alert created: ${item.product.name} hit target price $${item.targetPrice}`);
      }
      // Check for significant price drop (>10%)
      else if (currentPrice < previousPrice * 0.9) {
        await ctx.runMutation(internal.alerts.createAlert, {
          userId: item.userId,
          productId: item.productId,
          trackedItemId: item._id,
          previousPrice,
          newPrice: currentPrice,
          targetPrice: item.targetPrice,
          alertType: "price_drop",
        });
        alertsCreated++;
        console.log(`Alert created: ${item.product.name} dropped ${((1 - currentPrice / previousPrice) * 100).toFixed(1)}%`);
      }
    }

    console.log(`Created ${alertsCreated} alerts`);
    return { alertsCreated };
  },
});

// Get tracked items with their product prices
export const getTrackedItemsWithPrices = internalQuery({
  args: {},
  handler: async (ctx) => {
    const trackedItems = await ctx.db.query("tracked_items").collect();

    const itemsWithPrices = await Promise.all(
      trackedItems.map(async (item) => {
        const product = await ctx.db.get(item.productId);

        // Get last price from history
        const lastPriceRecord = await ctx.db
          .query("price_history")
          .withIndex("by_productId", (q) => q.eq("productId", item.productId))
          .order("desc")
          .first();

        return {
          ...item,
          product,
          lastKnownPrice: lastPriceRecord?.price,
        };
      })
    );

    return itemsWithPrices;
  },
});

// Simulate sending SMS alert (in production, integrate with Twilio/Clerk)
export const sendSMSAlert = internalAction({
  args: {
    alertId: v.id("price_alerts"),
  },
  handler: async (ctx, args) => {
    const alert = await ctx.runQuery(internal.alerts.getAlertById, { alertId: args.alertId });
    if (!alert) return { success: false, error: "Alert not found" };

    const user = await ctx.runQuery(internal.alerts.getUserById, { userId: alert.userId });
    if (!user) return { success: false, error: "User not found" };

    // In production, send actual SMS via Twilio or Clerk
    console.log(`[SMS SIMULATION] To: ${user.phoneNumber}`);
    console.log(`Price Alert! ${alert.product?.name} is now $${alert.newPrice} (was $${alert.previousPrice})`);

    // Mark as sent
    await ctx.runMutation(internal.alerts.markAlertSentInternal, { alertId: args.alertId });

    return { success: true };
  },
});

// Internal query to get alert by ID
export const getAlertById = internalQuery({
  args: { alertId: v.id("price_alerts") },
  handler: async (ctx, args) => {
    const alert = await ctx.db.get(args.alertId);
    if (!alert) return null;

    const product = await ctx.db.get(alert.productId);
    return { ...alert, product };
  },
});

// Internal query to get user by ID
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Internal mutation to mark alert as sent
export const markAlertSentInternal = internalMutation({
  args: { alertId: v.id("price_alerts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, { sentAt: Date.now() });
  },
});
