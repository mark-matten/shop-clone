import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ==============================================
// TYPES
// ==============================================

interface ScrapedProduct {
  name: string;
  brand: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  gender?: "men" | "women" | "unisex";
  condition: "new" | "used" | "like_new";
  sourceUrl: string;
  sourcePlatform: string;
  imageUrl?: string;
  imageUrls?: string[];
  sizes?: string[];
  colorName?: string;
  colorHex?: string;
  material?: string;
}

interface ScrapeResult {
  success: boolean;
  products: ScrapedProduct[];
  error?: string;
  hasMore?: boolean;
  nextPage?: number;
}

// ==============================================
// SHOPIFY BRAND CONFIGURATIONS
// ==============================================

const SHOPIFY_BRANDS: Record<string, {
  domain: string;
  brandName: string;
  collections: { path: string; gender: "men" | "women" | "unisex"; category: string }[];
}> = {
  everlane: {
    domain: "www.everlane.com",
    brandName: "Everlane",
    collections: [
      { path: "womens-sale", gender: "women", category: "sale" },
      { path: "mens-sale", gender: "men", category: "sale" },
      { path: "womens-tees", gender: "women", category: "tops" },
      { path: "mens-tees-and-tanks", gender: "men", category: "tops" },
      { path: "womens-sweaters", gender: "women", category: "tops" },
      { path: "mens-sweaters", gender: "men", category: "tops" },
      { path: "womens-pants", gender: "women", category: "bottoms" },
      { path: "mens-pants", gender: "men", category: "bottoms" },
      { path: "womens-jeans", gender: "women", category: "bottoms" },
      { path: "mens-jeans", gender: "men", category: "bottoms" },
      { path: "womens-dresses", gender: "women", category: "dresses" },
      { path: "womens-outerwear", gender: "women", category: "outerwear" },
      { path: "mens-outerwear", gender: "men", category: "outerwear" },
      { path: "womens-shoes", gender: "women", category: "shoes" },
      { path: "mens-shoes", gender: "men", category: "shoes" },
    ],
  },
  outdoorvoices: {
    domain: "www.outdoorvoices.com",
    brandName: "Outdoor Voices",
    collections: [
      { path: "womens-tops", gender: "women", category: "tops" },
      { path: "mens-tops", gender: "men", category: "tops" },
      { path: "womens-bottoms", gender: "women", category: "bottoms" },
      { path: "mens-bottoms", gender: "men", category: "bottoms" },
      { path: "womens-outerwear", gender: "women", category: "outerwear" },
      { path: "mens-outerwear", gender: "men", category: "outerwear" },
      { path: "womens-dresses-and-jumpsuits", gender: "women", category: "dresses" },
    ],
  },
  frankandoak: {
    domain: "www.frankandoak.com",
    brandName: "Frank and Oak",
    collections: [
      { path: "women-tops", gender: "women", category: "tops" },
      { path: "men-tops", gender: "men", category: "tops" },
      { path: "women-bottoms", gender: "women", category: "bottoms" },
      { path: "men-bottoms", gender: "men", category: "bottoms" },
      { path: "women-outerwear", gender: "women", category: "outerwear" },
      { path: "men-outerwear", gender: "men", category: "outerwear" },
      { path: "women-dresses", gender: "women", category: "dresses" },
    ],
  },
  allbirds: {
    domain: "www.allbirds.com",
    brandName: "Allbirds",
    collections: [
      { path: "womens-shoes", gender: "women", category: "shoes" },
      { path: "mens-shoes", gender: "men", category: "shoes" },
      { path: "womens-apparel", gender: "women", category: "tops" },
      { path: "mens-apparel", gender: "men", category: "tops" },
      { path: "womens-socks", gender: "women", category: "accessories" },
      { path: "mens-socks", gender: "men", category: "accessories" },
    ],
  },
  taylorstitch: {
    domain: "www.taylorstitch.com",
    brandName: "Taylor Stitch",
    collections: [
      { path: "mens-shirts", gender: "men", category: "tops" },
      { path: "mens-tees", gender: "men", category: "tops" },
      { path: "mens-sweaters", gender: "men", category: "tops" },
      { path: "mens-pants", gender: "men", category: "bottoms" },
      { path: "mens-outerwear", gender: "men", category: "outerwear" },
      { path: "mens-accessories", gender: "men", category: "accessories" },
    ],
  },
  // Clare V. - currently blocking requests
  // clarev: {
  //   domain: "www.clarev.com",
  //   brandName: "Clare V.",
  //   collections: [
  //     { path: "all", gender: "women", category: "bags" },
  //   ],
  // },
  rebeccaminkoff: {
    domain: "www.rebeccaminkoff.com",
    brandName: "Rebecca Minkoff",
    collections: [
      { path: "handbags", gender: "women", category: "bags" },
      { path: "crossbody-bags", gender: "women", category: "bags" },
      { path: "totes", gender: "women", category: "bags" },
      { path: "clothing", gender: "women", category: "tops" },
      { path: "shoes", gender: "women", category: "shoes" },
      { path: "accessories", gender: "women", category: "accessories" },
    ],
  },
};

