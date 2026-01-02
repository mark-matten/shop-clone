import { v } from "convex/values";
import { action, internalAction, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Structured filter type from LLM parsing
export const searchFilterSchema = v.object({
  query: v.string(),
  gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
  category: v.optional(v.string()),
  brand: v.optional(v.string()),
  material: v.optional(v.string()),
  color: v.optional(v.string()),
  size: v.optional(v.string()),
  condition: v.optional(v.union(v.literal("new"), v.literal("used"), v.literal("like_new"))),
  minPrice: v.optional(v.number()),
  maxPrice: v.optional(v.number()),
});

export type SearchFilter = {
  query: string;
  gender?: "men" | "women" | "unisex";
  category?: string;
  brand?: string;
  material?: string;
  color?: string;
  size?: string;
  condition?: "new" | "used" | "like_new";
  minPrice?: number;
  maxPrice?: number;
};

// Parse natural language search using Claude
export const parseSearchQuery = internalAction({
  args: { searchText: v.string() },
  handler: async (ctx, args): Promise<SearchFilter> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // Fallback: return unstructured query if no API key
      console.log("No ANTHROPIC_API_KEY, using basic parsing");
      return parseBasic(args.searchText);
    }

    const systemPrompt = `You are a search query parser for a fashion/clothing e-commerce platform.
Parse the user's natural language search into a structured JSON object.

Extract ALL of these fields when present in the search:
- query: the original search text (always required)
- gender: "men" or "women" if the user says "men's", "women's", "mens", "womens", "for men", "for women"
- category: the product type like "boots", "jacket", "dress", "sneakers", "sandals", "bag", "sweater", "shoes", "shirt", "top", "pants", "coat"
- brand: brand name if mentioned (e.g., "Nike", "Gucci", "Levi's", "Everlane")
- material: material type like "leather", "cotton", "silk", "denim", "cashmere", "suede", "wool", "canvas"
- color: color like "black", "white", "red", "blue", "brown", "navy", "beige", "pink", "green"
- size: size like "8", "M", "32", "XL"
- condition: "new", "used", or "like_new"
- minPrice: minimum price as number (from "over $100" or "above $100")
- maxPrice: maximum price as number (from "under $200" or "below $200")

IMPORTANT:
- Extract color, material, and category if they appear ANYWHERE in the search
- For "women's black leather boots": gender=women, color=black, material=leather, category=boots
- Do NOT put color/material/category in the query field - extract them as separate fields

Return ONLY valid JSON, no explanation or markdown.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 256,
          system: systemPrompt,
          messages: [
            { role: "user", content: args.searchText },
          ],
        }),
      });

      if (!response.ok) {
        console.error("Claude API error:", await response.text());
        return parseBasic(args.searchText);
      }

      const data = await response.json();
      const content = data.content[0].text;

      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return parseBasic(args.searchText);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Get basic parser results as fallback for any missed fields
      const basicParsed = parseBasic(args.searchText);

      // Merge: LLM results take priority, but fill in missing fields from basic parser
      const result: SearchFilter = {
        query: parsed.query || args.searchText,
        ...parsed,
      };

      // Supplement with basic parser for any fields the LLM missed
      if (!result.color && basicParsed.color) result.color = basicParsed.color;
      if (!result.category && basicParsed.category) result.category = basicParsed.category;
      if (!result.material && basicParsed.material) result.material = basicParsed.material;
      if (!result.gender && basicParsed.gender) result.gender = basicParsed.gender;
      if (!result.condition && basicParsed.condition) result.condition = basicParsed.condition;

      return result;
    } catch (error) {
      console.error("Error parsing with Claude:", error);
      return parseBasic(args.searchText);
    }
  },
});

// Basic fallback parser (no LLM)
function parseBasic(searchText: string): SearchFilter {
  const query = searchText.toLowerCase();
  const filter: SearchFilter = { query: searchText };

  // Gender detection (including possessives like "men's" and "women's")
  if (query.includes("women") || query.includes("woman")) filter.gender = "women";
  else if (query.includes("men's") || query.includes("mens") || query.includes("men ") || query.includes("man")) filter.gender = "men";

  // Price detection
  const underMatch = query.match(/under \$?(\d+)/);
  if (underMatch) filter.maxPrice = parseInt(underMatch[1]);

  const overMatch = query.match(/over \$?(\d+)/);
  if (overMatch) filter.minPrice = parseInt(overMatch[1]);

  // Condition detection
  if (query.includes("like new")) filter.condition = "like_new";
  else if (query.includes("used")) filter.condition = "used";
  else if (query.includes("new") && !query.includes("sneaker")) filter.condition = "new";

  // Category detection - comprehensive list ordered by specificity (most specific first)
  const categories = [
    // Footwear - specific first
    "booties", "bootie", "boots", "boot",
    "sneakers", "sneaker", "trainers", "trainer",
    "sandals", "sandal",
    "stilettos", "stiletto", "pumps", "pump", "heels", "heel",
    "loafers", "loafer", "moccasins", "moccasin",
    "flats", "flat",
    "mules", "mule",
    "slippers", "slipper",
    "shoes", "shoe",
    // Outerwear - specific first
    "parkas", "parka", "anorak",
    "blazers", "blazer",
    "coats", "coat", "overcoat", "trench",
    "jackets", "jacket",
    "vests", "vest",
    // Sweaters/Knitwear - specific first
    "cardigans", "cardigan",
    "hoodies", "hoodie",
    "sweatshirts", "sweatshirt",
    "sweaters", "sweater", "pullover", "jumper",
    // Tops - specific first
    "blouses", "blouse",
    "t-shirts", "t-shirt", "tshirts", "tshirt", "tees", "tee",
    "tanks", "tank", "cami", "camisole",
    "shirts", "shirt",
    "tops", "top",
    // Bottoms - specific first
    "leggings", "legging", "tights",
    "skirts", "skirt",
    "shorts", "short",
    "jeans", "jean",
    "pants", "pant", "trousers", "trouser", "chinos", "chino",
    // Dresses - specific first
    "jumpsuits", "jumpsuit",
    "rompers", "romper",
    "gowns", "gown",
    "dresses", "dress",
    // Bags - specific first
    "backpacks", "backpack", "rucksack",
    "clutches", "clutch",
    "crossbody", "crossbodies",
    "satchels", "satchel",
    "totes", "tote",
    "purses", "purse", "handbags", "handbag",
    "bags", "bag",
    // Accessories - specific first
    "beanies", "beanie",
    "caps", "cap",
    "hats", "hat",
    "scarves", "scarf",
    "belts", "belt",
    "watches", "watch",
    "sunglasses",
    "gloves", "glove",
    "jewelry", "jewellery", "necklace", "bracelet", "earrings", "earring",
    // Socks
    "socks", "sock",
  ];
  for (const cat of categories) {
    if (query.includes(cat)) {
      filter.category = cat;
      break;
    }
  }

  // Color detection
  const colors = [
    "black", "white", "blue", "navy", "red", "pink", "green", "brown", "tan",
    "beige", "cream", "grey", "gray", "purple", "orange", "yellow", "gold",
    "burgundy", "olive", "coral", "teal", "ivory", "charcoal"
  ];
  for (const color of colors) {
    if (query.includes(color)) {
      filter.color = color;
      break;
    }
  }

  // Material detection
  const materials = [
    "leather", "suede", "canvas", "denim", "cotton", "wool", "cashmere",
    "silk", "linen", "velvet", "satin", "nylon", "polyester"
  ];
  for (const material of materials) {
    if (query.includes(material)) {
      filter.material = material;
      break;
    }
  }

  return filter;
}

// Query to search products with filters (no vector search)
export const filterProducts = query({
  args: {
    query: v.optional(v.string()),
    gender: v.optional(v.string()),
    category: v.optional(v.string()),
    brand: v.optional(v.string()),
    material: v.optional(v.string()),
    size: v.optional(v.string()),
    condition: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Get all products (in production, you'd want proper indexing)
    let products = await ctx.db.query("products").collect();

    // Words that are handled by specific filters and shouldn't require text matching
    const genderWords = ["women", "womens", "women's", "men", "mens", "men's", "unisex"];

    // Apply filters
    products = products.filter((product) => {
      // Text search with synonym expansion
      if (args.query) {
        const productText = `${product.name} ${product.description} ${product.brand} ${product.category} ${product.material || ""} ${product.colorName || ""}`.toLowerCase();
        const queryWords = expandQueryWithSynonyms(args.query);
        // Filter out gender words from text search since they're handled by gender filter
        const nonGenderWords = queryWords.filter(word => !genderWords.includes(word.toLowerCase()));
        // Only require text match if there are non-gender search terms
        if (nonGenderWords.length > 0) {
          const hasMatch = nonGenderWords.some(word => productText.includes(word));
          if (!hasMatch) return false;
        }
      }

      // Gender filter: include unisex products in men's or women's searches
      if (args.gender) {
        if (args.gender === "men" && product.gender !== "men" && product.gender !== "unisex") return false;
        if (args.gender === "women" && product.gender !== "women" && product.gender !== "unisex") return false;
        if (args.gender === "unisex" && product.gender !== "unisex") return false;
      }
      if (args.condition && product.condition !== args.condition) return false;

      // Category filter with synonym expansion
      if (args.category) {
        const categoryLower = args.category.toLowerCase();
        const productCategoryLower = product.category.toLowerCase();
        const expandedCategories = expandQueryWithSynonyms(categoryLower);
        const categoryMatches = expandedCategories.some(cat =>
          productCategoryLower.includes(cat) || cat.includes(productCategoryLower)
        );
        if (!categoryMatches) return false;
      }
      if (args.brand && !product.brand.toLowerCase().includes(args.brand.toLowerCase())) return false;
      if (args.material && product.material && !product.material.toLowerCase().includes(args.material.toLowerCase())) return false;
      if (args.size && product.size && !product.size.toLowerCase().includes(args.size.toLowerCase())) return false;

      // Price filters
      if (args.minPrice !== undefined && product.price < args.minPrice) return false;
      if (args.maxPrice !== undefined && product.price > args.maxPrice) return false;

      return true;
    });

    return products.slice(0, limit);
  },
});

// Check if a product is sold out (all variants unavailable)
function isProductSoldOut(product: any): boolean {
  if (!product.variants || product.variants.length === 0) {
    return false; // No variants means we assume it's available
  }
  return product.variants.every((v: any) => !v.available);
}

// Group products by colorGroupId and pick the best representative
function groupByColor(
  products: any[],
  searchedColor: string | undefined
): any[] {
  // Map to store: colorGroupId -> array of products
  const colorGroups = new Map<string, any[]>();
  // Products without colorGroupId are their own group
  const ungroupedProducts: any[] = [];

  for (const product of products) {
    if (product.colorGroupId) {
      const existing = colorGroups.get(product.colorGroupId);
      if (existing) {
        existing.push(product);
      } else {
        colorGroups.set(product.colorGroupId, [product]);
      }
    } else {
      ungroupedProducts.push(product);
    }
  }

  const result: any[] = [];

  // Process each color group
  for (const [groupId, groupProducts] of colorGroups) {
    // Count total colors in this group
    const colorVariantCount = groupProducts.length;

    // Separate in-stock and sold-out products
    const inStockProducts = groupProducts.filter(p => !isProductSoldOut(p));
    const candidateProducts = inStockProducts.length > 0 ? inStockProducts : groupProducts;

    // Pick the best representative
    let representative: any;

    if (searchedColor) {
      // User searched for a specific color - find matching variant (prefer in-stock)
      const searchColorLower = searchedColor.toLowerCase();
      representative = candidateProducts.find((p) => {
        const colorName = (p.colorName || "").toLowerCase();
        return colorName.includes(searchColorLower) || searchColorLower.includes(colorName);
      });

      // If the searched color is sold out, still show it but from all products
      if (!representative) {
        representative = groupProducts.find((p) => {
          const colorName = (p.colorName || "").toLowerCase();
          return colorName.includes(searchColorLower) || searchColorLower.includes(colorName);
        });
      }
    }

    // If no color match or no search color, pick lowest price from in-stock products
    if (!representative) {
      representative = candidateProducts.sort((a, b) => a.price - b.price)[0];
    }

    // Add color variant count to the representative
    result.push({
      ...representative,
      colorVariantCount,
    });
  }

  // Add ungrouped products (they're their own color variant)
  for (const product of ungroupedProducts) {
    result.push({
      ...product,
      colorVariantCount: 1,
    });
  }

  return result;
}

// Main search action combining LLM parsing + database filtering
export const searchProducts = action({
  args: {
    searchText: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    products: any[];
    filter: SearchFilter;
    totalResults: number;
    partialMatches?: any[];
  }> => {
    const limit = args.limit ?? 100; // Fetch more products before grouping

    // Step 1: Parse search query with Claude
    const filter: SearchFilter = await ctx.runAction(internal.search.parseSearchQuery, {
      searchText: args.searchText,
    }) as SearchFilter;

    // Step 2: Query products with query text and gender filter
    // Gender is passed to backend since it's essential for "women's" or "men's" searches
    // Other filters applied client-side to allow filter removal
    const products: any[] = await ctx.runQuery(internal.search.filterProductsInternal, {
      query: filter.query,
      gender: filter.gender,
      limit,
    });

    // Step 3: Group products by color and pick best representative
    const groupedProducts = groupByColor(products, filter.color);

    // Step 4: If no exact matches, get partial matches based on name similarity
    let partialMatches: any[] | undefined;
    if (groupedProducts.length === 0) {
      const rawPartialMatches = await ctx.runQuery(internal.search.getPartialMatches, {
        searchText: args.searchText,
        limit: 20,
      });
      // Also group partial matches
      partialMatches = groupByColor(rawPartialMatches, filter.color).slice(0, 10);
    }

    // Return products and filters (filters applied client-side)
    return {
      products: groupedProducts,
      filter,
      totalResults: groupedProducts.length,
      partialMatches,
    };
  },
});

// Synonym expansion for common search terms
const SYNONYMS: Record<string, string[]> = {
  // Colors
  white: ["white", "off-white", "ivory", "cream"],
  black: ["black", "charcoal", "onyx"],
  blue: ["blue", "navy", "indigo", "denim", "cobalt", "sky"],
  grey: ["grey", "gray", "charcoal", "heather", "slate"],
  gray: ["grey", "gray", "charcoal", "heather", "slate"],
  brown: ["brown", "tan", "camel", "cognac", "chocolate", "espresso"],
  green: ["green", "olive", "sage", "forest", "hunter", "moss"],
  red: ["red", "burgundy", "wine", "maroon", "crimson"],
  pink: ["pink", "blush", "rose", "coral", "hot pink", "fuchsia"],
  orange: ["orange", "coral", "peach", "rust"],
  yellow: ["yellow", "gold", "mustard", "lemon"],
  purple: ["purple", "violet", "lavender", "plum", "eggplant"],
  // Footwear - ONLY footwear items
  shoe: ["shoe", "shoes", "footwear"],
  shoes: ["shoe", "shoes", "footwear"],
  footwear: ["shoe", "shoes", "footwear"],
  boot: ["boot", "boots", "bootie", "booties"],
  boots: ["boot", "boots", "bootie", "booties"],
  sneaker: ["sneaker", "sneakers", "trainer", "trainers"],
  sneakers: ["sneaker", "sneakers", "trainer", "trainers"],
  sandal: ["sandal", "sandals"],
  sandals: ["sandal", "sandals"],
  heel: ["heel", "heels", "pump", "pumps"],
  heels: ["heel", "heels", "pump", "pumps"],
  loafer: ["loafer", "loafers"],
  loafers: ["loafer", "loafers"],
  // Sweaters/Knitwear - grouped together
  sweater: ["sweater", "sweaters", "cardigan", "cardigans", "pullover", "pullovers", "knit", "knitwear", "jumper", "jumpers", "crew", "sweatshirt"],
  sweaters: ["sweater", "sweaters", "cardigan", "cardigans", "pullover", "pullovers", "knit", "knitwear", "jumper", "jumpers", "crew", "sweatshirt"],
  cardigan: ["cardigan", "cardigans", "sweater", "sweaters", "knit", "knitwear"],
  cardigans: ["cardigan", "cardigans", "sweater", "sweaters", "knit", "knitwear"],
  sweatshirt: ["sweatshirt", "sweatshirts", "hoodie", "hoodies", "sweater", "sweaters"],
  hoodie: ["hoodie", "hoodies", "sweatshirt", "sweatshirts"],
  // Tops - shirts, tees, blouses (NOT sweaters)
  top: ["top", "tops"],
  tops: ["top", "tops"],
  shirt: ["shirt", "shirts", "blouse", "blouses", "button-down"],
  shirts: ["shirt", "shirts", "blouse", "blouses", "button-down"],
  blouse: ["blouse", "blouses", "shirt", "shirts"],
  tee: ["tee", "t-shirt", "tees", "t-shirts"],
  "t-shirt": ["tee", "t-shirt", "tees", "t-shirts"],
  // Outerwear
  jacket: ["jacket", "jackets", "coat", "coats", "blazer", "blazers"],
  jackets: ["jacket", "jackets", "coat", "coats", "blazer", "blazers"],
  coat: ["coat", "coats", "jacket", "jackets"],
  coats: ["coat", "coats", "jacket", "jackets"],
  blazer: ["blazer", "blazers"],
  outerwear: ["jacket", "jackets", "coat", "coats", "blazer", "blazers"],
  // Bottoms
  pants: ["pants", "pant", "trousers", "trouser", "chinos", "chino", "slacks"],
  jeans: ["jeans", "jean", "denim"],
  shorts: ["shorts", "short"],
  skirt: ["skirt", "skirts"],
  bottom: ["pants", "jeans", "shorts", "skirt"],
  bottoms: ["pants", "jeans", "shorts", "skirt"],
  // Bags
  bag: ["bag", "bags", "purse", "purses", "handbag", "handbags", "tote", "totes", "clutch"],
  bags: ["bag", "bags", "purse", "purses", "handbag", "handbags", "tote", "totes", "clutch"],
  purse: ["bag", "bags", "purse", "purses", "handbag", "handbags"],
  handbag: ["bag", "bags", "purse", "purses", "handbag", "handbags"],
  // Dresses
  dress: ["dress", "dresses"],
  dresses: ["dress", "dresses"],
  // Accessories
  socks: ["socks", "sock"],
  hat: ["hat", "hats", "cap", "caps", "beanie"],
  scarf: ["scarf", "scarves"],
  // Materials
  denim: ["jeans", "denim"],
  leather: ["leather"],
  // Conditions
  vintage: ["used", "vintage"],
  preloved: ["used", "like_new"],
  secondhand: ["used", "like_new"],
};

// All color words for detection
const ALL_COLOR_WORDS = new Set([
  "white", "off-white", "ivory", "cream", "bone",
  "black", "charcoal", "onyx", "ebony",
  "blue", "navy", "indigo", "cobalt", "sky", "azure", "teal", "turquoise",
  "grey", "gray", "heather", "slate", "silver",
  "brown", "tan", "camel", "cognac", "chocolate", "espresso", "khaki", "beige", "taupe",
  "green", "olive", "sage", "forest", "hunter", "moss", "emerald", "mint",
  "red", "burgundy", "wine", "maroon", "crimson", "scarlet",
  "pink", "blush", "rose", "coral", "fuchsia", "magenta", "hot pink",
  "orange", "peach", "rust", "terracotta",
  "yellow", "gold", "mustard", "lemon", "amber",
  "purple", "violet", "lavender", "plum", "eggplant", "lilac",
]);

// Category groups - items in the same group are considered similar
// Keywords here are used for DETECTION in the search query only
const CATEGORY_GROUPS: Record<string, string[]> = {
  // Sweaters/Knitwear - specific sub-categories
  sweaters: ["sweater", "sweaters", "pullover", "pullovers", "knitwear", "jumper", "jumpers"],
  cardigans: ["cardigan", "cardigans"],
  hoodies: ["hoodie", "hoodies"],
  sweatshirts: ["sweatshirt", "sweatshirts"],
  // General knitwear for broad searches
  knitwear: ["knitwear", "knit", "knits"],

  // Tops - specific sub-categories
  shirts: ["shirt", "shirts", "button-down", "button-up", "oxford"],
  blouses: ["blouse", "blouses"],
  tshirts: ["tee", "tees", "t-shirt", "t-shirts", "tshirt", "tshirts"],
  tanks: ["tank", "tanks", "cami", "camis", "camisole"],
  // General tops for broad searches
  tops: ["top", "tops"],

  // Footwear - specific sub-categories
  boots: ["boot", "boots", "bootie", "booties"],
  sneakers: ["sneaker", "sneakers", "trainer", "trainers"],
  sandals: ["sandal", "sandals"],
  heels: ["heel", "heels", "pump", "pumps", "stiletto", "stilettos"],
  loafers: ["loafer", "loafers", "moccasin", "moccasins"],
  flats: ["flat", "flats", "ballet"],
  mules: ["mule", "mules"],
  slippers: ["slipper", "slippers"],
  // General footwear for "shoes" search
  footwear: ["shoe", "shoes", "footwear"],

  // Outerwear - specific sub-categories
  jackets: ["jacket", "jackets"],
  coats: ["coat", "coats", "overcoat", "trench"],
  blazers: ["blazer", "blazers", "sport coat"],
  vests: ["vest", "vests", "gilet"],
  parkas: ["parka", "parkas", "anorak"],
  // General outerwear for broad searches
  outerwear: ["outerwear"],

  // Bottoms - specific sub-categories
  pants: ["pants", "pant", "trouser", "trousers", "chino", "chinos", "slacks"],
  jeans: ["jeans", "jean", "denim pants"],
  shorts: ["shorts", "short"],
  skirts: ["skirt", "skirts"],
  leggings: ["legging", "leggings", "tights"],
  // General bottoms for broad searches
  bottoms: ["bottoms", "bottom"],

  // Dresses - specific sub-categories
  dresses: ["dress", "dresses"],
  gowns: ["gown", "gowns", "evening dress"],
  rompers: ["romper", "rompers"],
  jumpsuits: ["jumpsuit", "jumpsuits", "playsuit"],

  // Bags - specific sub-categories
  totes: ["tote", "totes", "tote bag"],
  purses: ["purse", "purses", "handbag", "handbags"],
  backpacks: ["backpack", "backpacks", "rucksack"],
  clutches: ["clutch", "clutches", "evening bag"],
  crossbodys: ["crossbody", "crossbodies", "shoulder bag"],
  satchels: ["satchel", "satchels"],
  // General bags for broad searches
  bags: ["bag", "bags"],

  // Accessories - specific sub-categories
  hats: ["hat", "hats", "cap", "caps", "beanie", "beanies"],
  scarves: ["scarf", "scarves"],
  belts: ["belt", "belts"],
  jewelry: ["jewelry", "jewellery", "necklace", "bracelet", "earring", "earrings", "ring"],
  watches: ["watch", "watches"],
  sunglasses: ["sunglasses", "sunglass", "eyewear"],
  gloves: ["glove", "gloves", "mittens"],
  // General accessories for broad searches
  accessories: ["accessory", "accessories"],

  socks: ["sock", "socks"],
};

// Product categories that belong to each group (for matching products)
// More specific than CATEGORY_GROUPS to avoid false positives
const CATEGORY_PRODUCT_MATCHES: Record<string, string[]> = {
  // Sweaters/Knitwear - specific sub-categories
  sweaters: ["sweater", "sweaters", "pullover", "pullovers", "jumper", "jumpers"],
  cardigans: ["cardigan", "cardigans"],
  hoodies: ["hoodie", "hoodies"],
  sweatshirts: ["sweatshirt", "sweatshirts"],
  // General knitwear - matches any knitwear type
  knitwear: ["sweater", "sweaters", "cardigan", "cardigans", "knitwear", "sweatshirt", "hoodie", "pullover"],

  // Tops - specific sub-categories
  shirts: ["shirt", "shirts", "button-down", "button-up", "oxford", "dress shirt"],
  blouses: ["blouse", "blouses"],
  tshirts: ["tee", "tees", "t-shirt", "t-shirts", "tshirt"],
  tanks: ["tank", "tanks", "cami", "camis", "camisole"],
  // General tops - matches any top type
  tops: ["top", "tops", "shirt", "shirts", "blouse", "blouses", "tee", "t-shirt", "tank", "cami"],

  // Footwear - specific sub-categories
  boots: ["boot", "boots", "bootie", "booties"],
  sneakers: ["sneaker", "sneakers", "trainer", "trainers"],
  sandals: ["sandal", "sandals"],
  heels: ["heel", "heels", "pump", "pumps", "stiletto"],
  loafers: ["loafer", "loafers", "moccasin"],
  flats: ["flat", "flats", "ballet"],
  mules: ["mule", "mules"],
  slippers: ["slipper", "slippers"],
  // General footwear - matches any shoe type
  footwear: ["shoe", "shoes", "boot", "boots", "bootie", "booties", "sneaker", "sneakers", "sandal", "sandals", "heel", "heels", "loafer", "loafers", "flat", "flats", "pump", "pumps", "footwear", "mule", "mules", "slipper", "slippers"],

  // Outerwear - specific sub-categories
  jackets: ["jacket", "jackets"],
  coats: ["coat", "coats", "overcoat", "trench"],
  blazers: ["blazer", "blazers"],
  vests: ["vest", "vests", "gilet"],
  parkas: ["parka", "parkas", "anorak"],
  // General outerwear - matches any outerwear type
  outerwear: ["jacket", "jackets", "coat", "coats", "blazer", "blazers", "parka", "vest", "outerwear"],

  // Bottoms - specific sub-categories
  pants: ["pants", "pant", "trouser", "trousers", "chino", "chinos", "slacks"],
  jeans: ["jeans", "jean", "denim"],
  shorts: ["shorts", "short"],
  skirts: ["skirt", "skirts"],
  leggings: ["legging", "leggings", "tights"],
  // General bottoms - matches any bottom type
  bottoms: ["pants", "pant", "jeans", "jean", "shorts", "short", "skirt", "skirts", "trouser", "trousers", "chino", "chinos", "legging", "leggings"],

  // Dresses - specific sub-categories
  dresses: ["dress", "dresses"],
  gowns: ["gown", "gowns"],
  rompers: ["romper", "rompers"],
  jumpsuits: ["jumpsuit", "jumpsuits", "playsuit"],

  // Bags - specific sub-categories
  totes: ["tote", "totes"],
  purses: ["purse", "purses", "handbag", "handbags"],
  backpacks: ["backpack", "backpacks", "rucksack"],
  clutches: ["clutch", "clutches"],
  crossbodys: ["crossbody", "crossbodies"],
  satchels: ["satchel", "satchels"],
  // General bags - matches any bag type
  bags: ["bag", "bags", "purse", "purses", "handbag", "handbags", "tote", "totes", "clutch", "crossbody", "backpack", "satchel"],

  // Accessories - specific sub-categories
  hats: ["hat", "hats", "cap", "caps", "beanie", "beanies"],
  scarves: ["scarf", "scarves"],
  belts: ["belt", "belts"],
  jewelry: ["jewelry", "jewellery", "necklace", "bracelet", "earring", "earrings", "ring"],
  watches: ["watch", "watches"],
  sunglasses: ["sunglasses", "sunglass", "eyewear"],
  gloves: ["glove", "gloves", "mittens"],
  // General accessories - matches any accessory type
  accessories: ["hat", "hats", "scarf", "scarves", "belt", "belts", "jewelry", "watch", "sunglasses", "gloves", "accessory", "accessories"],

  socks: ["sock", "socks"],
};

// Categories that are EXCLUDED from each group (to prevent false positives)
const CATEGORY_EXCLUSIONS: Record<string, string[]> = {
  sweaters: ["sock", "socks", "shoe", "shoes", "boot", "boots", "dress", "dresses", "bag", "bags", "pants", "pant", "jeans", "shorts", "skirt"],
  tops: ["sweater", "sweaters", "cardigan", "sock", "socks", "shoe", "shoes", "dress", "dresses", "pants", "pant"],
  footwear: ["sock", "socks", "sweater", "shirt", "top", "dress", "pants", "bag"],
  dresses: ["sock", "socks", "shoe", "shoes", "sweater", "shirt", "pants", "bag"],
  bags: ["sock", "socks", "shoe", "shoes", "sweater", "shirt", "dress", "pants"],
};

// Detect which category group a word belongs to
function detectCategoryGroup(word: string): string | null {
  const lowerWord = word.toLowerCase();
  for (const [group, keywords] of Object.entries(CATEGORY_GROUPS)) {
    if (keywords.includes(lowerWord)) {
      return group;
    }
  }
  return null;
}

// Specific sub-categories that require name-based matching
// (because products often have generic categories like "shoes", "clothing", "bags" but specific names)
const SPECIFIC_SUBCATEGORIES = new Set([
  // Footwear
  "boots", "sneakers", "sandals", "heels", "loafers", "flats", "mules", "slippers",
  // Sweaters/Knitwear
  "sweaters", "cardigans", "hoodies", "sweatshirts",
  // Tops
  "shirts", "blouses", "tshirts", "tanks",
  // Outerwear
  "jackets", "coats", "blazers", "vests", "parkas",
  // Bottoms
  "pants", "jeans", "shorts", "skirts", "leggings",
  // Dresses
  "dresses", "gowns", "rompers", "jumpsuits",
  // Bags
  "totes", "purses", "backpacks", "clutches", "crossbodys", "satchels",
  // Accessories
  "hats", "scarves", "belts", "jewelry", "watches", "sunglasses", "gloves",
]);

// Check if a product's category matches a target category group
function productMatchesCategoryGroup(productCategory: string, productName: string, targetGroup: string): boolean {
  const categoryLower = productCategory.toLowerCase();
  const nameLower = productName.toLowerCase();

  // First check exclusions - if product category matches an exclusion, reject it
  const exclusions = CATEGORY_EXCLUSIONS[targetGroup] || [];
  for (const exclusion of exclusions) {
    if (categoryLower.includes(exclusion)) {
      return false;  // Product is in an excluded category
    }
  }

  // Use the stricter CATEGORY_PRODUCT_MATCHES for checking
  const targetKeywords = CATEGORY_PRODUCT_MATCHES[targetGroup] || [];

  // For specific sub-categories, also check the product name
  // because many products have generic categories like "shoes", "clothing", "bags"
  // but specific names like "The Chelsea Boot", "Cashmere Cardigan", "Leather Tote"
  if (SPECIFIC_SUBCATEGORIES.has(targetGroup)) {
    // For specific types, check BOTH category and name
    // Product must have the specific type in either category OR name
    for (const keyword of targetKeywords) {
      if (categoryLower.includes(keyword) || nameLower.includes(keyword)) {
        return true;
      }
    }
    return false;
  }

  // Check if product CATEGORY (not name) contains any of the target keywords
  // This prevents "Crew Sock" from matching "sweaters" just because "Crew" is in the name
  for (const keyword of targetKeywords) {
    if (categoryLower.includes(keyword)) {
      return true;
    }
  }

  // Also check if the product name contains specific keywords
  // but ONLY if the category is generic like "clothing", "shoes", "bags", etc.
  const genericCategories = ["clothing", "shoes", "bags", "accessories", "apparel"];
  if (genericCategories.some(gc => categoryLower.includes(gc))) {
    for (const keyword of targetKeywords) {
      // More specific check - must be the main product type, not a modifier
      const nameWords = nameLower.split(/\s+/);
      if (nameWords.includes(keyword) || nameLower.includes(keyword + " ") || nameLower.includes(" " + keyword)) {
        return true;
      }
    }
  }

  return false;
}

// Check if product color matches any of the target colors
function productMatchesColor(productColorName: string, targetColors: string[]): boolean {
  const colorLower = productColorName.toLowerCase();
  for (const targetColor of targetColors) {
    // Check for the color word in the product's color name
    if (colorLower.includes(targetColor)) {
      return true;
    }
    // Also check synonyms
    const synonyms = SYNONYMS[targetColor];
    if (synonyms) {
      for (const syn of synonyms) {
        if (colorLower.includes(syn)) {
          return true;
        }
      }
    }
  }
  return false;
}

function expandQueryWithSynonyms(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const expanded = new Set<string>();

  for (const word of words) {
    expanded.add(word);
    // Add synonyms if they exist
    if (SYNONYMS[word]) {
      SYNONYMS[word].forEach(syn => expanded.add(syn));
    }
  }

  return Array.from(expanded);
}

// Internal version of filterProducts for use in actions
import { internalQuery } from "./_generated/server";

// Calculate relevance score for a product given query words
function calculateRelevanceScore(
  product: {
    name: string;
    description: string;
    brand: string;
    category: string;
    material?: string;
    colorName?: string;
  },
  queryWords: string[]
): number {
  let score = 0;
  const nameLower = product.name.toLowerCase();
  const categoryLower = product.category.toLowerCase();
  const brandLower = product.brand.toLowerCase();
  const descLower = product.description.toLowerCase();
  const materialLower = (product.material || "").toLowerCase();
  const colorLower = (product.colorName || "").toLowerCase();

  // Common color words to detect if user is searching for a color
  const colorWords = ["white", "black", "blue", "navy", "grey", "gray", "brown", "tan", "green", "red", "pink", "cream", "ivory", "beige", "olive", "burgundy"];
  const isColorSearch = queryWords.some(w => colorWords.includes(w));

  for (const word of queryWords) {
    // Check if this word is a color-related term
    const isColorWord = colorWords.includes(word) ||
      ["off-white", "charcoal", "heather", "slate", "camel", "cognac", "sage", "moss", "coral", "blush"].includes(word);

    if (isColorWord) {
      // Color matches are highest priority when user searches for a color
      if (colorLower.includes(word)) {
        score += 25;  // Strong boost for matching color
      }
    } else {
      // Non-color word scoring
      if (categoryLower.includes(word) || nameLower.includes(word)) {
        score += 10;
      } else if (materialLower.includes(word)) {
        score += 5;
      } else if (brandLower.includes(word)) {
        score += 3;
      } else if (descLower.includes(word)) {
        score += 2;
      }
    }
  }

  // Penalty for non-matching color when user explicitly searched for a color
  if (isColorSearch && colorLower) {
    const matchesSearchedColor = queryWords.some(w => colorLower.includes(w));
    if (!matchesSearchedColor) {
      score -= 15;  // Penalize products that don't match the searched color
    }
  }

  return score;
}

// Public query for testing search with scores
export const searchWithScores = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 15;

    let products = await ctx.db.query("products").collect();

    // Parse query to extract color words and category words separately
    const queryLower = args.query.toLowerCase();
    const queryTokens = queryLower.split(/\s+/).filter(w => w.length > 1);

    // Detect color words in the query
    const detectedColors: string[] = [];
    for (const token of queryTokens) {
      if (ALL_COLOR_WORDS.has(token)) {
        detectedColors.push(token);
      }
    }

    // Detect category group in the query
    let detectedCategoryGroup: string | null = null;
    for (const token of queryTokens) {
      const group = detectCategoryGroup(token);
      if (group) {
        detectedCategoryGroup = group;
        break;
      }
    }

    // Filter and score products
    const scoredProducts = products
      .map((product) => {
        // Exclude gift cards from search results
        if (product.name.toLowerCase().includes('gift card')) return null;

        // STRICT COLOR MATCHING: If user searched for a color, product MUST match that color
        if (detectedColors.length > 0) {
          const productColor = product.colorName || "";
          if (!productMatchesColor(productColor, detectedColors)) {
            return null;
          }
        }

        // STRICT CATEGORY MATCHING: If user searched for a category, product MUST match that category group
        if (detectedCategoryGroup) {
          if (!productMatchesCategoryGroup(product.category, product.name, detectedCategoryGroup)) {
            return null;
          }
        }

        // Calculate relevance score
        let score = 0;

        // Score for color match
        if (detectedColors.length > 0 && product.colorName) {
          score += 25;
        }

        // Score for category match
        if (detectedCategoryGroup) {
          score += 20;
          const categoryLower = product.category.toLowerCase();
          if (CATEGORY_GROUPS[detectedCategoryGroup]?.some(kw => categoryLower.includes(kw))) {
            score += 10;
          }
        }

        return {
          name: product.name,
          brand: product.brand,
          category: product.category,
          colorName: product.colorName,
          price: product.price,
          score
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Sort by relevance score (highest first)
    scoredProducts.sort((a, b) => b.score - a.score);

    return {
      results: scoredProducts.slice(0, limit),
      detectedColors,
      detectedCategoryGroup,
      totalMatches: scoredProducts.length,
    };
  },
});

// Calculate name match score - how well query words match product name
function calculateNameMatchScore(productName: string, queryWords: string[]): number {
  const nameLower = productName.toLowerCase();
  const nameWords = nameLower.split(/\s+/);
  let score = 0;
  let matchedWords = 0;

  for (const queryWord of queryWords) {
    // Exact word match in name (highest priority)
    if (nameWords.includes(queryWord)) {
      score += 50;
      matchedWords++;
    }
    // Partial match (word contains query or query contains word)
    else if (nameLower.includes(queryWord)) {
      score += 30;
      matchedWords++;
    }
    // Check if any name word starts with the query word
    else if (nameWords.some(nw => nw.startsWith(queryWord) || queryWord.startsWith(nw))) {
      score += 20;
      matchedWords++;
    }
  }

  // Bonus for matching multiple words
  if (matchedWords >= 2) {
    score += matchedWords * 15;
  }

  return score;
}

export const filterProductsInternal = internalQuery({
  args: {
    query: v.optional(v.string()),
    gender: v.optional(v.string()),
    category: v.optional(v.string()),
    brand: v.optional(v.string()),
    material: v.optional(v.string()),
    size: v.optional(v.string()),
    condition: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    limit: v.optional(v.number()),
    includeScores: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let products = await ctx.db.query("products").collect();

    // Words that are handled by specific filters and shouldn't require text matching
    const genderWords = ["women", "womens", "women's", "men", "mens", "men's", "unisex"];

    // Parse query to extract color words and category words separately
    const queryLower = (args.query || "").toLowerCase();
    const queryTokens = queryLower.split(/\s+/).filter(w => w.length > 1);

    // Get query words for name matching (exclude only gender and color words, keep category words)
    // This allows product names like "The Glove Mule" to match when searching "glove mule"
    const nameMatchWords = queryTokens.filter(token =>
      !genderWords.includes(token) &&
      !ALL_COLOR_WORDS.has(token)
    );

    // Detect color words in the query
    const detectedColors: string[] = [];
    for (const token of queryTokens) {
      if (ALL_COLOR_WORDS.has(token)) {
        detectedColors.push(token);
      }
    }

    // Detect category group in the query
    let detectedCategoryGroup: string | null = null;
    for (const token of queryTokens) {
      const group = detectCategoryGroup(token);
      if (group) {
        detectedCategoryGroup = group;
        break;
      }
    }

    // Get query words for scoring (excluding gender words)
    const queryWords = args.query ? expandQueryWithSynonyms(args.query) : [];
    const nonGenderWords = queryWords.filter(word => !genderWords.includes(word.toLowerCase()));

    // Filter and score products
    const scoredProducts = products
      .map((product) => {
        // Exclude gift cards from search results
        if (product.name.toLowerCase().includes('gift card')) return null;

        // Calculate name match score FIRST
        const nameScore = calculateNameMatchScore(product.name, nameMatchWords);

        // If we have a strong name match (multiple words match), bypass strict filters
        const hasStrongNameMatch = nameScore >= 80;

        // STRICT COLOR MATCHING: If user searched for a color, product MUST match that color
        // (unless we have a strong name match)
        if (detectedColors.length > 0 && !hasStrongNameMatch) {
          const productColor = product.colorName || "";
          if (!productMatchesColor(productColor, detectedColors)) {
            return null;  // Product doesn't match the searched color - exclude it
          }
        }

        // STRICT CATEGORY MATCHING: If user searched for a category, product MUST match that category group
        // (unless we have a strong name match)
        if (detectedCategoryGroup && !hasStrongNameMatch) {
          if (!productMatchesCategoryGroup(product.category, product.name, detectedCategoryGroup)) {
            return null;  // Product doesn't match the searched category - exclude it
          }
        }

        // Gender filter: include unisex products in men's or women's searches
        if (args.gender) {
          // Normalize gender value (handle "mens", "men's", "womens", "women's")
          const normalizedGender = args.gender.toLowerCase().replace(/['s]+$/, '');
          if (normalizedGender === "men" && product.gender !== "men" && product.gender !== "unisex") return null;
          if (normalizedGender === "women" && product.gender !== "women" && product.gender !== "unisex") return null;
          if (normalizedGender === "unisex" && product.gender !== "unisex") return null;
        }
        if (args.condition && product.condition !== args.condition) return null;

        // Category filter with synonym expansion (for explicit category filter)
        if (args.category) {
          const categoryLower = args.category.toLowerCase();
          const productCategoryLower = product.category.toLowerCase();
          const expandedCategories = expandQueryWithSynonyms(categoryLower);
          const categoryMatches = expandedCategories.some(cat =>
            productCategoryLower.includes(cat) || cat.includes(productCategoryLower)
          );
          if (!categoryMatches) return null;
        }
        if (args.brand && !product.brand.toLowerCase().includes(args.brand.toLowerCase())) return null;
        if (args.material && product.material && !product.material.toLowerCase().includes(args.material.toLowerCase())) return null;
        if (args.size && product.size && !product.size.toLowerCase().includes(args.size.toLowerCase())) return null;
        if (args.minPrice !== undefined && product.price < args.minPrice) return null;
        if (args.maxPrice !== undefined && product.price > args.maxPrice) return null;

        // Calculate relevance score
        let score = nameScore; // Start with name match score

        // Score for color match
        if (detectedColors.length > 0 && product.colorName) {
          if (productMatchesColor(product.colorName, detectedColors)) {
            score += 25;  // Bonus for matching color
          }
        }

        // Score for category match
        if (detectedCategoryGroup) {
          if (productMatchesCategoryGroup(product.category, product.name, detectedCategoryGroup)) {
            score += 20;  // Base score for matching category
            // Bonus for exact category match
            const categoryLower = product.category.toLowerCase();
            if (CATEGORY_GROUPS[detectedCategoryGroup]?.some(kw => categoryLower.includes(kw))) {
              score += 10;
            }
          }
        }

        return { product, score };
      })
      .filter((item): item is { product: typeof products[0]; score: number } => item !== null);

    // Sort by relevance score (highest first)
    scoredProducts.sort((a, b) => b.score - a.score);

    // Return with or without scores based on flag
    if (args.includeScores) {
      return scoredProducts.slice(0, limit);
    }
    return scoredProducts.slice(0, limit).map(item => item.product);
  },
});

// Get partial matches based on name similarity when no exact matches found
export const getPartialMatches = internalQuery({
  args: {
    searchText: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const products = await ctx.db.query("products").collect();

    const queryLower = args.searchText.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    // Score all products by how well they match the query
    const scoredProducts = products
      .map((product) => {
        // Exclude gift cards
        if (product.name.toLowerCase().includes('gift card')) return null;

        const nameLower = product.name.toLowerCase();
        const brandLower = product.brand.toLowerCase();
        const categoryLower = product.category.toLowerCase();
        const descLower = (product.description || "").toLowerCase();
        const materialLower = (product.material || "").toLowerCase();
        const colorLower = (product.colorName || "").toLowerCase();

        let score = 0;

        for (const word of queryWords) {
          // Name matches are highest priority
          if (nameLower.includes(word)) {
            score += 50;
            // Bonus for word being a distinct part of the name
            if (nameLower.split(/\s+/).includes(word)) {
              score += 20;
            }
          }
          // Brand match
          else if (brandLower.includes(word)) {
            score += 15;
          }
          // Category match
          else if (categoryLower.includes(word)) {
            score += 10;
          }
          // Material/color match
          else if (materialLower.includes(word) || colorLower.includes(word)) {
            score += 8;
          }
          // Description match
          else if (descLower.includes(word)) {
            score += 3;
          }
        }

        // Only include products that have some match
        if (score === 0) return null;

        return { product, score };
      })
      .filter((item): item is { product: typeof products[0]; score: number } => item !== null);

    // Sort by score and return top matches
    scoredProducts.sort((a, b) => b.score - a.score);

    return scoredProducts.slice(0, limit).map(item => item.product);
  },
});
