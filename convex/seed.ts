import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Sample product data for seeding
const sampleProducts = [
  {
    name: "Women's Black Leather Ankle Boots",
    description: "Classic black leather ankle boots with a comfortable block heel. Perfect for everyday wear or dressing up.",
    brand: "Sam Edelman",
    price: 149.99,
    material: "Leather",
    size: "8",
    category: "boots",
    gender: "women" as const,
    condition: "new" as const,
    sourceUrl: "https://poshmark.com/listing/sam-edelman-boots",
    sourcePlatform: "Poshmark",
  },
  {
    name: "Vintage Levi's 501 Denim Jacket",
    description: "Classic vintage Levi's trucker jacket in medium wash. Authentic 90s style with natural distressing.",
    brand: "Levi's",
    price: 89.0,
    material: "Denim",
    size: "M",
    category: "jacket",
    gender: "unisex" as const,
    condition: "used" as const,
    sourceUrl: "https://ebay.com/itm/levis-vintage-jacket",
    sourcePlatform: "eBay",
  },
  {
    name: "Gucci Marmont Shoulder Bag",
    description: "GG Marmont small matelassé shoulder bag in black. Chevron leather with heart on the back.",
    brand: "Gucci",
    price: 1450.0,
    material: "Leather",
    category: "bag",
    gender: "women" as const,
    condition: "like_new" as const,
    sourceUrl: "https://therealreal.com/products/gucci-marmont",
    sourcePlatform: "TheRealReal",
  },
  {
    name: "Nike Air Max 90 Running Shoes",
    description: "Classic Nike Air Max 90 in white/black colorway. Iconic visible Air cushioning.",
    brand: "Nike",
    price: 129.99,
    material: "Mesh/Leather",
    size: "10",
    category: "sneakers",
    gender: "men" as const,
    condition: "new" as const,
    sourceUrl: "https://ebay.com/itm/nike-air-max-90",
    sourcePlatform: "eBay",
  },
  {
    name: "Cashmere Crewneck Sweater",
    description: "Luxurious 100% cashmere crewneck in navy blue. Soft, warm, and perfect for layering.",
    brand: "Everlane",
    price: 165.0,
    material: "Cashmere",
    size: "L",
    category: "sweater",
    gender: "men" as const,
    condition: "new" as const,
    sourceUrl: "https://poshmark.com/listing/everlane-cashmere",
    sourcePlatform: "Poshmark",
  },
  {
    name: "Reformation Midi Dress",
    description: "Floral print midi dress with adjustable straps. Sustainable and ethically made.",
    brand: "Reformation",
    price: 178.0,
    material: "Viscose",
    size: "S",
    category: "dress",
    gender: "women" as const,
    condition: "like_new" as const,
    sourceUrl: "https://therealreal.com/products/reformation-dress",
    sourcePlatform: "TheRealReal",
  },
  {
    name: "Chanel Classic Flap Bag",
    description: "Timeless Chanel Classic Flap in black caviar leather with gold hardware. Medium size.",
    brand: "Chanel",
    price: 6500.0,
    material: "Caviar Leather",
    category: "bag",
    gender: "women" as const,
    condition: "used" as const,
    sourceUrl: "https://therealreal.com/products/chanel-flap",
    sourcePlatform: "TheRealReal",
  },
  {
    name: "Adidas Ultraboost 22",
    description: "High-performance running shoes with responsive Boost cushioning. Cloud white colorway.",
    brand: "Adidas",
    price: 112.0,
    material: "Primeknit",
    size: "9.5",
    category: "sneakers",
    gender: "unisex" as const,
    condition: "new" as const,
    sourceUrl: "https://ebay.com/itm/adidas-ultraboost",
    sourcePlatform: "eBay",
  },
  {
    name: "Patagonia Better Sweater Fleece",
    description: "Warm fleece jacket made from recycled polyester. Great for layering outdoors.",
    brand: "Patagonia",
    price: 95.0,
    material: "Recycled Polyester",
    size: "M",
    category: "jacket",
    gender: "men" as const,
    condition: "like_new" as const,
    sourceUrl: "https://poshmark.com/listing/patagonia-fleece",
    sourcePlatform: "Poshmark",
  },
  {
    name: "Stuart Weitzman Over-the-Knee Boots",
    description: "Iconic 5050 over-the-knee boots in black suede. Stretch back for perfect fit.",
    brand: "Stuart Weitzman",
    price: 425.0,
    material: "Suede",
    size: "7",
    category: "boots",
    gender: "women" as const,
    condition: "used" as const,
    sourceUrl: "https://therealreal.com/products/stuart-weitzman-5050",
    sourcePlatform: "TheRealReal",
  },
  {
    name: "Madewell High-Rise Skinny Jeans",
    description: "Perfect fit high-rise skinny jeans in classic blue wash. Stretchy and comfortable.",
    brand: "Madewell",
    price: 68.0,
    material: "Denim",
    size: "28",
    category: "jeans",
    gender: "women" as const,
    condition: "new" as const,
    sourceUrl: "https://poshmark.com/listing/madewell-jeans",
    sourcePlatform: "Poshmark",
  },
  {
    name: "Burberry Vintage Check Scarf",
    description: "Classic Burberry check cashmere scarf. Timeless accessory for any wardrobe.",
    brand: "Burberry",
    price: 320.0,
    material: "Cashmere",
    category: "accessory",
    gender: "unisex" as const,
    condition: "like_new" as const,
    sourceUrl: "https://therealreal.com/products/burberry-scarf",
    sourcePlatform: "TheRealReal",
  },
  {
    name: "Allbirds Wool Runners",
    description: "Sustainable wool sneakers in natural grey. Soft, breathable, and machine washable.",
    brand: "Allbirds",
    price: 75.0,
    material: "Merino Wool",
    size: "11",
    category: "sneakers",
    gender: "men" as const,
    condition: "used" as const,
    sourceUrl: "https://ebay.com/itm/allbirds-wool-runners",
    sourcePlatform: "eBay",
  },
  {
    name: "Tory Burch Miller Sandals",
    description: "Iconic Tory Burch Miller sandals in tan leather. Gold logo medallion.",
    brand: "Tory Burch",
    price: 145.0,
    material: "Leather",
    size: "8.5",
    category: "sandals",
    gender: "women" as const,
    condition: "new" as const,
    sourceUrl: "https://poshmark.com/listing/tory-burch-miller",
    sourcePlatform: "Poshmark",
  },
  {
    name: "Ralph Lauren Oxford Shirt",
    description: "Classic fit oxford shirt in light blue. Button-down collar, timeless style.",
    brand: "Ralph Lauren",
    price: 55.0,
    material: "Cotton",
    size: "L",
    category: "shirt",
    gender: "men" as const,
    condition: "like_new" as const,
    sourceUrl: "https://ebay.com/itm/ralph-lauren-oxford",
    sourcePlatform: "eBay",
  },
];