// Color name to hex mapping
const COLOR_HEX_MAP: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",
  ivory: "#FFFFF0",
  cream: "#FFFDD0",
  beige: "#F5F5DC",
  tan: "#D2B48C",
  grey: "#808080",
  gray: "#808080",
  charcoal: "#36454F",
  brown: "#8B4513",
  "dark brown": "#5C4033",
  chocolate: "#7B3F00",
  cognac: "#9A463D",
  camel: "#C19A6B",
  red: "#FF0000",
  burgundy: "#800020",
  wine: "#722F37",
  maroon: "#800000",
  pink: "#FFC0CB",
  blush: "#DE5D83",
  rose: "#FF007F",
  coral: "#FF7F50",
  blue: "#0000FF",
  navy: "#000080",
  "navy blue": "#000080",
  cobalt: "#0047AB",
  indigo: "#4B0082",
  teal: "#008080",
  green: "#008000",
  olive: "#808000",
  sage: "#BCB88A",
  forest: "#228B22",
  hunter: "#355E3B",
  yellow: "#FFFF00",
  gold: "#FFD700",
  mustard: "#FFDB58",
  orange: "#FFA500",
  rust: "#B7410E",
  purple: "#800080",
  violet: "#EE82EE",
  lavender: "#E6E6FA",
  plum: "#DDA0DD",
};

function getColorHex(colorName: string | undefined): string | undefined {
  if (!colorName) return undefined;
  const normalized = colorName.toLowerCase().trim();
  return COLOR_HEX_MAP[normalized];
}

// ==============================================
// SHOPIFY SCRAPER
// ==============================================

