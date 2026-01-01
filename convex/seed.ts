import { mutation, internalMutation } from "./_generated/server";

// Product generation data
const BRANDS = [
  // Luxury
  { name: "Gucci", tier: "luxury", priceMultiplier: 8 },
  { name: "Chanel", tier: "luxury", priceMultiplier: 10 },
  { name: "Louis Vuitton", tier: "luxury", priceMultiplier: 9 },
  { name: "Prada", tier: "luxury", priceMultiplier: 7 },
  { name: "Burberry", tier: "luxury", priceMultiplier: 6 },
  { name: "Dior", tier: "luxury", priceMultiplier: 9 },
  { name: "Saint Laurent", tier: "luxury", priceMultiplier: 8 },
  { name: "Balenciaga", tier: "luxury", priceMultiplier: 7 },
  { name: "Celine", tier: "luxury", priceMultiplier: 8 },
  { name: "Bottega Veneta", tier: "luxury", priceMultiplier: 7 },
  // Premium
  { name: "Coach", tier: "premium", priceMultiplier: 3 },
  { name: "Kate Spade", tier: "premium", priceMultiplier: 2.5 },
  { name: "Michael Kors", tier: "premium", priceMultiplier: 2 },
  { name: "Tory Burch", tier: "premium", priceMultiplier: 3 },
  { name: "Stuart Weitzman", tier: "premium", priceMultiplier: 4 },
  { name: "Sam Edelman", tier: "premium", priceMultiplier: 2 },
  { name: "Ted Baker", tier: "premium", priceMultiplier: 2.5 },
  { name: "AllSaints", tier: "premium", priceMultiplier: 2.5 },
  { name: "Theory", tier: "premium", priceMultiplier: 3 },
  { name: "Vince", tier: "premium", priceMultiplier: 3 },
  // Mid-range
  { name: "Madewell", tier: "mid", priceMultiplier: 1.5 },
  { name: "J.Crew", tier: "mid", priceMultiplier: 1.3 },
  { name: "Banana Republic", tier: "mid", priceMultiplier: 1.2 },
  { name: "Anthropologie", tier: "mid", priceMultiplier: 1.8 },
  { name: "Free People", tier: "mid", priceMultiplier: 1.6 },
  { name: "Reformation", tier: "mid", priceMultiplier: 2 },
  { name: "Everlane", tier: "mid", priceMultiplier: 1.4 },
  { name: "COS", tier: "mid", priceMultiplier: 1.5 },
  { name: "& Other Stories", tier: "mid", priceMultiplier: 1.4 },
  { name: "Aritzia", tier: "mid", priceMultiplier: 1.6 },
  // Athletic
  { name: "Nike", tier: "athletic", priceMultiplier: 1.5 },
  { name: "Adidas", tier: "athletic", priceMultiplier: 1.4 },
  { name: "Lululemon", tier: "athletic", priceMultiplier: 2 },
  { name: "New Balance", tier: "athletic", priceMultiplier: 1.3 },
  { name: "Asics", tier: "athletic", priceMultiplier: 1.2 },
  { name: "Puma", tier: "athletic", priceMultiplier: 1.1 },
  { name: "Reebok", tier: "athletic", priceMultiplier: 1 },
  { name: "Under Armour", tier: "athletic", priceMultiplier: 1.2 },
  { name: "Allbirds", tier: "athletic", priceMultiplier: 1.3 },
  { name: "On Running", tier: "athletic", priceMultiplier: 1.8 },
  // Budget
  { name: "Zara", tier: "budget", priceMultiplier: 0.8 },
  { name: "H&M", tier: "budget", priceMultiplier: 0.5 },
  { name: "GAP", tier: "budget", priceMultiplier: 0.7 },
  { name: "Old Navy", tier: "budget", priceMultiplier: 0.4 },
  { name: "Uniqlo", tier: "budget", priceMultiplier: 0.6 },
  { name: "ASOS", tier: "budget", priceMultiplier: 0.6 },
  { name: "Topshop", tier: "budget", priceMultiplier: 0.7 },
  { name: "Forever 21", tier: "budget", priceMultiplier: 0.3 },
  { name: "Levi's", tier: "budget", priceMultiplier: 0.9 },
  { name: "Patagonia", tier: "budget", priceMultiplier: 1.5 },
];

