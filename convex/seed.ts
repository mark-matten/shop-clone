import { mutation, internalMutation } from "./_generated/server";
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
    imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop",
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
    imageUrl: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&h=400&fit=crop",
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
    imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop",
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
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
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
    imageUrl: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop",
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
    imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop",
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
    imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop",
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
    imageUrl: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=400&h=400&fit=crop",
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
    imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop",
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
    imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop",
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
    imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=400&fit=crop",
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
    imageUrl: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&h=400&fit=crop",
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
    imageUrl: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=400&fit=crop",
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
    imageUrl: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400&h=400&fit=crop",
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
    imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop",
  },
];

// Seed database with sample products
export const seedProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const results = [];
    for (const product of sampleProducts) {
      const id = await ctx.db.insert("products", product);
      results.push({ id, name: product.name });
    }
    return { added: results.length, products: results };
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
    return { deleted: products.length };
  },
});

// Check if products exist
export const hasProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const count = await ctx.db.query("products").collect();
    return { count: count.length };
  },
});