async function scrapeShopifyCollection(
  domain: string,
  brandName: string,
  collectionPath: string,
  gender: "men" | "women" | "unisex",
  defaultCategory: string,
  page: number = 1,
  limit: number = 50
): Promise<ScrapeResult> {
  try {
    const url = `https://${domain}/collections/${collectionPath}/products.json?limit=${limit}&page=${page}`;

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return { success: false, products: [], error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const products: ScrapedProduct[] = [];

    for (const product of data.products || []) {
      // Parse title for product name and color
      const titleParts = (product.title || "").split("|");
      const name = titleParts[0].trim();
      const colorName = titleParts.length > 1 ? titleParts[1].trim() : undefined;

      // Get price from variants
      const prices = (product.variants || [])
        .map((v: { price: string }) => parseFloat(v.price))
        .filter((p: number) => !isNaN(p) && p > 0);

      if (prices.length === 0) continue;

      const price = Math.min(...prices);

      // Get original price (compare_at_price) if on sale
      const compareAtPrices = (product.variants || [])
        .map((v: { compare_at_price: string | null }) =>
          v.compare_at_price ? parseFloat(v.compare_at_price) : null
        )
        .filter((p: number | null): p is number => p !== null && !isNaN(p) && p > price);

      const originalPrice = compareAtPrices.length > 0 ? Math.max(...compareAtPrices) : undefined;

      // Get sizes from variants or options
      const sizes: string[] = [];
      const sizeOption = product.options?.find((opt: { name: string }) =>
        opt.name.toLowerCase() === "size"
      );
      if (sizeOption?.values) {
        sizes.push(...sizeOption.values);
      }

      // Determine category from product_type, tags, or name
      let category = defaultCategory;
      const productType = (product.product_type || "").toLowerCase();
      // Tags can be array or comma-separated string
      const tagsRaw = product.tags || [];
      const tags = (Array.isArray(tagsRaw) ? tagsRaw.join(",") : String(tagsRaw)).toLowerCase();
      const nameLower = name.toLowerCase();

      if (productType.includes("shoe") || productType.includes("boot") ||
          tags.includes("shoes") || nameLower.includes("boot") ||
          nameLower.includes("shoe") || nameLower.includes("sneaker")) {
        category = "shoes";
      } else if (productType.includes("jacket") || productType.includes("coat") ||
                 productType.includes("outerwear") || tags.includes("outerwear")) {
        category = "outerwear";
      } else if (productType.includes("dress") || tags.includes("dresses")) {
        category = "dresses";
      } else if (productType.includes("pant") || productType.includes("jean") ||
                 productType.includes("short") || productType.includes("skirt") ||
                 tags.includes("bottoms")) {
        category = "bottoms";
      } else if (productType.includes("sweater") || productType.includes("shirt") ||
                 productType.includes("top") || productType.includes("tee") ||
                 tags.includes("tops")) {
        category = "tops";
      } else if (productType.includes("bag") || tags.includes("bags")) {
        category = "bags";
      }

      // Get description (strip HTML)
      const description = (product.body_html || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);

      // Get images
      const imageUrl = product.images?.[0]?.src;
      const imageUrls = product.images?.map((img: { src: string }) => img.src).filter(Boolean);

      // Build source URL
      const sourceUrl = `https://${domain}/products/${product.handle}`;

      products.push({
        name,
        brand: brandName,
        description: description || `${brandName} ${name}`,
        price,
        originalPrice,
        category,
        gender,
        condition: "new",
        sourceUrl,
        sourcePlatform: brandName,
        imageUrl,
        imageUrls: imageUrls?.length > 0 ? imageUrls : undefined,
        sizes: sizes.length > 0 ? sizes : undefined,
        colorName,
        colorHex: getColorHex(colorName),
      });
    }

    const hasMore = products.length === limit;

    return { success: true, products, hasMore, nextPage: hasMore ? page + 1 : undefined };
  } catch (error) {
    return { success: false, products: [], error: String(error) };
  }
}

// ==============================================
// MARKETPLACE SCRAPERS
// ==============================================

async function scrapePoshmarkSearch(
  query: string,
  maxItems: number = 50
): Promise<ScrapeResult> {
  try {
    const url = `https://poshmark.com/search?query=${encodeURIComponent(query)}&type=listings&availability=available`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });

    if (!response.ok) {
      return { success: false, products: [], error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const products: ScrapedProduct[] = [];

    // Extract listing data from HTML
    // Poshmark embeds listing data in script tags
    const scriptMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);

    if (scriptMatch) {
      try {
        const stateData = JSON.parse(scriptMatch[1]);
        const listings = stateData?.vm?.data?.results || stateData?.search?.listings || [];

        for (const listing of listings.slice(0, maxItems)) {
          if (!listing.price || !listing.title) continue;

          // Parse price (Poshmark uses cents)
          const price = typeof listing.price === 'number'
            ? listing.price / 100
            : parseFloat(String(listing.price).replace(/[^0-9.]/g, ''));

          if (isNaN(price) || price <= 0) continue;

          const originalPrice = listing.original_price
            ? (typeof listing.original_price === 'number'
              ? listing.original_price / 100
              : parseFloat(String(listing.original_price).replace(/[^0-9.]/g, '')))
            : undefined;

          // Determine category
          let category = "other";
          const catLower = (listing.category || listing.department || "").toLowerCase();
          if (catLower.includes("shoe") || catLower.includes("boot")) {
            category = "shoes";
          } else if (catLower.includes("jacket") || catLower.includes("coat") || catLower.includes("outerwear")) {
            category = "outerwear";
          } else if (catLower.includes("dress")) {
            category = "dresses";
          } else if (catLower.includes("pant") || catLower.includes("jean") || catLower.includes("short") || catLower.includes("skirt")) {
            category = "bottoms";
          } else if (catLower.includes("top") || catLower.includes("shirt") || catLower.includes("sweater") || catLower.includes("blouse")) {
            category = "tops";
          } else if (catLower.includes("bag") || catLower.includes("handbag") || catLower.includes("purse")) {
            category = "bags";
          }

          // Determine gender
          const deptLower = (listing.department || "").toLowerCase();
          const gender: "men" | "women" | "unisex" = deptLower.includes("men") && !deptLower.includes("women")
            ? "men"
            : deptLower.includes("women") ? "women" : "unisex";

          // Determine condition
          let condition: "new" | "used" | "like_new" = "used";
          const condStr = (listing.condition || "").toLowerCase();
          if (condStr.includes("nwt") || condStr.includes("new with tags") || condStr.includes("brand new")) {
            condition = "new";
          } else if (condStr.includes("nwot") || condStr.includes("like new") || condStr.includes("excellent")) {
            condition = "like_new";
          }

          products.push({
            name: listing.title,
            brand: listing.brand || "Unknown",
            description: listing.description || listing.title,
            price,
            originalPrice: originalPrice && originalPrice > price ? originalPrice : undefined,
            category,
            gender,
            condition,
            sourceUrl: `https://poshmark.com/listing/${listing.id}`,
            sourcePlatform: "Poshmark",
            imageUrl: listing.cover_shot?.url || listing.picture_url,
            sizes: listing.size ? [listing.size] : undefined,
            colorName: listing.color,
          });
        }
      } catch {
        // Fall back to regex parsing
      }
    }

    // Fallback: parse from HTML structure
    if (products.length === 0) {
      // Try to extract basic listing info from HTML
      const listingMatches = html.matchAll(/data-listing-id="([^"]+)"[\s\S]*?title="([^"]+)"[\s\S]*?(\$[\d.]+)/g);

      for (const match of listingMatches) {
        if (products.length >= maxItems) break;

        const [, id, title, priceStr] = match;
        const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));

        if (!isNaN(price) && price > 0) {
          products.push({
            name: title,
            brand: query.split(" ")[0] || "Unknown", // Use search query as brand hint
            description: title,
            price,
            category: "other",
            condition: "used",
            sourceUrl: `https://poshmark.com/listing/${id}`,
            sourcePlatform: "Poshmark",
          });
        }
      }
    }

    return { success: true, products };
  } catch (error) {
    return { success: false, products: [], error: String(error) };
  }
}

