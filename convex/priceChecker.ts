import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { fetchPriceFromSource, simulatePriceFetch } from "./priceFetcher";

// Get all unique tracked product IDs
export const getTrackedProductIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const trackedItems = await ctx.db.query("tracked_items").collect();
    const uniqueProductIds = [...new Set(trackedItems.map((item) => item.productId))];

    // Get current prices for these products
    const productsWithPrices = await Promise.all(
      uniqueProductIds.map(async (productId) => {
        const product = await ctx.db.get(productId);
        if (!product) return null;

        // Get price from colorVariants (new structure) or legacy price field
        let currentPrice: number | undefined;
        if (product.colorVariants && product.colorVariants.length > 0) {
          currentPrice = product.colorVariants[0].price;
        } else {
          currentPrice = product.price;
        }

        // Get sourceUrl from colorVariants (new structure) or legacy field
        let sourceUrl: string | undefined;
        if (product.colorVariants && product.colorVariants.length > 0) {
          sourceUrl = product.colorVariants[0].sourceUrl;
        } else {
          sourceUrl = product.sourceUrl;
        }

        if (currentPrice === undefined || sourceUrl === undefined) return null;

        return { productId, currentPrice, sourceUrl, sourcePlatform: product.sourcePlatform };
      })
    );

    return productsWithPrices.filter((p): p is NonNullable<typeof p> => p !== null);
  },
});

// simulatePriceFetch is now imported from priceFetcher.ts

// Main cron job action - checks all tracked prices
export const checkAllTrackedPrices = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    checked: number;
    updated: number;
    unchanged: number;
    realFetched: number;
    simulated: number;
    alertsCreated: number;
  }> => {
    console.log("Starting price check for all tracked items...");

    // Get all tracked products with current prices
    const trackedProducts: Array<{
      productId: any;
      currentPrice: number;
      sourceUrl: string;
      sourcePlatform: string;
    }> = await ctx.runQuery(internal.priceChecker.getTrackedProductIds);

    console.log(`Found ${trackedProducts.length} products to check`);

    let updatedCount = 0;
    let unchangedCount = 0;
    let realFetchedCount = 0;
    let simulatedCount = 0;

    for (const product of trackedProducts) {
      try {
        let newPrice: number;

        // Try to fetch real price from source
        const priceResult = await fetchPriceFromSource(
          product.sourceUrl,
          product.sourcePlatform
        );

        if (priceResult.success && priceResult.price !== undefined && priceResult.price > 0) {
          // Use real fetched price
          newPrice = priceResult.price;
          realFetchedCount++;
          console.log(
            `Real price fetched for ${product.sourcePlatform}: $${newPrice}`
          );
        } else {
          // Fall back to simulation if real fetch fails
          newPrice = simulatePriceFetch(product.currentPrice);
          simulatedCount++;
          console.log(
            `Price simulated for ${product.sourcePlatform} (${priceResult.error || "unknown error"}): $${newPrice}`
          );
        }

        // Record price history
        await ctx.runMutation(internal.tracking.recordPriceCheck, {
          productId: product.productId,
          price: newPrice,
        });

        // Update product price if changed significantly (more than 0.01)
        if (Math.abs(newPrice - product.currentPrice) > 0.01) {
          await ctx.runMutation(internal.tracking.updateProductPrice, {
            productId: product.productId,
            newPrice,
          });
          updatedCount++;

          console.log(
            `Price updated for product ${product.productId}: $${product.currentPrice} -> $${newPrice}`
          );
        } else {
          unchangedCount++;
        }
      } catch (error) {
        console.error(`Failed to check price for product ${product.productId}:`, error);
      }
    }

    console.log(
      `Price check complete. Updated: ${updatedCount}, Unchanged: ${unchangedCount}, Real: ${realFetchedCount}, Simulated: ${simulatedCount}`
    );

    // Check for alerts after price updates
    const alertResult = await ctx.runAction(internal.alerts.checkPricesAndAlert) as { alertsCreated: number };

    return {
      checked: trackedProducts.length,
      updated: updatedCount,
      unchanged: unchangedCount,
      realFetched: realFetchedCount,
      simulated: simulatedCount,
      alertsCreated: alertResult.alertsCreated,
    };
  },
});

// Manual trigger for testing
export const triggerPriceCheck = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    checked: number;
    updated: number;
    unchanged: number;
    alertsCreated: number;
  }> => {
    return await ctx.runAction(internal.priceChecker.checkAllTrackedPrices) as {
      checked: number;
      updated: number;
      unchanged: number;
      alertsCreated: number;
    };
  },
});
