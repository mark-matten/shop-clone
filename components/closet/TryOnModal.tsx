"use client";

import { useState, useMemo } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PhotoManager } from "./PhotoManager";

interface ClosetItem {
  _id: string;
  productId: string;
  displayName: string;
  displayBrand?: string;
  displayCategory: string;
  displayImageUrl?: string | null;
  isOwned: boolean;
  isWishlist: boolean;
}

interface OutfitHistoryItem {
  _id: Id<"outfit_images">;
  url: string | null;
}

interface TryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  clerkId: string;
}

const CATEGORIES = [
  { id: "tops", label: "Tops" },
  { id: "bottoms", label: "Bottoms" },
  { id: "dresses", label: "Dresses" },
  { id: "outerwear", label: "Outerwear" },
  { id: "shoes", label: "Shoes" },
  { id: "bags", label: "Bags" },
  { id: "accessories", label: "Accessories" },
  { id: "activewear", label: "Activewear" },
  { id: "other", label: "Other" },
];

type ModelMode = "generic" | "user";

// Map category to a normalized key for selection (one per category)
function getCategoryKey(category: string): string {
  const lower = category.toLowerCase();

  // Tops: shirts, sweaters, tees, blouses, polos, bodysuits
  if (lower.includes("top") || lower.includes("shirt") || lower.includes("blouse") ||
      lower.includes("sweater") || lower.includes("tee") || lower.includes("polo") ||
      lower.includes("bodysuit") || lower.includes("tank") || lower.includes("cami") ||
      lower.includes("henley") || lower.includes("cardigan") || lower.includes("pullover")) {
    return "tops";
  }

  // Bottoms: pants, jeans, shorts, skirts, chinos, trousers, leggings
  if (lower.includes("bottom") || lower.includes("pant") || lower.includes("jean") ||
      lower.includes("skirt") || lower.includes("short") || lower.includes("chino") ||
      lower.includes("trouser") || lower.includes("legging") || lower.includes("jogger")) {
    return "bottoms";
  }

  // Dresses: dresses, jumpsuits, rompers
  if (lower.includes("dress") || lower.includes("jumpsuit") || lower.includes("romper")) {
    return "dresses";
  }

  // Outerwear: jackets, coats, blazers, vests
  if (lower.includes("jacket") || lower.includes("coat") || lower.includes("outerwear") ||
      lower.includes("blazer") || lower.includes("vest") || lower.includes("hoodie") ||
      lower.includes("parka") || lower.includes("windbreaker")) {
    return "outerwear";
  }

  // Shoes: all footwear
  if (lower.includes("shoe") || lower.includes("boot") || lower.includes("sneaker") ||
      lower.includes("heel") || lower.includes("sandal") || lower.includes("loafer") ||
      lower.includes("flat") || lower.includes("mule") || lower.includes("slipper") ||
      lower.includes("oxford") || lower.includes("pump") || lower.includes("wedge") ||
      lower.includes("footwear") || lower.includes("trainer") || lower.includes("kicks")) {
    return "shoes";
  }

  // Bags: all bags and purses
  if (lower.includes("bag") || lower.includes("tote") || lower.includes("purse") ||
      lower.includes("backpack") || lower.includes("clutch") || lower.includes("satchel") ||
      lower.includes("crossbody") || lower.includes("wallet") || lower.includes("pouch")) {
    return "bags";
  }

  // Accessories: jewelry, hats, scarves, belts, socks, etc.
  if (lower.includes("accessor") || lower.includes("jewelry") || lower.includes("hat") ||
      lower.includes("scarf") || lower.includes("belt") || lower.includes("watch") ||
      lower.includes("sock") || lower.includes("glove") || lower.includes("sunglasse") ||
      lower.includes("tie") || lower.includes("beanie") || lower.includes("cap")) {
    return "accessories";
  }

  // Activewear: athletic, sports, workout, yoga, gym
  if (lower.includes("active") || lower.includes("sport") || lower.includes("athletic") ||
      lower.includes("workout") || lower.includes("yoga") || lower.includes("gym") ||
      lower.includes("running") || lower.includes("training")) {
    return "activewear";
  }

  // Intimates/loungewear -> other
  if (lower.includes("intimate") || lower.includes("underwear") || lower.includes("bra") ||
      lower.includes("lounge") || lower.includes("pajama") || lower.includes("sleepwear") ||
      lower.includes("robe") || lower.includes("lingerie")) {
    return "other";
  }

  // Generic "clothing" category -> other (too broad to categorize)
  if (lower === "clothing") {
    return "other";
  }

  return "other";
}