async function scrapeTheRealRealSearch(
  query: string,
  maxItems: number = 50
): Promise<ScrapeResult> {
  try {
    const url = `https://www.therealreal.com/shop?keywords=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });

    if (!response.ok) {
      return { success: false, products: [], error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const products: ScrapedProduct[] = [];

    // TheRealReal uses JSON-LD for product data
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);

    for (const match of jsonLdMatches) {
      try {
        const jsonLd = JSON.parse(match[1]);

        // Handle ItemList
        if (jsonLd["@type"] === "ItemList" && jsonLd.itemListElement) {
          for (const item of jsonLd.itemListElement.slice(0, maxItems)) {
            const product = item.item || item;
            if (!product.name || !product.offers) continue;

            const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
            const price = parseFloat(offers.price);

            if (isNaN(price) || price <= 0) continue;

            // Parse brand from name or use query
            const nameParts = product.name.split(" ");
            const brand = nameParts[0] || query.split(" ")[0] || "Designer";

            // Determine category
            let category = "other";
            const nameLower = product.name.toLowerCase();
            if (nameLower.includes("shoe") || nameLower.includes("boot") || nameLower.includes("sneaker") || nameLower.includes("heel") || nameLower.includes("sandal")) {
              category = "shoes";
            } else if (nameLower.includes("jacket") || nameLower.includes("coat") || nameLower.includes("blazer")) {
              category = "outerwear";
            } else if (nameLower.includes("dress")) {
              category = "dresses";
            } else if (nameLower.includes("pant") || nameLower.includes("jean") || nameLower.includes("short") || nameLower.includes("skirt") || nameLower.includes("trouser")) {
              category = "bottoms";
            } else if (nameLower.includes("top") || nameLower.includes("shirt") || nameLower.includes("blouse") || nameLower.includes("sweater") || nameLower.includes("cardigan")) {
              category = "tops";
            } else if (nameLower.includes("bag") || nameLower.includes("handbag") || nameLower.includes("purse") || nameLower.includes("clutch") || nameLower.includes("tote")) {
              category = "bags";
            }

            products.push({
              name: product.name,
              brand,
              description: product.description || product.name,
              price,
              category,
              gender: "women", // TRR is primarily women's
              condition: "used", // TRR is resale
              sourceUrl: product.url || `https://www.therealreal.com/products/${product.sku || ""}`,
              sourcePlatform: "TheRealReal",
              imageUrl: product.image,
            });
          }
        }
      } catch {
        // Continue to next script block
      }
    }

    // Fallback: extract from data attributes
    if (products.length === 0) {
      const productMatches = html.matchAll(/data-product-id="(\d+)"[\s\S]*?data-product-name="([^"]+)"[\s\S]*?data-product-price="([\d.]+)"/g);

      for (const match of productMatches) {
        if (products.length >= maxItems) break;

        const [, id, name, priceStr] = match;
        const price = parseFloat(priceStr);

        if (!isNaN(price) && price > 0) {
          products.push({
            name: decodeURIComponent(name),
            brand: query.split(" ")[0] || "Designer",
            description: decodeURIComponent(name),
            price,
            category: "other",
            gender: "women",
            condition: "used",
            sourceUrl: `https://www.therealreal.com/products/${id}`,
            sourcePlatform: "TheRealReal",
          });
        }
      }
    }

    return { success: true, products };
  } catch (error) {
    return { success: false, products: [], error: String(error) };
  }
}

