import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Track an analytics event
export const trackEvent = mutation({
  args: {
    clerkId: v.optional(v.string()),
    sessionId: v.string(),
    eventType: v.string(),
    eventData: v.optional(v.any()),
    page: v.optional(v.string()),
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("analytics_events", {
      clerkId: args.clerkId,
      sessionId: args.sessionId,
      eventType: args.eventType,
      eventData: args.eventData,
      page: args.page,
      referrer: args.referrer,
      userAgent: args.userAgent,
      timestamp: Date.now(),
    });
  },
});

// Get event counts by type for a time period
export const getEventCounts = query({
  args: {
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const startTime = args.startTime ?? Date.now() - 7 * 24 * 60 * 60 * 1000; // Last 7 days
    const endTime = args.endTime ?? Date.now();

    const events = await ctx.db
      .query("analytics_events")
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), startTime),
          q.lte(q.field("timestamp"), endTime)
        )
      )
      .collect();

    // Count by event type
    const counts: Record<string, number> = {};
    for (const event of events) {
      counts[event.eventType] = (counts[event.eventType] || 0) + 1;
    }

    return {
      counts,
      total: events.length,
      period: { startTime, endTime },
    };
  },
});

// Get page view analytics
export const getPageViewStats = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 7;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const events = await ctx.db
      .query("analytics_events")
      .withIndex("by_eventType", (q) => q.eq("eventType", "page_view"))
      .filter((q) => q.gte(q.field("timestamp"), startTime))
      .collect();

    // Count by page
    const pageCounts: Record<string, number> = {};
    for (const event of events) {
      const page = event.page || "unknown";
      pageCounts[page] = (pageCounts[page] || 0) + 1;
    }

    // Sort by count
    const sorted = Object.entries(pageCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([page, count]) => ({ page, count }));

    return {
      pages: sorted,
      totalViews: events.length,
      uniqueSessions: new Set(events.map((e) => e.sessionId)).size,
    };
  },
});

// Get user engagement metrics
export const getUserEngagement = query({
  args: {
    clerkId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const events = await ctx.db
      .query("analytics_events")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .filter((q) => q.gte(q.field("timestamp"), startTime))
      .collect();

    // Calculate metrics
    const sessions = new Set(events.map((e) => e.sessionId)).size;
    const eventCounts: Record<string, number> = {};

    for (const event of events) {
      eventCounts[event.eventType] = (eventCounts[event.eventType] || 0) + 1;
    }

    // Calculate daily activity
    const dailyActivity: Record<string, number> = {};
    for (const event of events) {
      const date = new Date(event.timestamp).toISOString().split("T")[0];
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    }

    return {
      totalEvents: events.length,
      sessions,
      eventCounts,
      dailyActivity,
      averageEventsPerSession: sessions > 0 ? events.length / sessions : 0,
    };
  },
});

// Get conversion funnel data
export const getConversionFunnel = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 7;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const events = await ctx.db
      .query("analytics_events")
      .filter((q) => q.gte(q.field("timestamp"), startTime))
      .collect();

    // Define funnel stages
    const funnelEvents = [
      "page_view",
      "search",
      "product_view",
      "add_to_favorites",
      "track_price",
      "external_click",
    ];

    const funnelCounts: Record<string, Set<string>> = {};
    for (const stage of funnelEvents) {
      funnelCounts[stage] = new Set();
    }

    for (const event of events) {
      if (funnelEvents.includes(event.eventType)) {
        funnelCounts[event.eventType].add(event.sessionId);
      }
    }

    return funnelEvents.map((stage) => ({
      stage,
      sessions: funnelCounts[stage].size,
    }));
  },
});

// Get popular products (most viewed/interacted)
export const getPopularProducts = query({
  args: {
    days: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 7;
    const limit = args.limit ?? 10;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const events = await ctx.db
      .query("analytics_events")
      .withIndex("by_eventType", (q) => q.eq("eventType", "product_view"))
      .filter((q) => q.gte(q.field("timestamp"), startTime))
      .collect();

    // Count product views
    const productCounts: Record<string, number> = {};
    for (const event of events) {
      const productId = event.eventData?.productId;
      if (productId) {
        productCounts[productId] = (productCounts[productId] || 0) + 1;
      }
    }

    // Sort and get top products
    const topProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);

    // Fetch product details
    const productsWithDetails = await Promise.all(
      topProducts.map(async ([productId, viewCount]) => {
        const product = await ctx.db.get(productId as never);
        return {
          product,
          viewCount,
        };
      })
    );

    return productsWithDetails.filter((p) => p.product !== null);
  },
});