// Insert a single product without embedding (for testing)
export const insertProductWithoutEmbedding = internalMutation({
  args: {
    name: v.string(),
    description: v.string(),
    brand: v.string(),
    price: v.number(),
    material: v.optional(v.string()),
    size: v.optional(v.string()),
    category: v.string(),
    gender: v.optional(v.union(v.literal("men"), v.literal("women"), v.literal("unisex"))),
    condition: v.union(v.literal("new"), v.literal("used"), v.literal("like_new")),
    sourceUrl: v.string(),
    sourcePlatform: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("products", {
      ...args,
      embedding: undefined,
    });
  },
});

// Seed database with sample products (without embeddings - for quick testing)
export const seedProductsQuick = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Seeding database with sample products (no embeddings)...");

    const results = [];
    for (const product of sampleProducts) {
      try {
        const id = await ctx.runMutation(internal.seed.insertProductWithoutEmbedding, product);
        results.push({ success: true, id, name: product.name });
        console.log(`Added: ${product.name}`);
      } catch (error) {
        results.push({ success: false, name: product.name, error: String(error) });
        console.error(`Failed: ${product.name}`, error);
      }
    }

    console.log(`Seeding complete. Added ${results.filter((r) => r.success).length} products.`);
    return results;
  },
});

// Seed database with sample products (with embeddings - requires OpenAI API key)
export const seedProductsWithEmbeddings = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Seeding database with sample products (with embeddings)...");

    const results = [];
    for (const product of sampleProducts) {
      try {
        // Generate embedding
        const textForEmbedding = [
          product.name,
          product.description,
          product.brand,
          product.category,
          product.material,
          product.gender,
          product.condition,
        ]
          .filter(Boolean)
          .join(" ");

        const embedding = await ctx.runAction(internal.search.generateEmbedding, {
          text: textForEmbedding,
        });

        const id = await ctx.runMutation(internal.products.insertProduct, {
          ...product,
          embedding,
        });

        results.push({ success: true, id, name: product.name });
        console.log(`Added with embedding: ${product.name}`);
      } catch (error) {
        results.push({ success: false, name: product.name, error: String(error) });
        console.error(`Failed: ${product.name}`, error);
      }
    }

    console.log(`Seeding complete. Added ${results.filter((r) => r.success).length} products.`);
    return results;
  },
});

// Clear all products (for testing)
export const clearAllProducts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      await ctx.db.delete(product._id);
    }
    console.log(`Deleted ${products.length} products.`);
    return { deleted: products.length };
  },
});