async function scrapeEbaySearch(
  query: string,
  maxItems: number = 50
): Promise<ScrapeResult> {
  try {
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_sacat=0&LH_BIN=1&rt=nc`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });

    if (!response.ok) {
      return { success: false, products: [], error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const products: ScrapedProduct[] = [];

    // eBay embeds listing data in the page
    // Try to extract from srp-results
    const listingMatches = html.matchAll(/data-view="mi:1686\|iid:(\d+)"[\s\S]*?class="s-item__title"[^>]*>([^<]+)<[\s\S]*?class="s-item__price"[^>]*>\$?([\d,.]+)/g);

    for (const match of listingMatches) {
      if (products.length >= maxItems) break;

      const [, id, title, priceStr] = match;
      const price = parseFloat(priceStr.replace(/,/g, ''));

      if (isNaN(price) || price <= 0 || title.includes("Shop on eBay")) continue;

      // Determine category and condition from title
      const titleLower = title.toLowerCase();
      let category = "other";
      if (titleLower.includes("shoe") || titleLower.includes("boot") || titleLower.includes("sneaker")) {
        category = "shoes";
      } else if (titleLower.includes("jacket") || titleLower.includes("coat")) {
        category = "outerwear";
      } else if (titleLower.includes("dress")) {
        category = "dresses";
      } else if (titleLower.includes("pant") || titleLower.includes("jean") || titleLower.includes("short")) {
        category = "bottoms";
      } else if (titleLower.includes("shirt") || titleLower.includes("top") || titleLower.includes("sweater") || titleLower.includes("tee")) {
        category = "tops";
      } else if (titleLower.includes("bag") || titleLower.includes("purse")) {
        category = "bags";
      }

      let condition: "new" | "used" | "like_new" = "used";
      if (titleLower.includes("new with tags") || titleLower.includes("nwt") || titleLower.includes("brand new")) {
        condition = "new";
      } else if (titleLower.includes("nwot") || titleLower.includes("like new") || titleLower.includes("excellent")) {
        condition = "like_new";
      }

      // Try to extract brand from query or title
      const brand = query.split(" ")[0] || "Unknown";

      products.push({
        name: title.trim(),
        brand,
        description: title.trim(),
        price,
        category,
        condition,
        sourceUrl: `https://www.ebay.com/itm/${id}`,
        sourcePlatform: "eBay",
      });
    }

    // Alternative parsing using simpler patterns
    if (products.length === 0) {
      // Try a simpler regex for item links
      const simpleMatches = html.matchAll(/href="https:\/\/www\.ebay\.com\/itm\/(\d+)[^"]*"[^>]*>([^<]+)<[\s\S]*?>\$?([\d,.]+)</g);

      for (const match of simpleMatches) {
        if (products.length >= maxItems) break;

        const [, id, title, priceStr] = match;
        const price = parseFloat(priceStr.replace(/,/g, ''));

        if (!isNaN(price) && price > 0 && !title.includes("Shop on eBay")) {
          products.push({
            name: title.trim(),
            brand: query.split(" ")[0] || "Unknown",
            description: title.trim(),
            price,
            category: "other",
            condition: "used",
            sourceUrl: `https://www.ebay.com/itm/${id}`,
            sourcePlatform: "eBay",
          });
        }
      }
    }

    return { success: true, products };
  } catch (error) {
    return { success: false, products: [], error: String(error) };
  }
}

// ==============================================
// BATCH SCRAPING ACTIONS
// ==============================================

