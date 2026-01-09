"use client";

import { useState, useCallback, useEffect } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface AddClothesModalProps {
  isOpen: boolean;
  onClose: () => void;
  clerkId: string;
  onItemAdded?: (itemId: string) => void;
}

type Tab = "describe" | "url";
type OwnershipStatus = "owned" | "wishlist";
type GenderOption = "men" | "women" | "unisex";

const CATEGORIES = [
  "tops",
  "bottoms",
  "dresses",
  "outerwear",
  "shoes",
  "bags",
  "accessories",
  "activewear",
  "other",
];

interface ScrapedProduct {
  name: string;
  brand: string;
  imageUrl: string;
  sizes?: string[];
  colors?: string[];
  category?: string;
  material?: string;
}

// Known brand patterns for parsing
const KNOWN_BRANDS = [
  "J.Crew", "J Crew", "JCrew", "Everlane", "Uniqlo", "Zara", "H&M", "Nike", "Adidas",
  "Levi's", "Levis", "Gap", "Banana Republic", "Old Navy", "Madewell", "Theory",
  "Vince", "COS", "& Other Stories", "Massimo Dutti", "Aritzia", "AllSaints",
  "Reformation", "Patagonia", "North Face", "Lululemon", "Athleta", "Ralph Lauren",
  "Polo", "Tommy Hilfiger", "Calvin Klein", "Brooks Brothers", "Nordstrom", "Gucci",
  "Prada", "Louis Vuitton", "Chanel", "Hermes", "Burberry", "Saint Laurent",
  "Balenciaga", "Bottega Veneta", "Celine", "Dior", "Fendi", "Givenchy", "Valentino"
];

// Known materials for parsing
const KNOWN_MATERIALS = [
  "cotton", "wool", "silk", "linen", "cashmere", "polyester", "nylon", "leather",
  "suede", "denim", "tweed", "velvet", "satin", "chiffon", "jersey", "fleece",
  "corduroy", "canvas", "merino", "alpaca", "mohair", "chambray", "poplin",
  "twill", "flannel", "rayon", "viscose", "spandex", "lycra", "elastane"
];

// Known colors for parsing
const KNOWN_COLORS = [
  "black", "white", "grey", "gray", "navy", "blue", "red", "green", "brown",
  "tan", "beige", "cream", "pink", "rose", "purple", "orange", "yellow",
  "olive", "burgundy", "charcoal", "khaki", "coral", "teal", "maroon", "mint",
  "gold", "silver", "ivory", "indigo", "lavender", "mauve", "rust", "sage",
  "taupe", "heather", "oatmeal", "camel", "cognac", "chocolate", "espresso"
];

// Category keywords for parsing
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  tops: ["shirt", "tee", "t-shirt", "blouse", "sweater", "top", "polo", "henley", "tank", "cami", "cardigan", "pullover", "crewneck", "v-neck", "turtleneck", "hoodie", "sweatshirt"],
  bottoms: ["pants", "jeans", "shorts", "skirt", "trousers", "chinos", "leggings", "joggers", "slacks"],
  dresses: ["dress", "jumpsuit", "romper", "gown", "maxi", "midi", "mini dress"],
  outerwear: ["jacket", "coat", "blazer", "vest", "parka", "windbreaker", "puffer", "peacoat", "trench", "overcoat"],
  shoes: ["shoes", "boots", "sneakers", "heels", "sandals", "loafers", "flats", "mules", "slippers", "oxfords", "pumps"],
  bags: ["bag", "tote", "purse", "backpack", "clutch", "satchel", "crossbody", "wallet", "handbag"],
  accessories: ["hat", "scarf", "belt", "watch", "socks", "gloves", "sunglasses", "tie", "beanie", "cap", "jewelry", "necklace", "bracelet", "earrings"],
  activewear: ["athletic", "sports", "workout", "yoga", "gym", "running", "training", "legging", "sports bra"],
};