export function TryOnModal({ isOpen, onClose, clerkId }: TryOnModalProps) {
  // Map: categoryKey -> itemId (only one item per category allowed)
  const [selectedByCategory, setSelectedByCategory] = useState<Map<string, string>>(new Map());
  const [activeCategory, setActiveCategory] = useState("tops");
  const [modelMode, setModelMode] = useState<ModelMode>("generic");
  const [selectedPhotoId, setSelectedPhotoId] = useState<Id<"user_photos"> | null>(null);
  const [selectedPhotoStorageId, setSelectedPhotoStorageId] = useState<Id<"_storage"> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutfit, setGeneratedOutfit] = useState<string | null>(null);
  const [selectedOutfitId, setSelectedOutfitId] = useState<Id<"outfit_images"> | null>(null);
  const [showPhotoManager, setShowPhotoManager] = useState(false);

  const closetItems = useQuery(api.closet.getAllClosetItems, { clerkId });
  const outfitHistory = useQuery(api.storage.getOutfitHistory, { clerkId, limit: 6 });
  const user = useQuery(api.users.getUserByClerkId, { clerkId });
  const generateTryOn = useAction(api.gemini.generateTryOnImage);

  // Determine gender from user preferences (default to female)
  const userGender = useMemo(() => {
    if (!user?.preferences) return "female" as const;
    // If user shops men's only, use male model
    if (user.preferences.shopsMen && !user.preferences.shopsWomen) {
      return "male" as const;
    }
    // Default to female for women's only or both
    return "female" as const;
  }, [user]);

  // Group items by normalized category key (e.g., "pants" -> "bottoms")
  const itemsByCategory = useMemo(() => {
    if (!closetItems) return {} as Record<string, ClosetItem[]>;

    const grouped: Record<string, ClosetItem[]> = {};
    for (const item of closetItems as ClosetItem[]) {
      const categoryKey = getCategoryKey(item.displayCategory || "other");
      if (!grouped[categoryKey]) grouped[categoryKey] = [];
      grouped[categoryKey].push(item);
    }
    return grouped;
  }, [closetItems]);

  // Get all items as a flat map for quick lookup by _id
  const itemsById = useMemo(() => {
    if (!closetItems) return new Map<string, ClosetItem>();
    const map = new Map<string, ClosetItem>();
    for (const item of closetItems as ClosetItem[]) {
      map.set(item._id, item);
    }
    return map;
  }, [closetItems]);

  // Get selected items as an array
  const selectedItems = useMemo(() => {
    const items: ClosetItem[] = [];
    for (const itemId of selectedByCategory.values()) {
      const item = itemsById.get(itemId);
      if (item) items.push(item);
    }
    return items;
  }, [selectedByCategory, itemsById]);

  const currentCategoryItems = itemsByCategory[activeCategory] || [];

  const toggleItemSelection = (item: ClosetItem) => {
    const categoryKey = getCategoryKey(item.displayCategory || "other");
    const newSelected = new Map(selectedByCategory);

    if (newSelected.get(categoryKey) === item._id) {
      // Deselect if clicking on already selected item
      newSelected.delete(categoryKey);
    } else {
      // Select this item (replaces any previous selection in this category)
      newSelected.set(categoryKey, item._id);
    }
    setSelectedByCategory(newSelected);
  };

  const removeSelectedItem = (categoryKey: string) => {
    const newSelected = new Map(selectedByCategory);
    newSelected.delete(categoryKey);
    setSelectedByCategory(newSelected);
  };

  const handleSelectPhoto = (photoId: Id<"user_photos"> | null, storageId: Id<"_storage"> | null) => {
    setSelectedPhotoId(photoId);
    setSelectedPhotoStorageId(storageId);
    if (photoId) {
      setModelMode("user");
    }
  };

  const handleGenerate = async () => {
    if (selectedByCategory.size === 0) return;

    setIsGenerating(true);
    setGeneratedOutfit(null);
    setSelectedOutfitId(null); // Clear selection since we're generating a new outfit

    try {
      // Get productIds from selected items
      const productIds = Array.from(selectedByCategory.values()).map((itemId) => {
        const item = itemsById.get(itemId);
        return item?.productId || itemId;
      });

      const result = await generateTryOn({
        clerkId,
        productIds,
        userPhotoStorageId: modelMode === "user" ? selectedPhotoStorageId ?? undefined : undefined,
        useGenericModel: modelMode === "generic",
        gender: userGender,
      });

      if (result.imageUrl) {
        setGeneratedOutfit(result.imageUrl);
      }
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate outfit image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setSelectedByCategory(new Map());
    setGeneratedOutfit(null);
    setSelectedOutfitId(null);
    setShowPhotoManager(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-auto"
      onClick={handleClose}
    >
      <div
        className="relative flex h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Panel - Preview & Selected Items */}
        <div className="flex w-1/2 flex-col border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 flex h-[60px] items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Virtual Try-On
            </h2>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            {/* Preview Area */}
            <div className="p-6">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <svg
                    className="h-16 w-16 animate-spin text-[#D4AF37]"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Generating your outfit...
                  </p>
                </div>
              ) : generatedOutfit ? (
                <div className="relative flex justify-center">
                  <img
                    src={generatedOutfit}
                    alt="Generated outfit"
                    className="max-h-[50vh] rounded-xl object-contain shadow-lg"
                  />
                  <button
                    onClick={() => setGeneratedOutfit(null)}
                    className="absolute -right-2 -top-2 rounded-full bg-zinc-900 p-1.5 text-white shadow-lg hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : selectedItems.length > 0 ? (
                <div>
                  <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Selected Items ({selectedItems.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedItems.map((item) => {
                      const categoryKey = getCategoryKey(item.displayCategory || "other");
                      return (
                        <div
                          key={item._id}
                          className="group relative aspect-square overflow-hidden rounded-xl border-2 border-[#D4AF37] bg-zinc-100 dark:bg-zinc-800"
                        >
                          {item.displayImageUrl ? (
                            <img
                              src={item.displayImageUrl}
                              alt={item.displayName || "Selected item"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          {/* Remove button */}
                          <button
                            onClick={() => removeSelectedItem(categoryKey)}
                            className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          {/* Category label */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="truncate text-xs font-medium text-white capitalize">
                              {categoryKey}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <div className="rounded-full bg-zinc-100 p-6 dark:bg-zinc-800">
                    <svg className="h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">
                      Select items to try on
                    </p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Choose one item per category from your closet
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Model Selection */}
            <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
              {/* Always show both buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setModelMode("generic");
                    setSelectedPhotoId(null);
                    setSelectedPhotoStorageId(null);
                    setShowPhotoManager(false);
                  }}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    modelMode === "generic"
                      ? "bg-[#D4AF37] text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  Generic Model
                </button>
                <button
                  onClick={() => {
                    setModelMode("user");
                    setShowPhotoManager(true);
                  }}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    modelMode === "user"
                      ? "bg-[#D4AF37] text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  My Photo
                </button>
              </div>

              {/* Show PhotoManager when My Photo is selected */}
              {modelMode === "user" && showPhotoManager && (
                <div className="mt-4">
                  <PhotoManager
                    clerkId={clerkId}
                    onSelectPhoto={handleSelectPhoto}
                    selectedPhotoId={selectedPhotoId}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Generate Button - Fixed at bottom */}
          <div className="flex-shrink-0 border-t border-zinc-200 p-4 dark:border-zinc-800">
            <button
              onClick={handleGenerate}
              disabled={selectedByCategory.size === 0 || isGenerating}
              className="w-full rounded-lg bg-[#D4AF37] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#C9A432] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating
                ? "Generating..."
                : `Generate Outfit (${selectedByCategory.size} item${selectedByCategory.size !== 1 ? "s" : ""})`}
            </button>
          </div>
        </div>

        {/* Right Panel - Closet */}
        <div className="flex w-1/2 flex-col overflow-hidden">
          {/* Header with close button */}
          <div className="flex-shrink-0 flex h-[60px] items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Your Closet
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

          {/* Category Tabs - Horizontal scrolling */}
          <div className="flex-shrink-0 overflow-x-auto">
            <div className="flex gap-2 px-6 py-3 min-w-max">
              {CATEGORIES.map((cat) => {
                const count = itemsByCategory[cat.id]?.length || 0;
                const hasSelection = selectedByCategory.has(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                      activeCategory === cat.id
                        ? "bg-[#D4AF37] text-white"
                        : hasSelection
                        ? "bg-[#D4AF37]/20 text-[#D4AF37] dark:bg-[#D4AF37]/30"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {cat.label}
                    {count > 0 && (
                      <span className="ml-1 text-xs opacity-70">({count})</span>
                    )}
                    {hasSelection && (
                      <span className="ml-1">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Items Grid - Vertical scrolling */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentCategoryItems.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {currentCategoryItems.map((item) => {
                  const categoryKey = getCategoryKey(item.displayCategory || "other");
                  const isSelected = selectedByCategory.get(categoryKey) === item._id;
                  const otherSelectedInCategory = selectedByCategory.has(categoryKey) && !isSelected;

                  return (
                    <button
                      key={item._id}
                      onClick={() => toggleItemSelection(item)}
                      className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                        isSelected
                          ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/20"
                          : otherSelectedInCategory
                          ? "border-transparent opacity-50 hover:opacity-75"
                          : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-600"
                      }`}
                    >
                      {item.displayImageUrl ? (
                        <img
                          src={item.displayImageUrl}
                          alt={item.displayName || "Closet item"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                          <svg
                            className="h-8 w-8 text-zinc-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Owned/Wishlist indicator (top-left) */}
                      <div className="absolute left-1 top-1 rounded-full bg-white/90 p-1 shadow-sm dark:bg-zinc-900/90">
                        {item.isOwned ? (
                          <svg
                            className="h-3.5 w-3.5 text-green-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-3.5 w-3.5 text-pink-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute right-1 top-1 rounded-full bg-[#D4AF37] p-1">
                          <svg
                            className="h-4 w-4 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Item info on hover */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="truncate text-xs font-medium text-white">
                          {item.displayName}
                        </p>
                        {item.displayBrand && (
                          <p className="truncate text-xs text-white/70">
                            {item.displayBrand}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <svg
                  className="h-12 w-12 text-zinc-300 dark:text-zinc-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  No {activeCategory} in your closet
                </p>
              </div>
            )}
          </div>

          {/* Selected Items Summary */}
          {selectedByCategory.size > 0 && (
            <div className="flex-shrink-0 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {selectedByCategory.size} categor{selectedByCategory.size !== 1 ? "ies" : "y"} selected
                </span>
                <button
                  onClick={() => setSelectedByCategory(new Map())}
                  className="text-sm text-red-500 hover:underline"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

          {/* Recent Outfits */}
          {outfitHistory && outfitHistory.length > 0 && (
            <div className="flex-shrink-0 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Recent Outfits
              </h3>
              <div className="flex gap-3 overflow-x-auto py-1">
                {(outfitHistory as OutfitHistoryItem[]).map((outfit) => {
                  const isSelected = selectedOutfitId === outfit._id;
                  return (
                    <button
                      key={outfit._id}
                      onClick={() => {
                        if (outfit.url) {
                          setGeneratedOutfit(outfit.url);
                          setSelectedOutfitId(outfit._id);
                        }
                      }}
                      className="flex-shrink-0"
                    >
                      {outfit.url ? (
                        <img
                          src={outfit.url}
                          alt="Previous outfit"
                          className={`h-16 w-16 rounded-lg object-cover transition-all ${
                            isSelected
                              ? "ring-2 ring-[#D4AF37] ring-offset-2 dark:ring-offset-zinc-900"
                              : "hover:ring-2 hover:ring-[#D4AF37] hover:ring-offset-2 dark:hover:ring-offset-zinc-900"
                          }`}
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                          <svg
                            className="h-6 w-6 text-zinc-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