// Scrape a Shopify brand's collections
export const scrapeBrandCollections = internalAction({
  args: {
    brandKey: v.string(),
    maxProductsPerCollection: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    productsScraped: number;
    productsAdded: number;
    productsUpdated: number;
    errors: string[];
  }> => {
    const brand = SHOPIFY_BRANDS[args.brandKey];
    if (!brand) {
      return { success: false, productsScraped: 0, productsAdded: 0, productsUpdated: 0, errors: [`Unknown brand: ${args.brandKey}`] };
    }

    const maxPerCollection = args.maxProductsPerCollection || 100;
    const errors: string[] = [];
    let totalScraped = 0;
    let totalAdded = 0;
    let totalUpdated = 0;

    for (const collection of brand.collections) {
      console.log(`Scraping ${brand.brandName} - ${collection.path}...`);

      let page = 1;
      let hasMore = true;

      while (hasMore && totalScraped < maxPerCollection * brand.collections.length) {
        const result = await scrapeShopifyCollection(
          brand.domain,
          brand.brandName,
          collection.path,
          collection.gender,
          collection.category,
          page,
          50
        );

        if (!result.success) {
          errors.push(`${collection.path}: ${result.error}`);
          break;
        }

        totalScraped += result.products.length;

        // Save products to database
        for (const product of result.products) {
          try {
            const saveResult = await ctx.runMutation(internal.productScraper.upsertScrapedProduct, product);
            if (saveResult.isNew) {
              totalAdded++;
            } else {
              totalUpdated++;
            }
          } catch (error) {
            errors.push(`Failed to save ${product.name}: ${error}`);
          }
        }

        hasMore = result.hasMore || false;
        page++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`${brand.brandName} scrape complete. Scraped: ${totalScraped}, Added: ${totalAdded}, Updated: ${totalUpdated}`);

    return {
      success: errors.length === 0,
      productsScraped: totalScraped,
      productsAdded: totalAdded,
      productsUpdated: totalUpdated,
      errors,
    };
  },
});

// Scrape marketplace search results via the deployed API (uses Puppeteer on Vercel)
export const scrapeMarketplace = internalAction({
  args: {
    marketplace: v.union(v.literal("poshmark"), v.literal("therealreal"), v.literal("ebay")),
    searchQuery: v.string(),
    maxItems: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    productsScraped: number;
    productsAdded: number;
    productsUpdated: number;
    error?: string;
  }> => {
    const maxItems = args.maxItems || 30;

    // Use the production Vercel URL for the scraping API
    const appUrl = process.env.APP_URL || "https://shop-clone-gamma.vercel.app";
    const apiUrl = `${appUrl}/api/scrape-marketplace`;

    console.log(`Scraping ${args.marketplace} for "${args.searchQuery}" via ${apiUrl}...`);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marketplace: args.marketplace,
          query: args.searchQuery,
          maxItems,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error ${response.status}: ${errorText}`);
        return {
          success: false,
          productsScraped: 0,
          productsAdded: 0,
          productsUpdated: 0,
          error: `API error ${response.status}: ${errorText.slice(0, 200)}`,
        };
      }

      const data = await response.json();

      if (!data.success || !data.products) {
        return {
          success: false,
          productsScraped: 0,
          productsAdded: 0,
          productsUpdated: 0,
          error: data.error || "No products returned",
        };
      }

      let added = 0;
      let updated = 0;

      for (const product of data.products) {
        try {
          const saveResult = await ctx.runMutation(internal.productScraper.upsertScrapedProduct, {
            name: product.name,
            brand: product.brand,
            description: product.description,
            price: product.price,
            originalPrice: product.originalPrice,
            category: product.category,
            gender: product.gender,
            condition: product.condition,
            sourceUrl: product.sourceUrl,
            sourcePlatform: product.sourcePlatform,
            imageUrl: product.imageUrl,
            sizes: product.size ? [product.size] : undefined,
          });
          if (saveResult.isNew) {
            added++;
          } else {
            updated++;
          }
        } catch (error) {
          console.error(`Failed to save ${product.name}:`, error);
        }
      }

      console.log(`${args.marketplace} scrape complete. Found: ${data.products.length}, Added: ${added}, Updated: ${updated}`);

      return {
        success: true,
        productsScraped: data.products.length,
        productsAdded: added,
        productsUpdated: updated,
      };
    } catch (error) {
      console.error(`Error scraping ${args.marketplace}:`, error);
      return {
        success: false,
        productsScraped: 0,
        productsAdded: 0,
        productsUpdated: 0,
        error: String(error),
      };
    }
  },
});

// Run all scrapers
export const runAllScrapers = internalAction({
  args: {
    brands: v.optional(v.array(v.string())),
    marketplaceQueries: v.optional(v.array(v.object({
      marketplace: v.union(v.literal("poshmark"), v.literal("therealreal"), v.literal("ebay")),
      query: v.string(),
    }))),
  },
  handler: async (ctx, args): Promise<{
    totalScraped: number;
    totalAdded: number;
    totalUpdated: number;
    brandResults: Record<string, { scraped: number; added: number; updated: number }>;
    marketplaceResults: Record<string, { scraped: number; added: number; updated: number }>;
    errors: string[];
  }> => {
    const errors: string[] = [];
    let totalScraped = 0;
    let totalAdded = 0;
    let totalUpdated = 0;
    const brandResults: Record<string, { scraped: number; added: number; updated: number }> = {};
    const marketplaceResults: Record<string, { scraped: number; added: number; updated: number }> = {};

    // Scrape brands
    const brandsToScrape = args.brands || Object.keys(SHOPIFY_BRANDS);

    for (const brandKey of brandsToScrape) {
      try {
        const result = await ctx.runAction(internal.productScraper.scrapeBrandCollections, {
          brandKey,
          maxProductsPerCollection: 50,
        });

        brandResults[brandKey] = {
          scraped: result.productsScraped,
          added: result.productsAdded,
          updated: result.productsUpdated,
        };

        totalScraped += result.productsScraped;
        totalAdded += result.productsAdded;
        totalUpdated += result.productsUpdated;

        if (result.errors.length > 0) {
          errors.push(...result.errors.map(e => `${brandKey}: ${e}`));
        }
      } catch (error) {
        errors.push(`${brandKey}: ${error}`);
      }

      // Rate limiting between brands
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Scrape marketplaces
    const defaultQueries = [
      { marketplace: "poshmark" as const, query: "everlane" },
      { marketplace: "poshmark" as const, query: "reformation" },
      { marketplace: "therealreal" as const, query: "everlane" },
      { marketplace: "ebay" as const, query: "everlane dress" },
    ];

    const marketplaceQueries = args.marketplaceQueries || defaultQueries;

    for (const { marketplace, query } of marketplaceQueries) {
      try {
        const result = await ctx.runAction(internal.productScraper.scrapeMarketplace, {
          marketplace,
          searchQuery: query,
          maxItems: 30,
        });

        const key = `${marketplace}:${query}`;
        marketplaceResults[key] = {
          scraped: result.productsScraped,
          added: result.productsAdded,
          updated: result.productsUpdated,
        };

        totalScraped += result.productsScraped;
        totalAdded += result.productsAdded;
        totalUpdated += result.productsUpdated;

        if (result.error) {
          errors.push(`${key}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`${marketplace}:${query}: ${error}`);
      }

      // Rate limiting between searches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      totalScraped,
      totalAdded,
      totalUpdated,
      brandResults,
      marketplaceResults,
      errors,
    };
  },
});

