import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

// Get comprehensive user stats for dashboard
export const getUserStats = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return null;
    }

    // Get tracked items
    const trackedItems = await ctx.db
      .query("tracked_items")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    // Get favorites
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    // Get alerts
    const alerts = await ctx.db
      .query("price_alerts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    // Calculate total savings from alerts
    let totalSavings = 0;
    for (const alert of alerts) {
      if (alert.alertType === "target_reached" || alert.alertType === "price_drop") {
        totalSavings += alert.previousPrice - alert.newPrice;
      }
    }

    // Get price trends for tracked items
    const trackedWithTrends = await Promise.all(
      trackedItems.slice(0, 10).map(async (item) => {
        const product = await ctx.db.get(item.productId);
        const priceHistory = await ctx.db
          .query("price_history")
          .withIndex("by_productId", (q) => q.eq("productId", item.productId))
          .order("desc")
          .take(30);

        const prices = priceHistory.map((p) => p.price);
        const currentPrice = product?.price || 0;
        const highestPrice = Math.max(...prices, currentPrice);
        const lowestPrice = Math.min(...prices, currentPrice);
        const avgPrice = prices.length > 0
          ? prices.reduce((a, b) => a + b, 0) / prices.length
          : currentPrice;

        // Calculate trend (comparing current to 7-day average)
        const recentPrices = priceHistory.slice(0, 7).map((p) => p.price);
        const recentAvg = recentPrices.length > 0
          ? recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length
          : currentPrice;
        const trend = currentPrice < recentAvg ? "down" : currentPrice > recentAvg ? "up" : "stable";

        return {
          ...item,
          product,
          priceStats: {
            current: currentPrice,
            highest: highestPrice,
            lowest: lowestPrice,
            average: avgPrice,
            trend,
            savingsFromHigh: highestPrice - currentPrice,
          },
        };
      })
    );

    // Get unread alerts count
    const unreadAlerts = alerts.filter((a) => !a.sentAt).length;

    // Get search history count
    const searchHistory = await ctx.db
      .query("search_history")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .collect();

    return {
      userId: user._id,
      stats: {
        totalTracked: trackedItems.length,
        totalFavorites: favorites.length,
        totalAlerts: alerts.length,
        unreadAlerts,
        totalSavings: Math.round(totalSavings * 100) / 100,
        searchCount: searchHistory.length,
      },
      trackedItems: trackedWithTrends,
      recentAlerts: alerts.slice(0, 5).map((alert) => ({
        ...alert,
        isNew: !alert.sentAt,
      })),
    };
  },
});

// Get dashboard overview with charts data
export const getDashboardCharts = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return null;
    }

    // Get tracked items for price chart
    const trackedItems = await ctx.db
      .query("tracked_items")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(5);

    // Get 30-day price history for each
    const priceChartData = await Promise.all(
      trackedItems.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        const priceHistory = await ctx.db
          .query("price_history")
          .withIndex("by_productId", (q) => q.eq("productId", item.productId))
          .order("desc")
          .take(30);

        return {
          productId: item.productId,
          productName: product?.name || "Unknown",
          targetPrice: item.targetPrice,
          history: priceHistory.reverse().map((p) => ({
            date: new Date(p.checkedAt).toISOString().split("T")[0],
            price: p.price,
          })),
        };
      })
    );

    // Get savings over time (from alerts)
    const alerts = await ctx.db
      .query("price_alerts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const savingsOverTime: Record<string, number> = {};
    for (const alert of alerts) {
      const date = new Date(alert.createdAt).toISOString().split("T")[0];
      const savings = alert.previousPrice - alert.newPrice;
      savingsOverTime[date] = (savingsOverTime[date] || 0) + savings;
    }

    const savingsChart = Object.entries(savingsOverTime)
      .map(([date, savings]) => ({ date, savings: Math.round(savings * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    // Get activity by category
    const categoryBreakdown: Record<string, number> = {};
    for (const item of trackedItems) {
      const product = await ctx.db.get(item.productId);
      if (product) {
        categoryBreakdown[product.category] = (categoryBreakdown[product.category] || 0) + 1;
      }
    }

    return {
      priceCharts: priceChartData,
      savingsChart,
      categoryBreakdown: Object.entries(categoryBreakdown).map(([category, count]) => ({
        category,
        count,
      })),
    };
  },
});

// Update user stats (called after various actions)
export const updateUserStats = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all counts
    const trackedItems = await ctx.db
      .query("tracked_items")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const alerts = await ctx.db
      .query("price_alerts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Calculate total savings
    let totalSavings = 0;
    for (const alert of alerts) {
      totalSavings += alert.previousPrice - alert.newPrice;
    }

    // Check if stats record exists
    const existingStats = await ctx.db
      .query("user_stats")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const statsData = {
      userId: args.userId,
      totalSavings: Math.round(totalSavings * 100) / 100,
      itemsTracked: trackedItems.length,
      alertsReceived: alerts.length,
      favoriteCount: favorites.length,
      updatedAt: Date.now(),
    };

    if (existingStats) {
      await ctx.db.patch(existingStats._id, statsData);
    } else {
      await ctx.db.insert("user_stats", statsData);
    }
  },
});
