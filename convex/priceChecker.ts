import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

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
        return product ? { productId, currentPrice: product.price, sourceUrl: product.sourceUrl } : null;
      })
    );

    return productsWithPrices.filter((p): p is NonNullable<typeof p> => p !== null);
  },
});

// Simulate fetching price from external source
// In production, this would scrape or call APIs for each marketplace
function simulatePriceFetch(currentPrice: number): number {
  // Simulate price fluctuation: -10% to +10%
  const fluctuation = (Math.random() - 0.5) * 0.2;
  const newPrice = currentPrice * (1 + fluctuation);
  // Round to 2 decimal places
  return Math.round(newPrice * 100) / 100;
}

// Main cron job action - checks all tracked prices
export const checkAllTrackedPrices = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting price check for all tracked items...");

    // Get all tracked products with current prices
    const trackedProducts = await ctx.runQuery(internal.priceChecker.getTrackedProductIds);

    console.log(`Found ${trackedProducts.length} products to check`);

    let updatedCount = 0;
    let unchangedCount = 0;

    for (const product of trackedProducts) {
      try {
        // Simulate fetching new price (replace with actual scraping in production)
        const newPrice = simulatePriceFetch(product.currentPrice);

        // Record price history
        await ctx.runMutation(internal.tracking.recordPriceCheck, {
          productId: product.productId,
          price: newPrice,
        });

        // Update product price if changed
        if (newPrice !== product.currentPrice) {
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
      `Price check complete. Updated: ${updatedCount}, Unchanged: ${unchangedCount}`
    );

    // Check for alerts after price updates
    const alertResult = await ctx.runAction(internal.alerts.checkPricesAndAlert);

    return {
      checked: trackedProducts.length,
      updated: updatedCount,
      unchanged: unchangedCount,
      alertsCreated: alertResult.alertsCreated,
    };
  },
});

// Manual trigger for testing
export const triggerPriceCheck = internalAction({
  args: {},
  handler: async (ctx) => {
    return await ctx.runAction(internal.priceChecker.checkAllTrackedPrices);
  },
});