// Public action to manually trigger scraping
export const triggerScrape = action({
  args: {
    type: v.union(v.literal("brand"), v.literal("marketplace"), v.literal("all")),
    brandKey: v.optional(v.string()),
    marketplace: v.optional(v.union(v.literal("poshmark"), v.literal("therealreal"), v.literal("ebay"))),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    productsScraped: number;
    productsAdded: number;
    productsUpdated: number;
    error?: string;
  }> => {
    if (args.type === "brand" && args.brandKey) {
      return await ctx.runAction(internal.productScraper.scrapeBrandCollections, {
        brandKey: args.brandKey,
      });
    }

    if (args.type === "marketplace" && args.marketplace && args.searchQuery) {
      return await ctx.runAction(internal.productScraper.scrapeMarketplace, {
        marketplace: args.marketplace,
        searchQuery: args.searchQuery,
      });
    }

    if (args.type === "all") {
      const result = await ctx.runAction(internal.productScraper.runAllScrapers, {});
      return {
        success: result.errors.length === 0,
        productsScraped: result.totalScraped,
        productsAdded: result.totalAdded,
        productsUpdated: result.totalUpdated,
        error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
      };
    }

    return { success: false, productsScraped: 0, productsAdded: 0, productsUpdated: 0, error: "Invalid parameters" };
  },
});

