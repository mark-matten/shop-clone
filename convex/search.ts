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

Extract these fields when present:
- query: the core search terms (always required)
- gender: "men", "women", or "unisex"
- category: product type (e.g., "boots", "jacket", "dress", "sneakers", "bag", "sweater")
- brand: brand name if mentioned (e.g., "Nike", "Gucci", "Levi's")
- material: material type (e.g., "leather", "cotton", "silk", "denim", "cashmere")
- size: size mentioned (e.g., "8", "M", "32", "XL")
- condition: "new", "used", or "like_new"
- minPrice: minimum price as number (extract from phrases like "over $100")
- maxPrice: maximum price as number (extract from phrases like "under $200")

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

  // Gender detection
  if (query.includes("women") || query.includes("woman")) filter.gender = "women";
  else if (query.includes("men") || query.includes("man")) filter.gender = "men";

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

    // Apply filters
    products = products.filter((product) => {
      // Text search (name, description, brand)
      if (args.query) {
        const searchText = args.query.toLowerCase();
        const productText = `${product.name} ${product.description} ${product.brand} ${product.category} ${product.material || ""}`.toLowerCase();

        // Check if any word from query matches
        const queryWords = searchText.split(/\s+/).filter(w => w.length > 2);
        const hasMatch = queryWords.some(word => productText.includes(word));
        if (!hasMatch && queryWords.length > 0) return false;
      }

      // Exact filters
      if (args.gender && product.gender !== args.gender) return false;
      if (args.condition && product.condition !== args.condition) return false;

      // Partial match filters
      if (args.category && !product.category.toLowerCase().includes(args.category.toLowerCase())) return false;
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
    const limit = args.limit ?? 20;

    // Step 1: Parse search query with Claude
    const filter: SearchFilter = await ctx.runAction(internal.search.parseSearchQuery, {
      searchText: args.searchText,
    }) as SearchFilter;

    // Step 2: Query products with parsed filters
    const products: any[] = await ctx.runQuery(internal.search.filterProductsInternal, {
      ...filter,
      limit,
    });

    // Return with search metadata
    return {
      products,
      filter,
      totalResults: products.length,
    };
  },
});

// Internal version of filterProducts for use in actions
import { internalQuery } from "./_generated/server";

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

    products = products.filter((product) => {
      if (args.query) {
        const searchText = args.query.toLowerCase();
        const productText = `${product.name} ${product.description} ${product.brand} ${product.category} ${product.material || ""}`.toLowerCase();
        const queryWords = searchText.split(/\s+/).filter(w => w.length > 2);
        const hasMatch = queryWords.some(word => productText.includes(word));
        if (!hasMatch && queryWords.length > 0) return false;
      }

      if (args.gender && product.gender !== args.gender) return false;
      if (args.condition && product.condition !== args.condition) return false;
      if (args.category && !product.category.toLowerCase().includes(args.category.toLowerCase())) return false;
      if (args.brand && !product.brand.toLowerCase().includes(args.brand.toLowerCase())) return false;
      if (args.material && product.material && !product.material.toLowerCase().includes(args.material.toLowerCase())) return false;
      if (args.size && product.size && !product.size.toLowerCase().includes(args.size.toLowerCase())) return false;
      if (args.minPrice !== undefined && product.price < args.minPrice) return false;
      if (args.maxPrice !== undefined && product.price > args.maxPrice) return false;

      return true;
    });

    return products.slice(0, limit);
  },
});