// Parse description text to extract attributes
function parseDescription(text: string): {
  brand?: string;
  color?: string;
  material?: string;
  category?: string;
} {
  const lowerText = text.toLowerCase();
  const result: { brand?: string; color?: string; material?: string; category?: string } = {};

  // Find brand (case-insensitive match but preserve original casing)
  for (const brand of KNOWN_BRANDS) {
    if (lowerText.includes(brand.toLowerCase())) {
      result.brand = brand;
      break;
    }
  }

  // Find color
  for (const color of KNOWN_COLORS) {
    if (lowerText.includes(color)) {
      result.color = color.charAt(0).toUpperCase() + color.slice(1);
      break;
    }
  }

  // Find material
  for (const material of KNOWN_MATERIALS) {
    if (lowerText.includes(material)) {
      result.material = material.charAt(0).toUpperCase() + material.slice(1);
      break;
    }
  }

  // Find category
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      result.category = category;
      break;
    }
  }

  return result;
}

export function AddClothesModal({ isOpen, onClose, clerkId, onItemAdded }: AddClothesModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("describe");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL Tab State
  const [url, setUrl] = useState("");
  const [scrapedProduct, setScrapedProduct] = useState<ScrapedProduct | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [urlCategory, setUrlCategory] = useState("");
  const [urlOwnership, setUrlOwnership] = useState<OwnershipStatus>("owned");
  const [urlGender, setUrlGender] = useState<GenderOption | null>(null);

  // Describe Tab State
  const [description, setDescription] = useState("");
  const [genBrand, setGenBrand] = useState("");
  const [genColor, setGenColor] = useState("");
  const [genMaterial, setGenMaterial] = useState("");
  const [genSize, setGenSize] = useState("");
  const [genCategory, setGenCategory] = useState("");
  const [descOwnership, setDescOwnership] = useState<OwnershipStatus>("owned");
  const [descGender, setDescGender] = useState<GenderOption | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [hasParsedDescription, setHasParsedDescription] = useState(false);

  // Parse description when user moves to another field
  const handleDescriptionBlur = useCallback(() => {
    if (description.trim() && !hasParsedDescription) {
      const parsed = parseDescription(description);
      if (parsed.brand && !genBrand) setGenBrand(parsed.brand);
      if (parsed.color && !genColor) setGenColor(parsed.color);
      if (parsed.material && !genMaterial) setGenMaterial(parsed.material);
      if (parsed.category && !genCategory) setGenCategory(parsed.category);
      setHasParsedDescription(true);
    }
  }, [description, hasParsedDescription, genBrand, genColor, genMaterial, genCategory]);

  const addFromUrl = useMutation(api.closet.addFromUrl);
  const generateClothingImage = useAction(api.gemini.generateClothingImage);

  // Query user preferences to default gender
  const user = useQuery(api.users.getUserByClerkId, { clerkId });

  // Set default gender based on user preferences when modal opens
  useEffect(() => {
    if (isOpen && user?.preferences) {
      const { shopsMen, shopsWomen } = user.preferences;
      // Only default if user has exactly one gender preference set
      if (shopsMen && !shopsWomen) {
        setDescGender("men");
        setUrlGender("men");
      } else if (shopsWomen && !shopsMen) {
        setDescGender("women");
        setUrlGender("women");
      }
      // If both or neither, don't default (leave as null)
    }
  }, [isOpen, user]);

  const resetForm = useCallback(() => {
    setUrl("");
    setScrapedProduct(null);
    setSelectedSize("");
    setSelectedColor("");
    setUrlCategory("");
    setUrlOwnership("owned");
    setUrlGender(null);
    setDescription("");
    setGenBrand("");
    setGenColor("");
    setGenMaterial("");
    setGenSize("");
    setGenCategory("");
    setDescOwnership("owned");
    setDescGender(null);
    setGeneratedImage(null);
    setHasParsedDescription(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  // Parse URL and fetch product info
  const handleFetchUrl = async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Detect platform from URL and call appropriate scraper
      const urlLower = url.toLowerCase();
      let response;
      let platform = "";

      if (urlLower.includes("everlane.com")) {
        platform = "everlane";
      } else if (urlLower.includes("jcrew.com")) {
        platform = "jcrew";
      } else {
        throw new Error("Unsupported website. Currently supporting Everlane and J.Crew.");
      }

      console.log("[AddClothesModal] Fetching URL:", url, "Platform:", platform);

      response = await fetch(`/api/scrape?url=${encodeURIComponent(url)}&platform=${platform}`);

      console.log("[AddClothesModal] Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[AddClothesModal] Error response:", errorData);
        throw new Error(errorData.error || `Failed to fetch product info (${response.status})`);
      }

      const data = await response.json();
      console.log("[AddClothesModal] Product data:", data);
      setScrapedProduct(data);

      // Pre-select first available options
      if (data.sizes?.length) setSelectedSize(data.sizes[0]);
      if (data.colors?.length) setSelectedColor(data.colors[0]);
      if (data.category) setUrlCategory(data.category);
    } catch (err) {
      console.error("[AddClothesModal] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch product");
    } finally {
      setIsLoading(false);
    }
  };

  // Add URL-sourced item to closet
  const handleAddFromUrl = async () => {
    if (!scrapedProduct || !selectedSize || !urlCategory || !urlOwnership || !urlGender) return;

    setIsLoading(true);
    setError(null);

    try {
      const itemId = await addFromUrl({
        clerkId,
        name: scrapedProduct.name,
        brand: scrapedProduct.brand,
        imageUrl: scrapedProduct.imageUrl,
        size: selectedSize,
        color: selectedColor || undefined,
        material: scrapedProduct.material,
        category: urlCategory,
        sourceUrl: url,
        gender: urlGender,
        isWishlist: urlOwnership === "wishlist",
      });

      onItemAdded?.(itemId);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate clothing image and add to closet
  const handleGenerate = async () => {
    if (!description.trim() || !genCategory || !descOwnership || !descGender) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await generateClothingImage({
        clerkId,
        description: description.trim(),
        brand: genBrand || undefined,
        color: genColor || undefined,
        material: genMaterial || undefined,
        category: genCategory,
        size: genSize || undefined,
        gender: descGender,
        isWishlist: descOwnership === "wishlist",
      });

      if (result.imageUrl) {
        setGeneratedImage(result.imageUrl);
      }

      // Call onItemAdded with the closet item ID
      if (result.closetItemId) {
        onItemAdded?.(result.closetItemId);
      }

      // Item is automatically added by the action, so just close
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Add to Closet
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("describe")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "describe"
                ? "border-b-2 border-moi-400 text-moi-400"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Describe
          </button>
          <button
            onClick={() => setActiveTab("url")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "url"
                ? "border-b-2 border-moi-400 text-moi-400"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Paste Link
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          {activeTab === "describe" ? (
            <div className="space-y-4">
              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setHasParsedDescription(false);
                  }}
                  onBlur={handleDescriptionBlur}
                  placeholder="e.g., Black cashmere J.Crew crewneck sweater"
                  rows={2}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                  disabled={isLoading}
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Include brand, color, or material to auto-fill fields below
                </p>
              </div>

              {/* Brand & Category Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={genBrand}
                    onChange={(e) => setGenBrand(e.target.value)}
                    placeholder="e.g., J.Crew"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Category *
                  </label>
                  <select
                    value={genCategory}
                    onChange={(e) => setGenCategory(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    disabled={isLoading}
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color & Material Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Color
                  </label>
                  <input
                    type="text"
                    value={genColor}
                    onChange={(e) => setGenColor(e.target.value)}
                    placeholder="e.g., Navy"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Material
                  </label>
                  <input
                    type="text"
                    value={genMaterial}
                    onChange={(e) => setGenMaterial(e.target.value)}
                    placeholder="e.g., Cashmere"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Size */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Size
                </label>
                <input
                  type="text"
                  value={genSize}
                  onChange={(e) => setGenSize(e.target.value)}
                  placeholder="e.g., M or 32x30"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                  disabled={isLoading}
                />
              </div>

              {/* Ownership Status - Required */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Status *
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDescOwnership("owned")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      descOwnership === "owned"
                        ? "border-purple-500 bg-purple-500 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                    }`}
                    disabled={isLoading}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    I Own This
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescOwnership("wishlist")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      descOwnership === "wishlist"
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                    }`}
                    disabled={isLoading}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Wishlist
                  </button>
                </div>
                {!descOwnership && (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Select whether you own this item or want to add it to your wishlist
                  </p>
                )}
              </div>

              {/* Gender - Required */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Gender *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDescGender("men")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      descGender === "men"
                        ? "border-moi-400 bg-moi-400 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                    }`}
                    disabled={isLoading}
                  >
                    M
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescGender("women")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      descGender === "women"
                        ? "border-moi-400 bg-moi-400 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                    }`}
                    disabled={isLoading}
                  >
                    F
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescGender("unisex")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      descGender === "unisex"
                        ? "border-moi-400 bg-moi-400 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                    }`}
                    disabled={isLoading}
                  >
                    M/F
                  </button>
                </div>
              </div>

              {/* Generated Image Preview */}
              {generatedImage && (
                <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                  <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Generated Image
                  </p>
                  <img
                    src={generatedImage}
                    alt="Generated clothing"
                    className="mx-auto h-48 w-48 rounded-lg object-cover"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* URL Input */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Product URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste product URL (Everlane, J.Crew)"
                    className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleFetchUrl}
                    disabled={!url.trim() || isLoading}
                    className="rounded-lg bg-moi-400 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-moi-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? "..." : "Fetch"}
                  </button>
                </div>
              </div>

              {/* Scraped Product Preview */}
              {scrapedProduct && (
                <div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                  <div className="flex gap-4">
                    {scrapedProduct.imageUrl && (
                      <img
                        src={scrapedProduct.imageUrl}
                        alt={scrapedProduct.name}
                        className="h-24 w-24 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                        {scrapedProduct.brand}
                      </p>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {scrapedProduct.name}
                      </p>
                    </div>
                  </div>

                  {/* Size Selection */}
                  {scrapedProduct.sizes && scrapedProduct.sizes.length > 0 && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Size *
                      </label>
                      <select
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      >
                        {scrapedProduct.sizes.map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Color Selection */}
                  {scrapedProduct.colors && scrapedProduct.colors.length > 0 && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Color
                      </label>
                      <select
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      >
                        {scrapedProduct.colors.map((color) => (
                          <option key={color} value={color}>{color}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Category Selection */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Category *
                    </label>
                    <select
                      value={urlCategory}
                      onChange={(e) => setUrlCategory(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Ownership Status for URL */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Status *
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setUrlOwnership("owned")}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                          urlOwnership === "owned"
                            ? "border-purple-500 bg-purple-500 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                        }`}
                        disabled={isLoading}
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        I Own This
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrlOwnership("wishlist")}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                          urlOwnership === "wishlist"
                            ? "border-red-500 bg-red-500 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                        }`}
                        disabled={isLoading}
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        Wishlist
                      </button>
                    </div>
                  </div>

                  {/* Gender for URL - Required */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Gender *
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setUrlGender("men")}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                          urlGender === "men"
                            ? "border-moi-400 bg-moi-400 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                        }`}
                        disabled={isLoading}
                      >
                        M
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrlGender("women")}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                          urlGender === "women"
                            ? "border-moi-400 bg-moi-400 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                        }`}
                        disabled={isLoading}
                      >
                        F
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrlGender("unisex")}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                          urlGender === "unisex"
                            ? "border-moi-400 bg-moi-400 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                        }`}
                        disabled={isLoading}
                      >
                        M/F
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <button
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            disabled={isLoading}
          >
            Cancel
          </button>
          {activeTab === "describe" ? (
            <button
              onClick={handleGenerate}
              disabled={!description.trim() || !genCategory || !descOwnership || !descGender || isLoading}
              className="rounded-lg bg-moi-400 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-moi-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Adding..." : "Add to Closet"}
            </button>
          ) : (
            <button
              onClick={handleAddFromUrl}
              disabled={!scrapedProduct || !selectedSize || !urlCategory || !urlOwnership || !urlGender || isLoading}
              className="rounded-lg bg-moi-400 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-moi-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Adding..." : "Add to Closet"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