// ==============================================
// DATABASE MUTATIONS
// ==============================================

export const upsertScrapedProduct = internalMutation({
  args: {
    name: v.string(),
    brand: v.string(),
    description: v.string(),
    price: v.number(),
    originalPrice: v.optional(v.number()),
    category: v.string(),
    gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
    condition: v.union(v.literal("new"), v.literal("used"), v.literal("like_new")),
    sourceUrl: v.string(),
    sourcePlatform: v.string(),
    imageUrl: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    sizes: v.optional(v.array(v.string())),
    colorName: v.optional(v.string()),
    colorHex: v.optional(v.string()),
    material: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ id: string; isNew: boolean }> => {
    // Check if product exists by sourceUrl
    const existing = await ctx.db
      .query("products")
      .withIndex("by_sourceUrl", (q) => q.eq("sourceUrl", args.sourceUrl))
      .first();

    if (existing) {
      // Update existing product
      const oldPrice = existing.colorVariants?.[0]?.price ?? existing.price;

      // Build colorVariant for new structure
      const colorVariant = {
        colorName: args.colorName || "Default",
        colorHex: args.colorHex,
        sourceUrl: args.sourceUrl,
        imageUrl: args.imageUrl,
        imageUrls: args.imageUrls,
        price: args.price,
        originalPrice: args.originalPrice,
        sizes: (args.sizes || []).map(size => ({
          size,
          available: true,
        })),
      };

      await ctx.db.patch(existing._id, {
        name: args.name,
        description: args.description,
        price: args.price,
        originalPrice: args.originalPrice,
        imageUrl: args.imageUrl,
        imageUrls: args.imageUrls,
        sizes: args.sizes,
        colorName: args.colorName,
        colorHex: args.colorHex,
        colorVariants: [colorVariant],
      });

      // Record price change if significant
      if (oldPrice !== undefined && Math.abs(oldPrice - args.price) > 0.01) {
        await ctx.db.insert("price_history", {
          productId: existing._id,
          price: args.price,
          checkedAt: Date.now(),
        });
      }

      return { id: existing._id, isNew: false };
    }

    // Create new product
    const productKey = `${args.brand.toLowerCase()}::${args.name.toLowerCase().replace(/\s+/g, "-")}::${args.sourcePlatform.toLowerCase()}`;

    // Build colorVariant for new structure
    const colorVariant = {
      colorName: args.colorName || "Default",
      colorHex: args.colorHex,
      sourceUrl: args.sourceUrl,
      imageUrl: args.imageUrl,
      imageUrls: args.imageUrls,
      price: args.price,
      originalPrice: args.originalPrice,
      sizes: (args.sizes || []).map(size => ({
        size,
        available: true,
      })),
    };

    const id = await ctx.db.insert("products", {
      productKey,
      name: args.name,
      brand: args.brand,
      description: args.description,
      price: args.price,
      originalPrice: args.originalPrice,
      category: args.category,
      gender: args.gender,
      condition: args.condition,
      sourceUrl: args.sourceUrl,
      sourcePlatform: args.sourcePlatform,
      imageUrl: args.imageUrl,
      imageUrls: args.imageUrls,
      sizes: args.sizes,
      colorName: args.colorName,
      colorHex: args.colorHex,
      material: args.material,
      colorVariants: [colorVariant],
    });

    // Record initial price
    await ctx.db.insert("price_history", {
      productId: id,
      price: args.price,
      checkedAt: Date.now(),
    });

    return { id, isNew: true };
  },
});

// Get available brands
export const getAvailableBrands = internalQuery({
  args: {},
  handler: async () => {
    return Object.entries(SHOPIFY_BRANDS).map(([key, brand]) => ({
      key,
      name: brand.brandName,
      collectionsCount: brand.collections.length,
    }));
  },
});

// Get scraping stats
export const getScrapingStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();

    const byPlatform: Record<string, number> = {};
    const byBrand: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const product of products) {
      byPlatform[product.sourcePlatform] = (byPlatform[product.sourcePlatform] || 0) + 1;
      byBrand[product.brand] = (byBrand[product.brand] || 0) + 1;
      byCategory[product.category] = (byCategory[product.category] || 0) + 1;
    }

    return {
      totalProducts: products.length,
      byPlatform,
      byBrand,
      byCategory,
    };
  },
});
