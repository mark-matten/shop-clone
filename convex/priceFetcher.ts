import { action } from "./_generated/server";
import { v } from "convex/values";

// Platform-specific price fetchers
type PriceResult = {
  success: boolean;
  price?: number;
  originalPrice?: number;
  available?: boolean;
  error?: string;
};

// Fetch price from Shopify stores (Everlane, etc.)
async function fetchShopifyPrice(sourceUrl: string): Promise<PriceResult> {
  try {
    const url = new URL(sourceUrl);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // Find products in path
    const productsIndex = pathParts.indexOf("products");
    if (productsIndex === -1 || productsIndex >= pathParts.length - 1) {
      return { success: false, error: "Could not parse Shopify product URL" };
    }

    const productSlug = pathParts[productsIndex + 1];
    const apiUrl = `${url.origin}/products/${productSlug}.json`;

    const response = await fetch(apiUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const product = data.product;

    if (!product || !product.variants || product.variants.length === 0) {
      return { success: false, error: "No product data found" };
    }

    // Get price from first available variant
    const variant = product.variants.find((v: { available: boolean }) => v.available) || product.variants[0];
    const price = parseFloat(variant.price);
    const comparePrice = variant.compare_at_price ? parseFloat(variant.compare_at_price) : undefined;

    return {
      success: true,
      price,
      originalPrice: comparePrice,
      available: variant.available,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Fetch price from Poshmark listings
async function fetchPoshmarkPrice(sourceUrl: string): Promise<PriceResult> {
  try {
    // Extract listing ID from URL
    const match = sourceUrl.match(/listing\/([^/?]+)/);
    if (!match) {
      return { success: false, error: "Could not parse Poshmark URL" };
    }

    // Poshmark doesn't have a public API, so we need to scrape the page
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();

    // Try to extract price from meta tags or page content
    const priceMatch = html.match(/"price":\s*"?\$?([\d.]+)"?/i) ||
                       html.match(/class="[^"]*price[^"]*"[^>]*>\s*\$?([\d.]+)/i) ||
                       html.match(/data-price="([\d.]+)"/);

    if (priceMatch) {
      return {
        success: true,
        price: parseFloat(priceMatch[1]),
        available: !html.includes("SOLD") && !html.includes("Not Available"),
      };
    }

    // Check if item is sold
    if (html.includes("SOLD") || html.includes("This listing has sold")) {
      return { success: true, price: 0, available: false };
    }

    return { success: false, error: "Could not parse price from page" };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Fetch price from TheRealReal
async function fetchTheRealRealPrice(sourceUrl: string): Promise<PriceResult> {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();

    // TheRealReal often has price in JSON-LD or specific elements
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd["@type"] === "Product" && jsonLd.offers) {
          const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
          return {
            success: true,
            price: parseFloat(offers.price),
            available: offers.availability?.includes("InStock"),
          };
        }
      } catch {
        // Continue to fallback parsing
      }
    }

    // Fallback: try to extract from page
    const priceMatch = html.match(/class="[^"]*price[^"]*"[^>]*>\s*\$?([\d,]+\.?\d*)/i);
    if (priceMatch) {
      return {
        success: true,
        price: parseFloat(priceMatch[1].replace(",", "")),
        available: !html.includes("Sold") && !html.includes("No Longer Available"),
      };
    }

    return { success: false, error: "Could not parse price" };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Fetch price from eBay listings
async function fetchEbayPrice(sourceUrl: string): Promise<PriceResult> {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();

    // eBay has price in meta tags
    const priceMatch = html.match(/<meta\s+itemprop="price"\s+content="([\d.]+)"/i) ||
                       html.match(/class="[^"]*x-price-primary[^"]*"[^>]*>.*?\$?([\d,]+\.?\d*)/is);

    if (priceMatch) {
      return {
        success: true,
        price: parseFloat(priceMatch[1].replace(",", "")),
        available: !html.includes("This listing has ended") && !html.includes("This item is out of stock"),
      };
    }

    return { success: false, error: "Could not parse eBay price" };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Main price fetcher that routes to platform-specific handlers
export async function fetchPriceFromSource(
  sourceUrl: string,
  sourcePlatform: string
): Promise<PriceResult> {
  const platform = sourcePlatform.toLowerCase();

  // Route to platform-specific fetcher
  if (platform === "everlane" || platform.includes("shopify")) {
    return fetchShopifyPrice(sourceUrl);
  }

  if (platform === "poshmark") {
    return fetchPoshmarkPrice(sourceUrl);
  }

  if (platform === "therealreal" || platform === "the realreal") {
    return fetchTheRealRealPrice(sourceUrl);
  }

  if (platform === "ebay") {
    return fetchEbayPrice(sourceUrl);
  }

  // For unknown platforms, return failure
  return { success: false, error: `Unsupported platform: ${sourcePlatform}` };
}

// Convex action to fetch price for a single product
export const fetchProductPrice = action({
  args: {
    sourceUrl: v.string(),
    sourcePlatform: v.string(),
  },
  handler: async (_ctx, args): Promise<PriceResult> => {
    return fetchPriceFromSource(args.sourceUrl, args.sourcePlatform);
  },
});

// Simulate price fetch for platforms without real fetching (fallback)
export function simulatePriceFetch(currentPrice: number): number {
  // Simulate price fluctuation: -10% to +10%
  const fluctuation = (Math.random() - 0.5) * 0.2;
  const newPrice = currentPrice * (1 + fluctuation);
  return Math.round(newPrice * 100) / 100;
}
