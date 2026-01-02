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

Extract these fields ONLY when EXPLICITLY mentioned by the user:
- query: the core search terms (always required)
- gender: ONLY set if user explicitly says "men's", "women's", "mens", "womens", "for men", "for women". Do NOT infer gender.
- category: product type (e.g., "boots", "jacket", "dress", "sneakers", "bag", "sweater", "shoes", "shirt", "top", "pants")
- brand: brand name if mentioned (e.g., "Nike", "Gucci", "Levi's", "Everlane")
- material: material type (e.g., "leather", "cotton", "silk", "denim", "cashmere", "suede", "wool")
- color: color if mentioned (e.g., "black", "white", "red", "blue", "brown", "navy", "beige")
- size: size mentioned (e.g., "8", "M", "32", "XL")
- condition: "new", "used", or "like_new"
- minPrice: minimum price as number (extract from phrases like "over $100")
- maxPrice: maximum price as number (extract from phrases like "under $200")

IMPORTANT: Do NOT include fields that aren't explicitly mentioned. Do NOT guess or infer values.

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

      // Ensure query field is always present
      return {
        query: parsed.query || args.searchText,
        ...parsed,
      };
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
  else if (query.includes("new")) filter.condition = "new";

  // Category detection
  const categories = ["boots", "jacket", "dress", "sneakers", "bag", "sweater", "shoes", "coat"];
  for (const cat of categories) {
    if (query.includes(cat)) {
      filter.category = cat;
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
  }> => {
    const limit = args.limit ?? 50; // Fetch more products for client-side filtering

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

    // Return products and filters (filters applied client-side)
    return {
      products,
      filter,
      totalResults: products.length,
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
  pink: ["pink", "blush", "rose", "coral"],
  // Footwear
  shoe: ["boots", "sneakers", "sandals", "heels", "loafers", "shoes", "shoe"],
  shoes: ["boots", "sneakers", "sandals", "heels", "loafers", "shoe", "shoes"],
  footwear: ["boots", "sneakers", "sandals", "heels", "loafers", "shoes", "shoe"],
  boot: ["boots", "boot"],
  boots: ["boots", "boot"],
  sneaker: ["sneakers", "sneaker"],
  sneakers: ["sneakers", "sneaker"],
  // Tops
  top: ["shirt", "blouse", "t-shirt", "sweater", "cardigan", "tops", "tee"],
  tops: ["shirt", "blouse", "t-shirt", "sweater", "cardigan", "top", "tee"],
  shirt: ["shirt", "blouse", "top", "tops", "tee", "button-down"],
  shirts: ["shirt", "blouse", "top", "tops", "tee", "button-down"],
  blouse: ["blouse", "shirt", "top"],
  tee: ["t-shirt", "tee", "shirt", "top"],
  // Outerwear
  outerwear: ["jacket", "coat", "blazer"],
  coats: ["coat", "jacket"],
  jackets: ["jacket", "coat", "blazer"],
  // Bottoms
  bottom: ["pants", "jeans", "shorts", "skirt", "chino", "trouser"],
  bottoms: ["pants", "jeans", "shorts", "skirt", "chino", "trouser"],
  pants: ["pants", "jeans", "chino", "trouser", "pant"],
  chinos: ["chino", "pants", "trouser"],
  trousers: ["trouser", "pants", "chino"],
  // Bags
  bags: ["bag", "purse", "handbag"],
  purse: ["bag", "handbag"],
  handbag: ["bag", "purse"],
  // Dresses
  dresses: ["dress"],
  // Materials
  denim: ["jeans", "denim"],
  leather: ["leather", "boots", "bag"],
  // Conditions
  vintage: ["used", "vintage"],
  preloved: ["used", "like_new"],
  secondhand: ["used", "like_new"],
};

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
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let products = await ctx.db.query("products").collect();

    // Words that are handled by specific filters and shouldn't require text matching
    const genderWords = ["women", "womens", "women's", "men", "mens", "men's", "unisex"];

    // Get query words for scoring
    const queryWords = args.query ? expandQueryWithSynonyms(args.query) : [];
    const nonGenderWords = queryWords.filter(word => !genderWords.includes(word.toLowerCase()));

    // Filter and score products
    const scoredProducts = products
      .map((product) => {
        // Exclude gift cards from search results
        if (product.name.toLowerCase().includes('gift card')) return null;

        // Apply filters first
        if (args.query && nonGenderWords.length > 0) {
          const productText = `${product.name} ${product.description} ${product.brand} ${product.category} ${product.material || ""} ${product.colorName || ""}`.toLowerCase();
          const hasMatch = nonGenderWords.some(word => productText.includes(word));
          if (!hasMatch) return null;
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

        // Category filter with synonym expansion
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
        const score = nonGenderWords.length > 0
          ? calculateRelevanceScore(product, nonGenderWords)
          : 0;

        return { product, score };
      })
      .filter((item): item is { product: typeof products[0]; score: number } => item !== null);

    // Sort by relevance score (highest first)
    scoredProducts.sort((a, b) => b.score - a.score);

    return scoredProducts.slice(0, limit).map(item => item.product);
  },
});
