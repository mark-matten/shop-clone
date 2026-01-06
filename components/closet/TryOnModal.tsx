"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
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

  if (lower.includes("top") || lower.includes("shirt") || lower.includes("blouse") ||
      lower.includes("sweater") || lower.includes("tee") || lower.includes("polo") ||
      lower.includes("bodysuit") || lower.includes("tank") || lower.includes("cami") ||
      lower.includes("henley") || lower.includes("cardigan") || lower.includes("pullover")) {
    return "tops";
  }

  if (lower.includes("bottom") || lower.includes("pant") || lower.includes("jean") ||
      lower.includes("skirt") || lower.includes("short") || lower.includes("chino") ||
      lower.includes("trouser") || lower.includes("legging") || lower.includes("jogger")) {
    return "bottoms";
  }

  if (lower.includes("dress") || lower.includes("jumpsuit") || lower.includes("romper")) {
    return "dresses";
  }

  if (lower.includes("jacket") || lower.includes("coat") || lower.includes("outerwear") ||
      lower.includes("blazer") || lower.includes("vest") || lower.includes("hoodie") ||
      lower.includes("parka") || lower.includes("windbreaker")) {
    return "outerwear";
  }

  if (lower.includes("shoe") || lower.includes("boot") || lower.includes("sneaker") ||
      lower.includes("heel") || lower.includes("sandal") || lower.includes("loafer") ||
      lower.includes("flat") || lower.includes("mule") || lower.includes("slipper") ||
      lower.includes("oxford") || lower.includes("pump") || lower.includes("wedge") ||
      lower.includes("footwear") || lower.includes("trainer") || lower.includes("kicks")) {
    return "shoes";
  }

  if (lower.includes("bag") || lower.includes("tote") || lower.includes("purse") ||
      lower.includes("backpack") || lower.includes("clutch") || lower.includes("satchel") ||
      lower.includes("crossbody") || lower.includes("wallet") || lower.includes("pouch")) {
    return "bags";
  }

  if (lower.includes("accessor") || lower.includes("jewelry") || lower.includes("hat") ||
      lower.includes("scarf") || lower.includes("belt") || lower.includes("watch") ||
      lower.includes("sock") || lower.includes("glove") || lower.includes("sunglasse") ||
      lower.includes("tie") || lower.includes("beanie") || lower.includes("cap")) {
    return "accessories";
  }

  if (lower.includes("active") || lower.includes("sport") || lower.includes("athletic") ||
      lower.includes("workout") || lower.includes("yoga") || lower.includes("gym") ||
      lower.includes("running") || lower.includes("training")) {
    return "activewear";
  }

  if (lower.includes("intimate") || lower.includes("underwear") || lower.includes("bra") ||
      lower.includes("lounge") || lower.includes("pajama") || lower.includes("sleepwear") ||
      lower.includes("robe") || lower.includes("lingerie")) {
    return "other";
  }

  if (lower === "clothing") {
    return "other";
  }

  return "other";
}

type OwnershipFilter = "all" | "owned" | "wishlist";

