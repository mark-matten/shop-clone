"use client";

import { useState, useCallback } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

interface AddClothesModalProps {
  isOpen: boolean;
  onClose: () => void;
  clerkId: string;
}

type Tab = "url" | "generate";

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

export function AddClothesModal({ isOpen, onClose, clerkId }: AddClothesModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("url");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL Tab State
  const [url, setUrl] = useState("");
  const [scrapedProduct, setScrapedProduct] = useState<ScrapedProduct | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [urlCategory, setUrlCategory] = useState("");

  // Generate Tab State
  const [description, setDescription] = useState("");
  const [genBrand, setGenBrand] = useState("");
  const [genColor, setGenColor] = useState("");
  const [genMaterial, setGenMaterial] = useState("");
  const [genSize, setGenSize] = useState("");
  const [genCategory, setGenCategory] = useState("tops");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const addFromUrl = useMutation(api.closet.addFromUrl);
  const generateClothingImage = useAction(api.gemini.generateClothingImage);

  const resetForm = useCallback(() => {
    setUrl("");
    setScrapedProduct(null);
    setSelectedSize("");
    setSelectedColor("");
    setUrlCategory("");
    setDescription("");
    setGenBrand("");
    setGenColor("");
    setGenMaterial("");
    setGenSize("");
    setGenCategory("tops");
    setGeneratedImage(null);
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

      if (urlLower.includes("everlane.com")) {
        response = await fetch(`/api/scrape?url=${encodeURIComponent(url)}&platform=everlane`);
      } else if (urlLower.includes("jcrew.com")) {
        response = await fetch(`/api/scrape?url=${encodeURIComponent(url)}&platform=jcrew`);
      } else {
        throw new Error("Unsupported website. Currently supporting Everlane and J.Crew.");
      }

      if (!response.ok) {
        throw new Error("Failed to fetch product info");
      }

      const data = await response.json();
      setScrapedProduct(data);

      // Pre-select first available options
      if (data.sizes?.length) setSelectedSize(data.sizes[0]);
      if (data.colors?.length) setSelectedColor(data.colors[0]);
      if (data.category) setUrlCategory(data.category);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch product");
    } finally {
      setIsLoading(false);
    }
  };

  // Add URL-sourced item to closet
  const handleAddFromUrl = async () => {
    if (!scrapedProduct || !selectedSize || !urlCategory) return;

    setIsLoading(true);
    setError(null);

    try {
      await addFromUrl({
        clerkId,
        name: scrapedProduct.name,
        brand: scrapedProduct.brand,
        imageUrl: scrapedProduct.imageUrl,
        size: selectedSize,
        color: selectedColor || undefined,
        material: scrapedProduct.material,
        category: urlCategory,
        sourceUrl: url,
      });

      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate clothing image and add to closet
  const handleGenerate = async () => {
    if (!description.trim() || !genCategory) return;

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
      });

      if (result.imageUrl) {
        setGeneratedImage(result.imageUrl);
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
            onClick={() => setActiveTab("url")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "url"
                ? "border-b-2 border-[#D4AF37] text-[#D4AF37]"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            From URL
          </button>
          <button
            onClick={() => setActiveTab("generate")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "generate"
                ? "border-b-2 border-[#D4AF37] text-[#D4AF37]"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Describe & Generate
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          {activeTab === "url" ? (
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
                    className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleFetchUrl}
                    disabled={!url.trim() || isLoading}
                    className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#C9A432] disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
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
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
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
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
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
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Black cashmere crewneck sweater"
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                  disabled={isLoading}
                />
              </div>

              {/* Brand */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Brand
                </label>
                <input
                  type="text"
                  value={genBrand}
                  onChange={(e) => setGenBrand(e.target.value)}
                  placeholder="e.g., J.Crew"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                  disabled={isLoading}
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Category *
                </label>
                <select
                  value={genCategory}
                  onChange={(e) => setGenCategory(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  disabled={isLoading}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
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
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
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
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
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
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                  disabled={isLoading}
                />
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
          {activeTab === "url" ? (
            <button
              onClick={handleAddFromUrl}
              disabled={!scrapedProduct || !selectedSize || !urlCategory || isLoading}
              className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#C9A432] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Adding..." : "Add to Closet"}
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!description.trim() || !genCategory || isLoading}
              className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#C9A432] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Generating..." : "Generate & Add"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