const CATEGORIES = [
  { name: "dress", basePrice: 120, materials: ["Silk", "Cotton", "Viscose", "Polyester", "Linen"], genders: ["women"] },
  { name: "jeans", basePrice: 80, materials: ["Denim", "Stretch Denim"], genders: ["women", "men", "unisex"] },
  { name: "jacket", basePrice: 150, materials: ["Leather", "Denim", "Wool", "Cotton", "Nylon"], genders: ["women", "men", "unisex"] },
  { name: "sweater", basePrice: 90, materials: ["Cashmere", "Wool", "Cotton", "Merino Wool", "Alpaca"], genders: ["women", "men", "unisex"] },
  { name: "boots", basePrice: 180, materials: ["Leather", "Suede", "Synthetic"], genders: ["women", "men"] },
  { name: "sneakers", basePrice: 120, materials: ["Mesh", "Leather", "Canvas", "Knit"], genders: ["women", "men", "unisex"] },
  { name: "bag", basePrice: 250, materials: ["Leather", "Canvas", "Nylon", "Vegan Leather"], genders: ["women", "unisex"] },
  { name: "shirt", basePrice: 65, materials: ["Cotton", "Linen", "Silk", "Poplin"], genders: ["women", "men"] },
  { name: "pants", basePrice: 85, materials: ["Cotton", "Wool", "Linen", "Polyester Blend"], genders: ["women", "men"] },
  { name: "coat", basePrice: 250, materials: ["Wool", "Cashmere", "Down", "Trench Cotton"], genders: ["women", "men", "unisex"] },
  { name: "skirt", basePrice: 70, materials: ["Cotton", "Silk", "Denim", "Wool"], genders: ["women"] },
  { name: "blouse", basePrice: 75, materials: ["Silk", "Cotton", "Polyester", "Chiffon"], genders: ["women"] },
  { name: "t-shirt", basePrice: 35, materials: ["Cotton", "Jersey", "Organic Cotton"], genders: ["women", "men", "unisex"] },
  { name: "sandals", basePrice: 90, materials: ["Leather", "Suede", "Synthetic"], genders: ["women", "men"] },
  { name: "heels", basePrice: 130, materials: ["Leather", "Suede", "Satin", "Patent Leather"], genders: ["women"] },
  { name: "loafers", basePrice: 140, materials: ["Leather", "Suede"], genders: ["women", "men"] },
  { name: "blazer", basePrice: 180, materials: ["Wool", "Cotton", "Linen", "Polyester Blend"], genders: ["women", "men"] },
  { name: "cardigan", basePrice: 85, materials: ["Cashmere", "Wool", "Cotton", "Merino"], genders: ["women", "men"] },
  { name: "shorts", basePrice: 55, materials: ["Cotton", "Denim", "Linen"], genders: ["women", "men", "unisex"] },
  { name: "accessory", basePrice: 80, materials: ["Silk", "Cashmere", "Leather", "Canvas"], genders: ["unisex"] },
];

const COLORS = [
  "Black", "White", "Navy", "Grey", "Beige", "Brown", "Tan", "Burgundy",
  "Olive", "Forest Green", "Camel", "Cream", "Blush Pink", "Red", "Blue",
  "Charcoal", "Ivory", "Cognac", "Taupe", "Slate", "Dusty Rose", "Sage",
  "Mustard", "Terracotta", "Lavender", "Mint", "Coral", "Powder Blue"
];

const STYLES = [
  "Classic", "Vintage", "Modern", "Minimalist", "Bohemian", "Oversized",
  "Slim Fit", "Relaxed", "Tailored", "Cropped", "High-Rise", "Mid-Rise",
  "Low-Rise", "Fitted", "Flowy", "Structured", "Casual", "Formal"
];

const CONDITIONS: ("new" | "like_new" | "used")[] = ["new", "like_new", "used"];
const PLATFORMS = ["Poshmark", "TheRealReal", "eBay", "Depop", "Mercari", "Vestiaire Collective", "ThredUp"];