export function TryOnModal({ isOpen, onClose, clerkId }: TryOnModalProps) {
  const [selectedByCategory, setSelectedByCategory] = useState<Map<string, string>>(new Map());
  const [activeCategory, setActiveCategory] = useState("tops");
  const [modelMode, setModelMode] = useState<ModelMode>("generic");
  const [selectedPhotoId, setSelectedPhotoId] = useState<Id<"user_photos"> | null>(null);
  const [selectedPhotoStorageId, setSelectedPhotoStorageId] = useState<Id<"_storage"> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutfit, setGeneratedOutfit] = useState<string | null>(null);
  const [selectedOutfitId, setSelectedOutfitId] = useState<Id<"outfit_images"> | null>(null);
  const [showPhotoManager, setShowPhotoManager] = useState(false);

  // New state for search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>("all");

  // Generic model customization
  const [modelHeight, setModelHeight] = useState(67); // inches (5'7")
  const [modelWeight, setModelWeight] = useState(140); // lbs
  const [modelSkinTone, setModelSkinTone] = useState(50); // 0-100 scale (light to dark)
  const [modelGender, setModelGender] = useState<"male" | "female">("female");
  const [otherDetails, setOtherDetails] = useState("");

  const closetItems = useQuery(api.closet.getAllClosetItems, { clerkId });
  const outfitHistory = useQuery(api.storage.getOutfitHistory, { clerkId, limit: 6 });
  const user = useQuery(api.users.getUserByClerkId, { clerkId });
  const generateTryOn = useAction(api.gemini.generateTryOnImage);
  const updateModelPrefs = useMutation(api.users.updateModelPreferences);

  // Load saved model preferences
  const savedModelHeight = user?.preferences?.modelHeight;
  const savedModelWeight = user?.preferences?.modelWeight;
  const savedModelSkinTone = user?.preferences?.modelSkinTone;

  // Sync local state with saved preferences on load
  useEffect(() => {
    if (savedModelHeight !== undefined) {
      setModelHeight(savedModelHeight);
    }
    if (savedModelWeight !== undefined) {
      setModelWeight(savedModelWeight);
    }
    if (savedModelSkinTone !== undefined) {
      setModelSkinTone(savedModelSkinTone);
    }
    // Set default gender based on user profile
    if (user?.preferences) {
      if (user.preferences.shopsMen && !user.preferences.shopsWomen) {
        setModelGender("male");
      } else {
        setModelGender("female");
      }
    }
  }, [savedModelHeight, savedModelWeight, savedModelSkinTone, user?.preferences]);

  // Save model preferences when sliders change (debounced effect)
  const saveModelPrefs = (height: number, weight: number, skinTone: number) => {
    updateModelPrefs({ clerkId, modelHeight: height, modelWeight: weight, modelSkinTone: skinTone });
  };

  const userGender = useMemo(() => {
    if (!user?.preferences) return "female" as const;
    if (user.preferences.shopsMen && !user.preferences.shopsWomen) {
      return "male" as const;
    }
    return "female" as const;
  }, [user]);

  // Filter items by ownership and search query
  const filteredClosetItems = useMemo(() => {
    if (!closetItems) return [];

    return (closetItems as ClosetItem[]).filter((item) => {
      // Ownership filter
      if (ownershipFilter === "owned" && !item.isOwned) return false;
      if (ownershipFilter === "wishlist" && !item.isWishlist) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = item.displayName?.toLowerCase().includes(query);
        const brandMatch = item.displayBrand?.toLowerCase().includes(query);
        const categoryMatch = item.displayCategory?.toLowerCase().includes(query);
        if (!nameMatch && !brandMatch && !categoryMatch) return false;
      }

      return true;
    });
  }, [closetItems, ownershipFilter, searchQuery]);

  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, ClosetItem[]> = {};
    for (const item of filteredClosetItems) {
      const categoryKey = getCategoryKey(item.displayCategory || "other");
      if (!grouped[categoryKey]) grouped[categoryKey] = [];
      grouped[categoryKey].push(item);
    }
    return grouped;
  }, [filteredClosetItems]);

  const itemsById = useMemo(() => {
    if (!closetItems) return new Map<string, ClosetItem>();
    const map = new Map<string, ClosetItem>();
    for (const item of closetItems as ClosetItem[]) {
      map.set(item._id, item);
    }
    return map;
  }, [closetItems]);

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
      newSelected.delete(categoryKey);
    } else {
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
    setSelectedOutfitId(null);

    try {
      const productIds = Array.from(selectedByCategory.values()).map((itemId) => {
        const item = itemsById.get(itemId);
        return item?.productId || itemId;
      });

      const result = await generateTryOn({
        clerkId,
        productIds,
        userPhotoStorageId: modelMode === "user" ? selectedPhotoStorageId ?? undefined : undefined,
        useGenericModel: modelMode === "generic",
        gender: modelMode === "generic" ? modelGender : userGender,
        // Model customization (only used for generic model)
        modelHeight: modelMode === "generic" ? modelHeight : undefined,
        modelWeight: modelMode === "generic" ? modelWeight : undefined,
        modelSkinTone: modelMode === "generic" ? modelSkinTone : undefined,
        otherDetails: otherDetails.trim() || undefined,
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
    setSearchQuery("");
    setOwnershipFilter("all");
    setOtherDetails("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="relative flex h-[92vh] sm:h-[85vh] w-full sm:max-w-5xl flex-col sm:flex-row overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== MOBILE LAYOUT ===== */}
        <div className="flex sm:hidden flex-col h-full">
          {/* Mobile Header */}
          <div className="flex-shrink-0 flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
              Virtual Try-On
            </h2>
            <button
              onClick={handleClose}
              className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile Closet Section (Top) */}
          <div className="flex-1 flex flex-col min-h-0 border-b border-zinc-200 dark:border-zinc-800">
            {/* Category Tabs */}
            <div className="flex-shrink-0 overflow-x-auto border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex gap-1 px-2 py-1.5 min-w-max">
                {CATEGORIES.map((cat) => {
                  const count = itemsByCategory[cat.id]?.length || 0;
                  const hasSelection = selectedByCategory.has(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                        activeCategory === cat.id
                          ? "bg-rose-400 text-white"
                          : hasSelection
                          ? "bg-rose-100 text-rose-500 dark:bg-rose-900/30 dark:text-rose-400"
                          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {cat.label}
                      {count > 0 && <span className="ml-0.5 opacity-70">({count})</span>}
                      {hasSelection && <span className="ml-0.5">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ownership Filter & Search */}
            <div className="flex-shrink-0 px-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex gap-1.5 mb-1.5">
                {(["all", "owned", "wishlist"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setOwnershipFilter(filter)}
                    className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      ownershipFilter === filter
                        ? "bg-rose-400 text-white"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {filter === "all" ? "All" : filter === "owned" ? "Owned" : "Wishlist"}
                  </button>
                ))}
              </div>
              <div className="relative">
                <svg className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded-md border border-zinc-200 bg-white py-1 pl-7 pr-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-rose-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>

            {/* Items Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto p-2">
              {currentCategoryItems.length > 0 ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {currentCategoryItems.map((item) => {
                    const categoryKey = getCategoryKey(item.displayCategory || "other");
                    const isSelected = selectedByCategory.get(categoryKey) === item._id;
                    const otherSelectedInCategory = selectedByCategory.has(categoryKey) && !isSelected;

                    return (
                      <button
                        key={item._id}
                        onClick={() => toggleItemSelection(item)}
                        className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-rose-400 ring-1 ring-rose-400/30"
                            : otherSelectedInCategory
                            ? "border-transparent opacity-40"
                            : "border-transparent"
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
                            <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute right-0.5 top-0.5 rounded-full bg-rose-400 p-0.5">
                            <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <svg className="h-8 w-8 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    No {activeCategory} in your closet
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Preview Section (Bottom) */}
          <div className="flex-shrink-0 bg-zinc-50 dark:bg-zinc-800/50">
            {/* Selected Items Row */}
            <div className="px-2 py-2">
              {isGenerating ? (
                <div className="flex items-center justify-center py-4 gap-2">
                  <svg className="h-6 w-6 animate-spin text-rose-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm text-zinc-500">Generating...</span>
                </div>
              ) : generatedOutfit ? (
                <div className="relative flex justify-center">
                  <img
                    src={generatedOutfit}
                    alt="Generated outfit"
                    className="h-32 rounded-lg object-contain shadow-md"
                  />
                  <button
                    onClick={() => setGeneratedOutfit(null)}
                    className="absolute -right-1 -top-1 rounded-full bg-zinc-900 p-1 text-white shadow"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : selectedItems.length > 0 ? (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {selectedItems.map((item) => {
                    const categoryKey = getCategoryKey(item.displayCategory || "other");
                    return (
                      <div key={item._id} className="relative flex-shrink-0 h-14 w-14 rounded-lg overflow-hidden border-2 border-rose-400">
                        {item.displayImageUrl ? (
                          <img src={item.displayImageUrl} alt={item.displayName || ""} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-zinc-200 dark:bg-zinc-700" />
                        )}
                        <button
                          onClick={() => removeSelectedItem(categoryKey)}
                          className="absolute right-0 top-0 rounded-bl-md bg-red-500 p-0.5 text-white"
                        >
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5">
                          <p className="text-[8px] text-white capitalize truncate">{categoryKey}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-xs text-zinc-500 py-2">
                  Select items above to create an outfit
                </p>
              )}
            </div>

            {/* Model Selection */}
            <div className="px-2 py-1.5 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex gap-1.5 mb-1.5">
                <button
                  onClick={() => { setModelMode("generic"); setSelectedPhotoId(null); setSelectedPhotoStorageId(null); setShowPhotoManager(false); }}
                  className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${modelMode === "generic" ? "bg-rose-400 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}
                >
                  Generic Model
                </button>
                <button
                  onClick={() => { setModelMode("user"); setShowPhotoManager(true); }}
                  className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${modelMode === "user" ? "bg-rose-400 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}
                >
                  My Photo
                </button>
              </div>

              {/* Generic Model Options */}
              {modelMode === "generic" && (
                <div className="space-y-1.5">
                  {/* Gender & Height Row */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setModelGender("male")}
                          className={`flex-1 rounded-md px-2 py-0.5 text-xs font-medium ${modelGender === "male" ? "bg-rose-400 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}
                        >
                          M
                        </button>
                        <button
                          onClick={() => setModelGender("female")}
                          className={`flex-1 rounded-md px-2 py-0.5 text-xs font-medium ${modelGender === "female" ? "bg-rose-400 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}
                        >
                          F
                        </button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-500 w-6">{Math.floor(modelHeight / 12)}'{modelHeight % 12}"</span>
                        <input
                          type="range"
                          min="54"
                          max="78"
                          value={modelHeight}
                          onChange={(e) => setModelHeight(Number(e.target.value))}
                          onTouchEnd={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
                          className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700 accent-rose-400"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Weight & Skin Tone Row */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-500 w-7">{modelWeight}lb</span>
                        <input
                          type="range"
                          min="90"
                          max="280"
                          step="5"
                          value={modelWeight}
                          onChange={(e) => setModelWeight(Number(e.target.value))}
                          onTouchEnd={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
                          className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700 accent-rose-400"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-500 w-7">Skin</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={modelSkinTone}
                          onChange={(e) => setModelSkinTone(Number(e.target.value))}
                          onTouchEnd={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
                          className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-rose-400"
                          style={{ background: "linear-gradient(to right, #fde8dc, #c68642, #5c3d2e)" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Manager for User Mode */}
              {modelMode === "user" && showPhotoManager && (
                <div className="mt-1.5">
                  <PhotoManager clerkId={clerkId} onSelectPhoto={handleSelectPhoto} selectedPhotoId={selectedPhotoId} />
                </div>
              )}

              {/* Other Details */}
              <input
                type="text"
                value={otherDetails}
                onChange={(e) => setOtherDetails(e.target.value)}
                placeholder="Other details (e.g., cuffed pants, tucked shirt)"
                className="w-full mt-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 placeholder-zinc-400 focus:border-rose-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            {/* Generate Button */}
            <div className="px-2 py-2">
              <button
                onClick={handleGenerate}
                disabled={selectedByCategory.size === 0 || isGenerating}
                className="w-full rounded-lg bg-rose-400 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : selectedByCategory.size > 0 ? `Generate Outfit (${selectedByCategory.size})` : "Select items to try on"}
              </button>
            </div>
          </div>
        </div>

        {/* ===== DESKTOP LAYOUT ===== */}
        {/* Left Panel - Preview & Selected Items */}
        <div className="hidden sm:flex w-1/2 flex-col border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="flex-shrink-0 h-[60px] flex items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Virtual Try-On
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <svg className="h-16 w-16 animate-spin text-rose-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Generating your outfit...</p>
                </div>
              ) : generatedOutfit ? (
                <div className="relative flex justify-center">
                  <img src={generatedOutfit} alt="Generated outfit" className="max-h-[50vh] rounded-xl object-contain shadow-lg" />
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
                        <div key={item._id} className="group relative aspect-square overflow-hidden rounded-xl border-2 border-rose-400 bg-zinc-100 dark:bg-zinc-800">
                          {item.displayImageUrl ? (
                            <img src={item.displayImageUrl} alt={item.displayName || "Selected item"} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <button
                            onClick={() => removeSelectedItem(categoryKey)}
                            className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="truncate text-xs font-medium text-white capitalize">{categoryKey}</p>
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
                    <p className="font-medium text-zinc-900 dark:text-white">Select items to try on</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Choose one item per category from your closet</p>
                  </div>
                </div>
              )}
            </div>

            {/* Model Selection */}
            <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="flex gap-2">
                <button
                  onClick={() => { setModelMode("generic"); setSelectedPhotoId(null); setSelectedPhotoStorageId(null); setShowPhotoManager(false); }}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${modelMode === "generic" ? "bg-rose-400 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"}`}
                >
                  Generic Model
                </button>
                <button
                  onClick={() => { setModelMode("user"); setShowPhotoManager(true); }}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${modelMode === "user" ? "bg-rose-400 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"}`}
                >
                  My Photo
                </button>
              </div>

              {/* Generic Model Customization */}
              {modelMode === "generic" && (
                <div className="mt-3 space-y-2">
                  {/* Gender Toggle */}
                  <div>
                    <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-0.5">
                      <span>Gender</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setModelGender("male")}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          modelGender === "male"
                            ? "bg-rose-400 text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        }`}
                      >
                        M
                      </button>
                      <button
                        onClick={() => setModelGender("female")}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          modelGender === "female"
                            ? "bg-rose-400 text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        }`}
                      >
                        F
                      </button>
                    </div>
                  </div>
                  {/* Height Slider */}
                  <div>
                    <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                      <span>Height</span>
                      <span>{Math.floor(modelHeight / 12)}'{modelHeight % 12}"</span>
                    </div>
                    <input
                      type="range"
                      min="54"
                      max="78"
                      value={modelHeight}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setModelHeight(val);
                      }}
                      onMouseUp={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
                      onTouchEnd={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
                      className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700 accent-rose-400"
                    />
                  </div>
                  {/* Weight Slider */}
                  <div>
                    <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                      <span>Weight</span>
                      <span>{modelWeight} lbs</span>
                    </div>
                    <input
                      type="range"
                      min="90"
                      max="280"
                      step="5"
                      value={modelWeight}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setModelWeight(val);
                      }}
                      onMouseUp={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
                      onTouchEnd={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
                      className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700 accent-rose-400"
                    />
                  </div>
                  {/* Skin Tone Slider */}
                  <div>
                    <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                      <span>Skin Tone</span>
                      <span>{modelSkinTone < 20 ? "Fair" : modelSkinTone < 40 ? "Light" : modelSkinTone < 60 ? "Medium" : modelSkinTone < 80 ? "Tan" : "Deep"}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={modelSkinTone}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setModelSkinTone(val);
                      }}
                      onMouseUp={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
                      onTouchEnd={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-rose-400"
                      style={{ background: "linear-gradient(to right, #fde8dc, #c68642, #5c3d2e)" }}
                    />
                  </div>
                </div>
              )}

              {modelMode === "user" && showPhotoManager && (
                <div className="mt-3">
                  <PhotoManager clerkId={clerkId} onSelectPhoto={handleSelectPhoto} selectedPhotoId={selectedPhotoId} />
                </div>
              )}

              {/* Other Details Input */}
              <div className="mt-3">
                <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-0.5">
                  Other Details (optional)
                </label>
                <input
                  type="text"
                  value={otherDetails}
                  onChange={(e) => setOtherDetails(e.target.value)}
                  placeholder="e.g., cuffed pants, shirt tucked in"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                />
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex-shrink-0 border-t border-zinc-200 p-4 dark:border-zinc-800">
            <button
              onClick={handleGenerate}
              disabled={selectedByCategory.size === 0 || isGenerating}
              className="w-full rounded-lg bg-rose-400 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : `Generate Outfit (${selectedByCategory.size} item${selectedByCategory.size !== 1 ? "s" : ""})`}
            </button>
          </div>
        </div>

        {/* Right Panel - Closet */}
        <div className="hidden sm:flex w-1/2 flex-col overflow-hidden">
          {/* Header - matches left side height */}
          <div className="flex-shrink-0 h-[60px] flex items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Your Closet</h2>
            <button onClick={handleClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex-shrink-0 overflow-x-auto">
            <div className="flex gap-2 px-6 pt-3 pb-2 min-w-max">
              {CATEGORIES.map((cat) => {
                const count = itemsByCategory[cat.id]?.length || 0;
                const hasSelection = selectedByCategory.has(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                      activeCategory === cat.id ? "bg-rose-400 text-white"
                        : hasSelection ? "bg-rose-100 text-rose-500 dark:bg-rose-900/30 dark:text-rose-400"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {cat.label}{count > 0 && <span className="ml-1 text-xs opacity-70">({count})</span>}{hasSelection && <span className="ml-1">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ownership Toggle & Search */}
          <div className="flex-shrink-0 border-b border-zinc-200 px-6 pt-2 pb-3 dark:border-zinc-800">
            <div className="flex gap-2 mb-3">
              {(["all", "owned", "wishlist"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setOwnershipFilter(filter)}
                  className={`flex-1 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    ownershipFilter === filter
                      ? "bg-rose-400 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {filter === "all" ? "All" : filter === "owned" ? "Owned" : "Wishlist"}
                </button>
              ))}
            </div>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="w-full rounded-lg border border-zinc-300 bg-white py-1.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Items Grid */}
          <div className="flex-1 overflow-y-auto px-6 pt-3 pb-6">
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
                        isSelected ? "border-rose-400 ring-2 ring-rose-400/20"
                          : otherSelectedInCategory ? "border-transparent opacity-50 hover:opacity-75"
                          : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-600"
                      }`}
                    >
                      {item.displayImageUrl ? (
                        <img src={item.displayImageUrl} alt={item.displayName || "Closet item"} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                          <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute left-1 top-1 rounded-full bg-white/90 p-1 shadow-sm dark:bg-zinc-900/90">
                        {item.isOwned ? (
                          <svg className="h-3.5 w-3.5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-3.5 w-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute right-1 top-1 rounded-full bg-rose-400 p-1">
                          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="truncate text-xs font-medium text-white">{item.displayName}</p>
                        {item.displayBrand && <p className="truncate text-xs text-white/70">{item.displayBrand}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <svg className="h-12 w-12 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No {activeCategory} in your closet</p>
              </div>
            )}
          </div>

          {/* Selected Summary & Recent Outfits */}
          {selectedByCategory.size > 0 && (
            <div className="flex-shrink-0 border-t border-zinc-200 px-6 py-3 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{selectedByCategory.size} categor{selectedByCategory.size !== 1 ? "ies" : "y"} selected</span>
                <button onClick={() => setSelectedByCategory(new Map())} className="text-sm text-red-500 hover:underline">Clear all</button>
              </div>
            </div>
          )}
          {outfitHistory && outfitHistory.length > 0 && (
            <div className="flex-shrink-0 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Recent Outfits</h3>
              <div className="flex gap-3 overflow-x-auto py-1">
                {(outfitHistory as OutfitHistoryItem[]).map((outfit) => {
                  const isSelected = selectedOutfitId === outfit._id;
                  return (
                    <button key={outfit._id} onClick={() => { if (outfit.url) { setGeneratedOutfit(outfit.url); setSelectedOutfitId(outfit._id); } }} className="flex-shrink-0">
                      {outfit.url ? (
                        <img src={outfit.url} alt="Previous outfit" className={`h-14 w-14 rounded-lg object-cover transition-all ${isSelected ? "ring-2 ring-rose-400 ring-offset-2 dark:ring-offset-zinc-900" : "hover:ring-2 hover:ring-rose-400 hover:ring-offset-2 dark:hover:ring-offset-zinc-900"}`} />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                          <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
