import { v } from "convex/values";
import { action, internalAction, internalQuery } from "./_generated/server";
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

// Parse natural language search using LLM (internal - called by searchProducts)
export const parseSearchQuery = internalAction({
  args: { searchText: v.string() },
  handler: async (ctx, args): Promise<SearchFilter> => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Fallback: return unstructured query if no API key
      return { query: args.searchText };
    }

    const systemPrompt = `You are a search query parser for a fashion/clothing e-commerce platform.
Parse the user's natural language search into a structured JSON object.

Extract these fields when present:
- query: the core search terms (always required)
- gender: "men", "women", or "unisex"
- category: product type (e.g., "boots", "jacket", "dress", "sneakers", "bag")
- brand: brand name if mentioned
- material: material type (e.g., "leather", "cotton", "silk", "denim")
- size: size mentioned (e.g., "8", "M", "32", "XL")
- condition: "new", "used", or "like_new"
- minPrice: minimum price as number (extract from phrases like "over $100")
- maxPrice: maximum price as number (extract from phrases like "under $200")

Return ONLY valid JSON, no explanation.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.searchText },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", await response.text());
      return { query: args.searchText };
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    // Ensure query field is always present
    return {
      query: parsed.query || args.searchText,
      ...parsed,
    };
  },
});

// Generate embedding for search query (internal - called by searchProducts and products)
export const generateEmbedding = internalAction({
  args: { text: v.string() },
  handler: async (_, args): Promise<number[]> => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: args.text,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  },
});

// Internal query to fetch products by IDs with price filtering
export const getProductsByIds = internalQuery({
  args: {
    ids: v.array(v.id("products")),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    size: v.optional(v.string()),
    material: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const products = await Promise.all(
      args.ids.map((id) => ctx.db.get(id))
    );

    return products.filter((product): product is NonNullable<typeof product> => {
      if (!product) return false;

      // Apply price filters
      if (args.minPrice !== undefined && product.price < args.minPrice) {
        return false;
      }
      if (args.maxPrice !== undefined && product.price > args.maxPrice) {
        return false;
      }

      // Apply size filter (case-insensitive partial match)
      if (args.size && product.size) {
        if (!product.size.toLowerCase().includes(args.size.toLowerCase())) {
          return false;
        }
      }

      // Apply material filter (case-insensitive partial match)
      if (args.material && product.material) {
        if (!product.material.toLowerCase().includes(args.material.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  },
});

// Main search action combining LLM parsing + vector search
export const searchProducts = action({
  args: {
    searchText: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Step 1: Parse search query with LLM
    const filter = await ctx.runAction(internal.search.parseSearchQuery, {
      searchText: args.searchText,
    });

    // Step 2: Generate embedding for semantic search
    const embedding = await ctx.runAction(internal.search.generateEmbedding, {
      text: filter.query,
    });

    // Step 3: Build vector search filter
    const vectorFilter: Record<string, string> = {};
    if (filter.gender) vectorFilter.gender = filter.gender;
    if (filter.category) vectorFilter.category = filter.category;
    if (filter.condition) vectorFilter.condition = filter.condition;

    // Step 4: Perform vector search
    const results = await ctx.vectorSearch("products", "by_embedding", {
      vector: embedding,
      limit: limit * 2, // Fetch extra for post-filtering
      filter: Object.keys(vectorFilter).length > 0
        ? (q) => {
            let expr = q;
            for (const [field, value] of Object.entries(vectorFilter)) {
              expr = expr.eq(field as "gender" | "category" | "condition", value as never);
            }
            return expr;
          }
        : undefined,
    });

    // Step 5: Get full product data with additional filtering
    const productIds = results.map((r) => r._id);
    const products = await ctx.runQuery(internal.search.getProductsByIds, {
      ids: productIds,
      minPrice: filter.minPrice,
      maxPrice: filter.maxPrice,
      size: filter.size,
      material: filter.material,
    });

    // Return with search metadata
    return {
      products: products.slice(0, limit),
      filter,
      totalResults: products.length,
    };
  },
});