const SIZES = {
  clothing: ["XXS", "XS", "S", "M", "L", "XL", "XXL"],
  shoes: ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12"],
  jeans: ["24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "36"],
  oneSize: ["One Size"],
};

// Seeded random number generator for consistent results
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pickRandom<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

function generateProduct(index: number) {
  const brand = pickRandom(BRANDS, index * 7);
  const category = pickRandom(CATEGORIES, index * 11);
  const color = pickRandom(COLORS, index * 13);
  const style = pickRandom(STYLES, index * 17);
  const material = pickRandom(category.materials, index * 19);
  const condition = pickRandom(CONDITIONS, index * 23);
  const platform = pickRandom(PLATFORMS, index * 29);
  const gender = pickRandom(category.genders, index * 31) as "women" | "men" | "unisex";

  // Get appropriate size based on category
  let sizePool = SIZES.clothing;
  if (["boots", "sneakers", "sandals", "heels", "loafers"].includes(category.name)) {
    sizePool = SIZES.shoes;
  } else if (category.name === "jeans") {
    sizePool = SIZES.jeans;
  } else if (category.name === "accessory") {
    sizePool = SIZES.oneSize;
  }
  const size = pickRandom(sizePool, index * 37);

  // Calculate price based on brand tier and category
  let price = category.basePrice * brand.priceMultiplier;
  // Add some randomness
  price = price * (0.8 + seededRandom(index * 41) * 0.4);
  // Reduce price for used items
  if (condition === "used") price *= 0.6;
  if (condition === "like_new") price *= 0.8;
  // Round to .99 or .00
  price = Math.round(price) - 0.01;
  if (price < 10) price = 9.99;

  // Generate name
  const name = `${brand.name} ${style} ${color} ${category.name.charAt(0).toUpperCase() + category.name.slice(1)}`;

  // Generate description
  const conditionText = condition === "new" ? "Brand new with tags." :
                        condition === "like_new" ? "Excellent condition, worn only once or twice." :
                        "Gently used with minor signs of wear.";
  const description = `${style} ${category.name} from ${brand.name} in ${color.toLowerCase()}. Made from ${material.toLowerCase()}. ${conditionText}`;

  // Generate fake URLs
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const sourceUrl = `https://${platform.toLowerCase().replace(/\s+/g, "")}.com/listing/${slug}-${index}`;

  // Use placeholder images (Unsplash with category-based search)
  const imageSearchTerms: Record<string, string> = {
    dress: "fashion-dress",
    jeans: "jeans-denim",
    jacket: "jacket-fashion",
    sweater: "sweater-knit",
    boots: "boots-shoes",
    sneakers: "sneakers-shoes",
    bag: "handbag-purse",
    shirt: "shirt-fashion",
    pants: "pants-fashion",
    coat: "coat-fashion",
    skirt: "skirt-fashion",
    blouse: "blouse-fashion",
    "t-shirt": "tshirt-fashion",
    sandals: "sandals-shoes",
    heels: "heels-shoes",
    loafers: "loafers-shoes",
    blazer: "blazer-fashion",
    cardigan: "cardigan-sweater",
    shorts: "shorts-fashion",
    accessory: "fashion-accessory",
  };
  const searchTerm = imageSearchTerms[category.name] || "fashion";
  const imageId = 100 + (index % 900); // Use different image IDs
  const imageUrl = `https://picsum.photos/seed/${searchTerm}${index}/400/400`;

  return {
    name,
    description,
    brand: brand.name,
    price,
    material,
    size,
    category: category.name,
    gender,
    condition,
    sourceUrl,
    sourcePlatform: platform,
    imageUrl,
  };
}

// Generate products in batches
function generateProducts(count: number, startIndex: number = 0) {
  const products = [];
  for (let i = 0; i < count; i++) {
    products.push(generateProduct(startIndex + i));
  }
  return products;
}

// Seed database with generated products
export const seedProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const products = generateProducts(1000);
    let added = 0;

    // Insert in batches to avoid timeout
    for (const product of products) {
      await ctx.db.insert("products", product);
      added++;
    }

    return { added, message: `Successfully added ${added} products` };
  },
});

// Seed a smaller batch (useful for testing)
export const seedProductsBatch = mutation({
  args: {},
  handler: async (ctx) => {
    const products = generateProducts(100);
    let added = 0;

    for (const product of products) {
      await ctx.db.insert("products", product);
      added++;
    }

    return { added, message: `Successfully added ${added} products` };
  },
});

// Clear all products (for testing)
export const clearAllProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      await ctx.db.delete(product._id);
    }
    return { deleted: products.length };
  },
});

// Check product count
export const countProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    return { count: products.length };
  },
});
