"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PhotoManager } from "./PhotoManager";
import Link from "next/link";

interface ClosetItem {
  _id: string;
  productId: string;
  displayName: string;
  displayBrand?: string;
  displayCategory: string;
  displayImageUrl?: string | null;
  isOwned: boolean;
  isWishlist: boolean;
  // Additional fields for item details popup
  source?: "product" | "url" | "generated" | "wishlist";
  material?: string;
  size?: string;
  color?: string;
  gender?: "men" | "women" | "unisex";
  linkedProductId?: string; // For linking to /product/[id] page
}

interface OutfitHistoryItem {
  _id: Id<"outfit_images">;
  url: string | null;
  name?: string;
  items?: Array<{
    _id: string;
    name?: string;
    category?: string;
  }>;
}

interface TryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  clerkId: string;
  initialItem?: { id: string; category: string }; // Pre-select an item when opening
}

const CATEGORIES = [
  { id: "all", label: "All" },
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

type ModelMode = "generic" | "custom" | "user";

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

export function TryOnModal({ isOpen, onClose, clerkId, initialItem }: TryOnModalProps) {
  const [selectedByCategory, setSelectedByCategory] = useState<Map<string, string>>(new Map());
  const [activeCategory, setActiveCategory] = useState("all");
  const [modelMode, setModelMode] = useState<ModelMode>("generic");
  const [selectedPhotoId, setSelectedPhotoId] = useState<Id<"user_photos"> | null>(null);
  const [selectedPhotoStorageId, setSelectedPhotoStorageId] = useState<Id<"_storage"> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");
  const [generatedOutfit, setGeneratedOutfit] = useState<string | null>(null);
  const [selectedOutfitId, setSelectedOutfitId] = useState<Id<"outfit_images"> | null>(null);
  const [showPhotoManager, setShowPhotoManager] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedOutfitId, setSavedOutfitId] = useState<Id<"outfit_images"> | null>(null);
  // Track unsaved generated outfit data (for saving later)
  const [pendingOutfitData, setPendingOutfitData] = useState<{
    storageId: Id<"_storage">;
    itemIds: string[];
    userPhotoId?: Id<"user_photos">;
    prompt: string;
  } | null>(null);
  const [showOutfitHistory, setShowOutfitHistory] = useState(false);
  const [isClearingRecent, setIsClearingRecent] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [outfitName, setOutfitName] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<Id<"collections"> | null>(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  // New state for search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>("all");

  // State for item details popup
  const [detailsItem, setDetailsItem] = useState<ClosetItem | null>(null);

  // State for upgrade modal (when limit reached)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Generic model customization
  const [modelHeight, setModelHeight] = useState(67); // inches (5'7")
  const [modelWeight, setModelWeight] = useState(140); // lbs
  const [modelSkinTone, setModelSkinTone] = useState(50); // 0-100 scale (light to dark)
  const [modelGender, setModelGender] = useState<"male" | "female">("female");
  const [otherDetails, setOtherDetails] = useState("");

  const closetItems = useQuery(api.closet.getAllClosetItems, { clerkId });
  const outfitHistory = useQuery(api.storage.getOutfitHistory, { clerkId, limit: 10 });
  const user = useQuery(api.users.getUserByClerkId, { clerkId });
  const collections = useQuery(api.collections.getCollectionsByClerkId, { clerkId });
  const tryOnUsage = useQuery(api.users.getTryOnUsage, { clerkId });
  const incrementUsage = useMutation(api.users.incrementTryOnUsage);

  // Usage limits
  const FREE_DAILY_LIMIT = 10;
  const PAID_WEEKLY_CUSTOM_LIMIT = 50;
  const isPaidUser = tryOnUsage?.isPaidUser ?? false;
  const genericUsedToday = tryOnUsage?.genericUsedToday ?? 0;
  const customUsedThisWeek = tryOnUsage?.customUsedThisWeek ?? 0;
  const canUseGeneric = isPaidUser || genericUsedToday < FREE_DAILY_LIMIT;
  const canUseCustom = isPaidUser && customUsedThisWeek < PAID_WEEKLY_CUSTOM_LIMIT;
  const generateTryOn = useAction(api.gemini.generateTryOnImage);
  const updateModelPrefs = useMutation(api.users.updateModelPreferences);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const saveOutfitImage = useMutation(api.storage.saveOutfitImage);
  const deleteOutfitImage = useMutation(api.storage.deleteOutfitImage);
  const hideOrDeleteOutfit = useMutation(api.storage.hideOrDeleteOutfit);
  const clearRecentOutfits = useMutation(api.storage.clearRecentOutfits);
  const createCollection = useMutation(api.collections.createCollectionByClerkId);

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

  // Pre-select initial item when modal opens
  useEffect(() => {
    if (isOpen && initialItem && closetItems) {
      const categoryKey = getCategoryKey(initialItem.category);
      setSelectedByCategory(new Map([[categoryKey, initialItem.id]]));
      setActiveCategory(categoryKey);
    }
  }, [isOpen, initialItem, closetItems]);

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

  const currentCategoryItems = activeCategory === "all"
    ? filteredClosetItems
    : (itemsByCategory[activeCategory] || []);

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

    // Check usage limits
    const isCustomModel = modelMode === "user";
    if (isCustomModel && !canUseCustom) {
      setShowUpgradeModal(true);
      return;
    }
    if (!isCustomModel && !canUseGeneric) {
      setShowUpgradeModal(true);
      return;
    }

    setIsGenerating(true);
    setGeneratedOutfit(null);
    setSelectedOutfitId(null);
    setGenerationProgress(0);
    setGenerationStatus("Preparing your items...");

    // Simulate progress while waiting for the API
    const progressStages = [
      { progress: 15, status: "Analyzing clothing items...", delay: 800 },
      { progress: 35, status: "Creating outfit composition...", delay: 1500 },
      { progress: 55, status: "Generating virtual try-on...", delay: 2500 },
      { progress: 75, status: "Applying finishing touches...", delay: 4000 },
      { progress: 90, status: "Almost there...", delay: 6000 },
    ];

    const progressTimeouts: NodeJS.Timeout[] = [];
    progressStages.forEach(({ progress, status, delay }) => {
      const timeout = setTimeout(() => {
        setGenerationProgress(progress);
        setGenerationStatus(status);
      }, delay);
      progressTimeouts.push(timeout);
    });

    try {
      // Store the actual closet_item._id or favorites._id for proper lookup later
      const productIds = Array.from(selectedByCategory.values());

      const result = await generateTryOn({
        clerkId,
        productIds,
        userPhotoStorageId: modelMode === "user" ? selectedPhotoStorageId ?? undefined : undefined,
        useGenericModel: modelMode === "generic",
        gender: modelMode === "generic" ? modelGender : userGender,
        // Model customization (only used for generic model and paid users)
        modelHeight: modelMode === "generic" && isPaidUser ? modelHeight : undefined,
        modelWeight: modelMode === "generic" && isPaidUser ? modelWeight : undefined,
        modelSkinTone: modelMode === "generic" && isPaidUser ? modelSkinTone : undefined,
        otherDetails: otherDetails.trim() || undefined,
      });

      // Increment usage counter after successful generation
      await incrementUsage({ clerkId, isCustomModel });

      // Clear progress timeouts since generation succeeded
      progressTimeouts.forEach(clearTimeout);
      setGenerationProgress(100);
      setGenerationStatus("Complete!");

      if (result.imageUrl) {
        setGeneratedOutfit(result.imageUrl);

        // Save to DB immediately WITHOUT a name so it appears in Recent Outfits
        // When user clicks "Save Outfit", we'll update this record with a name
        const outfitId = await saveOutfitImage({
          clerkId,
          storageId: result.storageId,
          itemIds: result.itemIds,
          userPhotoId: result.userPhotoId,
          prompt: result.prompt,
          // No name - will be added when user explicitly saves
        });

        setSelectedOutfitId(outfitId);
        // Store pending data for the save modal to use
        setPendingOutfitData({
          storageId: result.storageId,
          itemIds: result.itemIds,
          userPhotoId: result.userPhotoId,
          prompt: result.prompt,
        });
      }
    } catch (error) {
      // Clear progress timeouts on error
      progressTimeouts.forEach(clearTimeout);
      console.error("Generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to generate outfit: ${errorMessage}`);
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
    setSavedOutfitId(null);
    setPendingOutfitData(null);
    setShowOutfitHistory(false);
    setShowSaveModal(false);
    setOutfitName("");
    setSelectedCollectionId(null);
    setIsCreatingCollection(false);
    setDetailsItem(null);
    setNewCollectionName("");
    onClose();
  };

  // Convert base64 data URL to blob
  const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const response = await fetch(dataUrl);
    return await response.blob();
  };

  // Show save modal
  const handleSaveOutfit = () => {
    if (!generatedOutfit) return;
    setOutfitName("");
    setSelectedCollectionId(null);
    setIsCreatingCollection(false);
    setNewCollectionName("");
    setShowSaveModal(true);
  };

  // Actually save the outfit with name
  const handleConfirmSave = async () => {
    if (!generatedOutfit || isSaving) return;

    // No validation required - if name is empty, storage.ts will auto-generate "Outfit #XX"
    setIsSaving(true);
    try {
      // Create new collection if requested
      let collectionId = selectedCollectionId;
      if (isCreatingCollection && newCollectionName.trim()) {
        collectionId = await createCollection({
          clerkId,
          name: newCollectionName.trim(),
        });
      }

      // If we have an existing outfit from history, update it
      const existingId = selectedOutfitId || savedOutfitId;
      if (existingId) {
        const outfitId = await saveOutfitImage({
          clerkId,
          name: outfitName.trim() || undefined,
          collectionId: collectionId ?? undefined,
          existingOutfitId: existingId,
        });
        setSavedOutfitId(outfitId);
        setPendingOutfitData(null);
        setShowSaveModal(false);
        return;
      }

      // For newly generated outfits, use the pending data (already uploaded)
      if (pendingOutfitData) {
        const outfitId = await saveOutfitImage({
          clerkId,
          storageId: pendingOutfitData.storageId,
          itemIds: pendingOutfitData.itemIds,
          userPhotoId: pendingOutfitData.userPhotoId,
          prompt: pendingOutfitData.prompt,
          name: outfitName.trim() || undefined,
          collectionId: collectionId ?? undefined,
        });
        setSavedOutfitId(outfitId);
        setPendingOutfitData(null);
        setShowSaveModal(false);
        return;
      }

      // Fallback: upload and save (for edge cases)
      const blob = await dataUrlToBlob(generatedOutfit);
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });

      if (!uploadResult.ok) {
        throw new Error("Failed to upload image");
      }

      const { storageId } = await uploadResult.json();
      const itemIds = Array.from(selectedByCategory.values());

      const outfitId = await saveOutfitImage({
        clerkId,
        storageId,
        itemIds,
        userPhotoId: modelMode === "user" ? selectedPhotoId ?? undefined : undefined,
        prompt: `Virtual try-on: ${selectedItems.map(i => i.displayName).join(", ")}`,
        name: outfitName.trim() || undefined,
        collectionId: collectionId ?? undefined,
      });

      setSavedOutfitId(outfitId);
      setShowSaveModal(false);
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save outfit. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Download outfit image
  const handleDownloadOutfit = () => {
    if (!generatedOutfit) return;

    const link = document.createElement("a");
    link.href = generatedOutfit;
    link.download = `outfit-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Share outfit using native share API or copy link
  const handleShareOutfit = async () => {
    if (!generatedOutfit) return;

    // If outfit is saved, share the link to the outfit page
    const outfitIdToShare = savedOutfitId || selectedOutfitId;
    if (outfitIdToShare) {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://armoi.app";
      const outfitUrl = `${baseUrl}/outfit/${outfitIdToShare}`;

      try {
        if (navigator.share) {
          await navigator.share({
            title: "Check out my outfit!",
            text: "Created with armoi virtual try-on",
            url: outfitUrl,
          });
        } else {
          // Copy URL to clipboard
          await navigator.clipboard.writeText(outfitUrl);
          alert("Outfit link copied to clipboard!");
        }
        return;
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Share error:", error);
          // Try copy to clipboard as fallback
          try {
            await navigator.clipboard.writeText(outfitUrl);
            alert("Outfit link copied to clipboard!");
          } catch {
            // Final fallback
            prompt("Copy this link:", outfitUrl);
          }
        }
      }
      return;
    }

    // If not saved, share the image directly
    try {
      // Convert to blob for sharing
      const blob = await dataUrlToBlob(generatedOutfit);
      const file = new File([blob], "outfit.png", { type: "image/png" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Check out my outfit!",
          text: "Created with armoi virtual try-on",
          files: [file],
        });
      } else {
        // Fallback: download
        handleDownloadOutfit();
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Share error:", error);
        // Fallback to download
        handleDownloadOutfit();
      }
    }
  };

  // Delete saved outfit
  const handleDeleteOutfit = async (outfitId: Id<"outfit_images">) => {
    if (!confirm("Delete this saved outfit?")) return;

    try {
      await deleteOutfitImage({ clerkId, outfitId });
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete outfit.");
    }
  };

  // Load a saved outfit from history
  const handleLoadOutfit = (outfit: OutfitHistoryItem) => {
    if (outfit.url) {
      setGeneratedOutfit(outfit.url);
      setSavedOutfitId(outfit._id);
      setShowOutfitHistory(false);
    }
  };

  // Clear all recent outfits from view
  const handleClearRecentOutfits = async () => {
    if (!confirm("Clear all recent outfits from view? Saved outfits will be hidden but can still be accessed from Saved Outfits.")) return;

    setIsClearingRecent(true);
    try {
      await clearRecentOutfits({ clerkId });
      // If current outfit was unsaved, clear it
      if (savedOutfitId && outfitHistory) {
        const currentOutfit = outfitHistory.find((o: any) => o._id === savedOutfitId);
        if (currentOutfit && !currentOutfit.name && !currentOutfit.collectionId) {
          setGeneratedOutfit(null);
          setSavedOutfitId(null);
          setSelectedOutfitId(null);
        }
      }
    } catch (error) {
      console.error("Clear recent error:", error);
      alert("Failed to clear recent outfits.");
    } finally {
      setIsClearingRecent(false);
    }
  };

  // Remove a single outfit from history (hide if saved, delete if unsaved)
  const handleRemoveFromHistory = async (e: React.MouseEvent, outfitId: Id<"outfit_images">) => {
    e.stopPropagation();
    try {
      await hideOrDeleteOutfit({ clerkId, outfitId });
      // If removed outfit was currently displayed, clear it
      if (savedOutfitId === outfitId || selectedOutfitId === outfitId) {
        setGeneratedOutfit(null);
        setSavedOutfitId(null);
        setSelectedOutfitId(null);
      }
    } catch (error) {
      console.error("Remove outfit error:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4 pt-safe"
      onClick={handleClose}
    >
      <div
        className="relative flex h-[calc(100dvh-env(safe-area-inset-top,0px)-1rem)] sm:h-[85vh] w-full sm:max-w-5xl flex-col sm:flex-row overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== MOBILE LAYOUT ===== */}
        <div className="flex sm:hidden flex-col h-full">
          {/* Mobile Header - Your Closet (with safe area padding for browser chrome) */}
          <div className="flex-shrink-0 flex items-center justify-between border-b border-zinc-200 px-3 py-3 pt-4 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
              Your Closet
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

          {/* Mobile Closet Section (Top) - Limited height so Virtual Try-On is higher */}
          <div className="flex flex-col min-h-0 max-h-[40vh] border-b border-zinc-200 dark:border-zinc-800">
            {/* Category Tabs */}
            <div className="flex-shrink-0 overflow-x-auto border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex gap-1.5 px-3 py-2 min-w-max">
                {CATEGORIES.map((cat) => {
                  const count = itemsByCategory[cat.id]?.length || 0;
                  const hasSelection = selectedByCategory.has(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                        activeCategory === cat.id
                          ? "bg-moi-400 text-white"
                          : hasSelection
                          ? "bg-moi-100 text-moi-500 dark:bg-moi-900/30 dark:text-moi-400"
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
            <div className="flex-shrink-0 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex gap-2 mb-2">
                {(["all", "owned", "wishlist"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setOwnershipFilter(filter)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      ownershipFilter === filter
                        ? "bg-moi-400 text-white"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
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
                  className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>

            {/* Items Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3">
              {currentCategoryItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {currentCategoryItems.map((item) => {
                    const categoryKey = getCategoryKey(item.displayCategory || "other");
                    const isSelected = selectedByCategory.get(categoryKey) === item._id;
                    const otherSelectedInCategory = selectedByCategory.has(categoryKey) && !isSelected;

                    return (
                      <button
                        key={item._id}
                        onClick={() => toggleItemSelection(item)}
                        className={`relative overflow-hidden rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-moi-400 ring-2 ring-moi-400/30"
                            : otherSelectedInCategory
                            ? "border-transparent opacity-40"
                            : "border-transparent"
                        }`}
                      >
                        <div className="aspect-square">
                          {item.displayImageUrl ? (
                            <img
                              src={item.displayImageUrl}
                              alt={item.displayName || "Closet item"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                              <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {/* Product Name */}
                        <div className="bg-white/90 dark:bg-zinc-900/90 px-1.5 py-1">
                          <p className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
                            {item.displayName || "Unnamed"}
                          </p>
                        </div>
                        {/* Owned/Wishlist Icon */}
                        <div className="absolute left-1 top-1 rounded-full bg-white/90 p-0.5 shadow-sm dark:bg-zinc-900/90">
                          {item.isOwned ? (
                            <svg className="h-3 w-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : item.isWishlist ? (
                            <svg className="h-3 w-3 text-moi-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                          ) : null}
                        </div>
                        {/* Selection Indicator or Info Button */}
                        {isSelected ? (
                          <div className="absolute right-1 top-1 rounded-full bg-moi-400 p-0.5">
                            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        ) : (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailsItem(item);
                            }}
                            className="absolute right-1 top-1 rounded-full bg-white/90 dark:bg-zinc-900/90 p-1 shadow-sm cursor-pointer hover:bg-white dark:hover:bg-zinc-800"
                          >
                            <svg className="h-3 w-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

          {/* Mobile Preview Section (Bottom) - Virtual Try-On */}
          <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 overflow-y-auto pb-safe">
            {/* Virtual Try-On Header */}
            <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Virtual Try-On</h3>
            </div>

            {/* Selected Items Preview */}
            <div className="px-3 py-3">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  {/* Progress Bar */}
                  <div className="w-full max-w-[200px]">
                    <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-moi-400 to-moi-500 transition-all duration-500 ease-out"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-zinc-400">{generationProgress}%</span>
                    </div>
                  </div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 text-center">{generationStatus}</span>
                </div>
              ) : generatedOutfit ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <img
                      src={generatedOutfit}
                      alt="Generated outfit"
                      className="h-40 rounded-xl object-contain shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setShowLightbox(true)}
                    />
                    <button
                      onClick={() => { setGeneratedOutfit(null); setSavedOutfitId(null); }}
                      className="absolute -right-1 -top-1 rounded-full bg-zinc-900 p-1.5 text-white shadow"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Save/Share/Download buttons */}
                  <div className="flex gap-2">
                    {!savedOutfitId && (
                      <button
                        onClick={handleSaveOutfit}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 rounded-lg bg-moi-400 px-3 py-1.5 text-xs font-medium text-white hover:bg-moi-500 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        )}
                        Save
                      </button>
                    )}
                    {savedOutfitId && (
                      <span className="flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Saved
                      </span>
                    )}
                    <button
                      onClick={handleDownloadOutfit}
                      className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                  </div>
                </div>
              ) : selectedItems.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pt-3 pb-1 px-1">
                  {selectedItems.map((item) => {
                    const categoryKey = getCategoryKey(item.displayCategory || "other");
                    return (
                      <div key={item._id} className="relative flex-shrink-0 w-20">
                        <div className="h-20 w-20 rounded-xl overflow-hidden border-2 border-moi-400">
                          {item.displayImageUrl ? (
                            <img src={item.displayImageUrl} alt={item.displayName || ""} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-zinc-200 dark:bg-zinc-700" />
                          )}
                        </div>
                        <button
                          onClick={() => removeSelectedItem(categoryKey)}
                          className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 rounded-full bg-red-500 p-1 text-white shadow z-10"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <p className="mt-1 text-[10px] text-zinc-600 dark:text-zinc-400 truncate text-center">{item.displayName || categoryKey}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-sm text-zinc-500 py-4">
                  Select items above to create an outfit
                </p>
              )}
            </div>

            {/* Model Selection */}
            <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
              {/* Model Type Toggle */}
              <div className="flex gap-1">
                <button
                  onClick={() => { setModelMode("generic"); setSelectedPhotoId(null); setSelectedPhotoStorageId(null); setShowPhotoManager(false); }}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${modelMode === "generic" ? "bg-moi-400 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}
                >
                  Generic
                </button>
                <button
                  onClick={() => { setModelMode("custom"); setSelectedPhotoId(null); setSelectedPhotoStorageId(null); setShowPhotoManager(false); }}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${modelMode === "custom" ? "bg-moi-400 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}
                >
                  Custom
                </button>
                <button
                  onClick={() => { setModelMode("user"); setShowPhotoManager(true); }}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${modelMode === "user" ? "bg-moi-400 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}
                >
                  My Photo
                </button>
              </div>

              {/* Usage counter for free users - only on Generic tab */}
              {!isPaidUser && modelMode === "generic" && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                  {FREE_DAILY_LIMIT - genericUsedToday} of {FREE_DAILY_LIMIT} free try-ons remaining today
                </p>
              )}

              {/* Generic Model Options - Gender only */}
              {modelMode === "generic" && (
                <div className="space-y-2">
                  {/* Gender */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 w-16">Gender</span>
                    <div className="flex-1 flex gap-2">
                      <button
                        onClick={() => setModelGender("male")}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium ${modelGender === "male" ? "bg-moi-400 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}
                      >
                        Male
                      </button>
                      <button
                        onClick={() => setModelGender("female")}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium ${modelGender === "female" ? "bg-moi-400 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}
                      >
                        Female
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Model Options - Full customization */}
              {modelMode === "custom" && (
                <div className="space-y-2">
                  {/* Gender */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 w-16">Gender</span>
                    <div className="flex-1 flex gap-2">
                      <button
                        onClick={() => setModelGender("male")}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium ${modelGender === "male" ? "bg-moi-400 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}
                      >
                        Male
                      </button>
                      <button
                        onClick={() => setModelGender("female")}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium ${modelGender === "female" ? "bg-moi-400 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}
                      >
                        Female
                      </button>
                    </div>
                  </div>
                  {/* Height */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 w-16">Height</span>
                    <span className="text-xs text-zinc-900 dark:text-white w-10">{Math.floor(modelHeight / 12)}'{modelHeight % 12}"</span>
                    <input
                      type="range"
                      min="54"
                      max="78"
                      value={modelHeight}
                      onChange={(e) => setModelHeight(Number(e.target.value))}
                      onTouchEnd={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
                      className="flex-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700 accent-moi-400"
                    />
                  </div>
                  {/* Weight */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 w-16">Weight</span>
                    <span className="text-xs text-zinc-900 dark:text-white w-10">{modelWeight} lbs</span>
                    <input
                      type="range"
                      min="90"
                      max="280"
                      step="5"
                      value={modelWeight}
                      onChange={(e) => setModelWeight(Number(e.target.value))}
                      onTouchEnd={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
                      className="flex-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700 accent-moi-400"
                    />
                  </div>
                  {/* Skin Tone */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 w-16">Skin Tone</span>
                    <span className="text-xs text-zinc-900 dark:text-white w-10">{modelSkinTone < 20 ? "Fair" : modelSkinTone < 40 ? "Light" : modelSkinTone < 60 ? "Med" : modelSkinTone < 80 ? "Tan" : "Deep"}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={modelSkinTone}
                      onChange={(e) => setModelSkinTone(Number(e.target.value))}
                      onTouchEnd={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
                      className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-moi-400"
                      style={{ background: "linear-gradient(to right, #fde8dc, #c68642, #5c3d2e)" }}
                    />
                  </div>
                  {/* Other Details */}
                  <input
                    type="text"
                    value={otherDetails}
                    onChange={(e) => setOtherDetails(e.target.value)}
                    placeholder="Other details (e.g., cuffed pants, tucked shirt)"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              )}

              {/* Photo Manager for User Mode */}
              {modelMode === "user" && showPhotoManager && (
                <div className="space-y-2">
                  <PhotoManager clerkId={clerkId} onSelectPhoto={handleSelectPhoto} selectedPhotoId={selectedPhotoId} />
                  {/* Other Details for My Photo mode too */}
                  <input
                    type="text"
                    value={otherDetails}
                    onChange={(e) => setOtherDetails(e.target.value)}
                    placeholder="Other details (e.g., cuffed pants, tucked shirt)"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="px-3 py-3">
              <button
                onClick={handleGenerate}
                disabled={selectedByCategory.size === 0 || isGenerating || ((modelMode === "custom" || modelMode === "user") && !isPaidUser)}
                className="w-full rounded-xl bg-moi-400 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-moi-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {(modelMode === "custom" || modelMode === "user") && !isPaidUser ? "Upgrade to Pro" : isGenerating ? "Generating..." : selectedByCategory.size > 0 ? `Generate Outfit (${selectedByCategory.size})` : "Select items to try on"}
              </button>
            </div>

            {/* Recent Outfits - Mobile */}
            {outfitHistory && outfitHistory.length > 0 && (
              <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={() => setShowOutfitHistory(!showOutfitHistory)}
                  className="flex items-center justify-between w-full text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  <span>Recent Outfits ({outfitHistory.length})</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${showOutfitHistory ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showOutfitHistory && (
                  <div className="flex gap-3 overflow-x-auto py-3 mt-2">
                    {(outfitHistory as OutfitHistoryItem[]).map((outfit) => (
                      <div
                        key={outfit._id}
                        onClick={() => {
                          if (outfit.url) {
                            setGeneratedOutfit(outfit.url);
                            setSelectedOutfitId(outfit._id);
                            setSavedOutfitId(outfit.name ? outfit._id : null);
                          }
                        }}
                        className="relative flex-shrink-0 cursor-pointer"
                      >
                        {outfit.url ? (
                          <div className="relative">
                            <img
                              src={outfit.url}
                              alt={outfit.name || "Saved outfit"}
                              className={`h-24 w-24 rounded-xl object-cover ${selectedOutfitId === outfit._id ? "ring-2 ring-moi-400" : ""}`}
                            />
                            {outfit.name && (
                              <div className="absolute -bottom-1 left-0 right-0 text-center">
                                <span className="inline-block max-w-[96px] truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                                  {outfit.name}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-700">
                            <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                <div className="flex flex-col items-center justify-center py-12 gap-5">
                  {/* Progress Bar */}
                  <div className="w-full max-w-xs">
                    <div className="h-3 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-moi-400 to-moi-500 transition-all duration-500 ease-out"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-sm text-zinc-400">{generationProgress}%</span>
                    </div>
                  </div>
                  <p className="text-base text-zinc-600 dark:text-zinc-400 text-center">{generationStatus}</p>
                </div>
              ) : generatedOutfit ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <img
                      src={generatedOutfit}
                      alt="Generated outfit"
                      className="max-h-[45vh] rounded-xl object-contain shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setShowLightbox(true)}
                    />
                    <button
                      onClick={() => { setGeneratedOutfit(null); setSavedOutfitId(null); }}
                      className="absolute -right-2 -top-2 rounded-full bg-zinc-900 p-1.5 text-white shadow-lg hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Save/Share/Download buttons */}
                  <div className="flex gap-3">
                    {!savedOutfitId && (
                      <button
                        onClick={handleSaveOutfit}
                        disabled={isSaving}
                        className="flex items-center gap-2 rounded-lg bg-moi-400 px-4 py-2 text-sm font-medium text-white hover:bg-moi-500 disabled:opacity-50 transition-colors"
                      >
                        {isSaving ? (
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        )}
                        Save Outfit
                      </button>
                    )}
                    {savedOutfitId && (
                      <span className="flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Saved
                      </span>
                    )}
                    <button
                      onClick={handleDownloadOutfit}
                      className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 transition-colors dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                  </div>
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
                        <div key={item._id} className="group relative aspect-square overflow-hidden rounded-xl border-2 border-moi-400 bg-zinc-100 dark:bg-zinc-800">
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
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${modelMode === "generic" ? "bg-moi-400 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"}`}
                >
                  Generic
                </button>
                <button
                  onClick={() => { setModelMode("custom"); setSelectedPhotoId(null); setSelectedPhotoStorageId(null); setShowPhotoManager(false); }}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${modelMode === "custom" ? "bg-moi-400 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"}`}
                >
                  Custom
                </button>
                <button
                  onClick={() => { setModelMode("user"); setShowPhotoManager(true); }}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${modelMode === "user" ? "bg-moi-400 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"}`}
                >
                  My Photo
                </button>
              </div>

              {/* Usage counter for free users - only on Generic tab */}
              {!isPaidUser && modelMode === "generic" && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center mt-2">
                  {FREE_DAILY_LIMIT - genericUsedToday} of {FREE_DAILY_LIMIT} free try-ons remaining today
                </p>
              )}

              {/* Generic Model - Gender only */}
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
                            ? "bg-moi-400 text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        }`}
                      >
                        M
                      </button>
                      <button
                        onClick={() => setModelGender("female")}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          modelGender === "female"
                            ? "bg-moi-400 text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        }`}
                      >
                        F
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Model - Full customization */}
              {modelMode === "custom" && (
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
                            ? "bg-moi-400 text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        }`}
                      >
                        M
                      </button>
                      <button
                        onClick={() => setModelGender("female")}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          modelGender === "female"
                            ? "bg-moi-400 text-white"
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
                      className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700 accent-moi-400"
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
                      className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700 accent-moi-400"
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
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-moi-400"
                      style={{ background: "linear-gradient(to right, #fde8dc, #c68642, #5c3d2e)" }}
                    />
                  </div>
                  {/* Other Details */}
                  <div>
                    <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-0.5">
                      Other Details (optional)
                    </label>
                    <input
                      type="text"
                      value={otherDetails}
                      onChange={(e) => setOtherDetails(e.target.value)}
                      placeholder="e.g., cuffed pants, shirt tucked in"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                    />
                  </div>
                </div>
              )}

              {/* My Photo Mode */}
              {modelMode === "user" && showPhotoManager && (
                <div className="mt-3 space-y-2">
                  <PhotoManager clerkId={clerkId} onSelectPhoto={handleSelectPhoto} selectedPhotoId={selectedPhotoId} />
                  {/* Other Details */}
                  <div>
                    <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-0.5">
                      Other Details (optional)
                    </label>
                    <input
                      type="text"
                      value={otherDetails}
                      onChange={(e) => setOtherDetails(e.target.value)}
                      placeholder="e.g., cuffed pants, shirt tucked in"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex-shrink-0 border-t border-zinc-200 p-4 dark:border-zinc-800">
            <button
              onClick={handleGenerate}
              disabled={selectedByCategory.size === 0 || isGenerating || ((modelMode === "custom" || modelMode === "user") && !isPaidUser)}
              className="w-full rounded-lg bg-moi-400 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-moi-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {(modelMode === "custom" || modelMode === "user") && !isPaidUser ? "Upgrade to Pro" : isGenerating ? "Generating..." : `Generate Outfit (${selectedByCategory.size} item${selectedByCategory.size !== 1 ? "s" : ""})`}
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
                      activeCategory === cat.id ? "bg-moi-400 text-white"
                        : hasSelection ? "bg-moi-100 text-moi-500 dark:bg-moi-900/30 dark:text-moi-400"
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
                      ? "bg-moi-400 text-white"
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
                className="w-full rounded-lg border border-zinc-300 bg-white py-1.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
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
                        isSelected ? "border-moi-400 ring-2 ring-moi-400/20"
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
                      {/* Selection Indicator or Info Button */}
                      {isSelected ? (
                        <div className="absolute right-1 top-1 rounded-full bg-moi-400 p-1">
                          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsItem(item);
                          }}
                          className="absolute right-1 top-1 rounded-full bg-white/90 dark:bg-zinc-900/90 p-1.5 shadow-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-zinc-800"
                        >
                          <svg className="h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{selectedByCategory.size} item{selectedByCategory.size !== 1 ? "s" : ""} selected</span>
                <button onClick={() => setSelectedByCategory(new Map())} className="text-sm text-red-500 hover:underline">Clear all</button>
              </div>
            </div>
          )}
          {outfitHistory && outfitHistory.length > 0 && (
            <div className="flex-shrink-0 border-t border-zinc-200 px-6 py-3 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowOutfitHistory(!showOutfitHistory)}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                >
                  <span>Recent Outfits ({outfitHistory.length})</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${showOutfitHistory ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showOutfitHistory && (
                  <button
                    onClick={handleClearRecentOutfits}
                    disabled={isClearingRecent}
                    className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                  >
                    {isClearingRecent ? "Clearing..." : "Clear All"}
                  </button>
                )}
              </div>
              {showOutfitHistory && (
                <div className="flex gap-3 overflow-x-auto py-2 mt-2">
                  {(outfitHistory as OutfitHistoryItem[]).map((outfit) => {
                    const isSelected = selectedOutfitId === outfit._id;
                    return (
                      <div
                        key={outfit._id}
                        className="relative flex-shrink-0 group"
                      >
                        <div
                          onClick={() => {
                            if (outfit.url) {
                              setGeneratedOutfit(outfit.url);
                              setSelectedOutfitId(outfit._id);
                              // Only set savedOutfitId if outfit has a name (was previously saved)
                              setSavedOutfitId(outfit.name ? outfit._id : null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              if (outfit.url) {
                                setGeneratedOutfit(outfit.url);
                                setSelectedOutfitId(outfit._id);
                                setSavedOutfitId(outfit.name ? outfit._id : null);
                              }
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer"
                        >
                          {outfit.url ? (
                            <div className="relative">
                              <img src={outfit.url} alt={outfit.name || "Saved outfit"} className={`h-14 w-14 rounded-lg object-cover transition-all ${isSelected ? "ring-2 ring-moi-400 ring-offset-2 dark:ring-offset-zinc-900" : "hover:ring-2 hover:ring-moi-400 hover:ring-offset-2 dark:hover:ring-offset-zinc-900"}`} />
                              {outfit.name && (
                                <div className="absolute -bottom-1 left-0 right-0 text-center">
                                  <span className="inline-block max-w-[56px] truncate rounded bg-black/60 px-1 text-[8px] text-white">
                                    {outfit.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                              <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {/* X button to remove individual outfit */}
                        <button
                          onClick={(e) => handleRemoveFromHistory(e, outfit._id)}
                          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                          title="Remove"
                        >
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {showLightbox && generatedOutfit && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={generatedOutfit}
            alt="Generated outfit - full view"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Save Outfit Modal */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 pt-safe"
          onClick={() => setShowSaveModal(false)}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-xl dark:bg-zinc-900 max-h-[80vh] sm:max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pb-3 -mt-1">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2 text-center">
              Save Outfit
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center mb-4">
              Enter a name or add to a collection to save
            </p>
            <div className="mb-4">
              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1 text-center">
                Outfit Name
              </label>
              <input
                type="text"
                value={outfitName}
                onChange={(e) => setOutfitName(e.target.value)}
                placeholder="e.g., Date night look"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                autoFocus
              />
            </div>

            {/* Collection Selection */}
            <div className="mb-4">
              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1 text-center">
                Add to Collection
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => {
                    setNewCollectionName(e.target.value);
                    // If typing, clear selected collection and mark as creating new
                    if (e.target.value.trim()) {
                      setSelectedCollectionId(null);
                      setIsCreatingCollection(true);
                    } else {
                      setIsCreatingCollection(false);
                    }
                  }}
                  placeholder="Type to create new or select below"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                />
                {newCollectionName.trim() && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-moi-500">
                    + New
                  </span>
                )}
              </div>
              {collections && collections.length > 0 && !newCollectionName.trim() && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {collections.map((collection) => (
                    <button
                      key={collection._id}
                      type="button"
                      onClick={() => {
                        if (selectedCollectionId === collection._id) {
                          setSelectedCollectionId(null);
                        } else {
                          setSelectedCollectionId(collection._id);
                          setIsCreatingCollection(false);
                        }
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        selectedCollectionId === collection._id
                          ? "bg-moi-400 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {collection.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4 text-xs text-zinc-500 dark:text-zinc-400 text-center">
              <span className="font-medium">Items:</span>{" "}
              {selectedItems.map(i => i.displayName).join(", ")}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="flex-1 rounded-lg bg-moi-400 px-4 py-2 text-sm font-medium text-white hover:bg-moi-500 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Details Modal */}
      {detailsItem && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 pt-safe"
          onClick={(e) => {
            e.stopPropagation();
            setDetailsItem(null);
          }}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-white shadow-xl dark:bg-zinc-900 overflow-hidden max-h-[calc(100dvh-env(safe-area-inset-top,0px)-1rem)] sm:max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center py-2 bg-white dark:bg-zinc-900 sticky top-0 z-10">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            </div>

            {/* Image */}
            <div className="relative aspect-square sm:aspect-[4/3] bg-zinc-100 dark:bg-zinc-800">
              {detailsItem.displayImageUrl ? (
                <img
                  src={detailsItem.displayImageUrl}
                  alt={detailsItem.displayName || "Item"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg className="h-16 w-16 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {/* Close button */}
              <button
                onClick={() => setDetailsItem(null)}
                className="absolute right-3 top-3 rounded-full bg-black/50 p-2.5 text-white hover:bg-black/70 active:bg-black/80 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {/* Owned/Wishlist badge */}
              <div className="absolute left-3 top-3 rounded-full bg-white/90 dark:bg-zinc-900/90 px-2 py-1 flex items-center gap-1 shadow-sm">
                {detailsItem.isOwned ? (
                  <>
                    <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Owned</span>
                  </>
                ) : detailsItem.isWishlist ? (
                  <>
                    <svg className="h-4 w-4 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Wishlist</span>
                  </>
                ) : null}
              </div>
            </div>

            {/* Item Details */}
            <div className="p-4">
              {/* Name */}
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
                {detailsItem.displayName}
              </h3>

              {/* Brand */}
              {detailsItem.displayBrand && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                  {detailsItem.displayBrand}
                </p>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {detailsItem.displayCategory && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Category</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{detailsItem.displayCategory}</p>
                  </div>
                )}
                {detailsItem.material && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Material</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{detailsItem.material}</p>
                  </div>
                )}
                {detailsItem.gender && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Gender</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{detailsItem.gender}</p>
                  </div>
                )}
                {detailsItem.size && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Size</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{detailsItem.size}</p>
                  </div>
                )}
                {detailsItem.color && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Color</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{detailsItem.color}</p>
                  </div>
                )}
              </div>

              {/* Link to product page - show for items that aren't generated (source !== "generated") */}
              {detailsItem.source !== "generated" && detailsItem.linkedProductId && (
                <a
                  href={`/product/${detailsItem.linkedProductId}?from=closet-popup`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-moi-400 px-4 py-3 text-sm font-medium text-white hover:bg-moi-500 active:bg-moi-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Product Details
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal - shown when usage limit reached */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-moi-100 p-4 dark:bg-moi-900/30">
                <svg className="h-10 w-10 text-moi-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white text-center mb-2">
              {modelMode === "user" ? "Custom Model Limit Reached" : "Daily Limit Reached"}
            </h3>

            {/* Description */}
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-6">
              {modelMode === "user"
                ? `You've used all ${PAID_WEEKLY_CUSTOM_LIMIT} custom model try-ons this week.`
                : `You've used all ${FREE_DAILY_LIMIT} free try-ons for today.`}
            </p>

            {/* Benefits list */}
            {!isPaidUser && (
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 mb-6">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Upgrade to Pro for:</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Unlimited generic model try-ons
                  </li>
                  <li className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Custom model with your photos
                  </li>
                  <li className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Advanced customization (height, weight, skin tone)
                  </li>
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {isPaidUser ? "Okay" : "Try again tomorrow"}
              </button>
              {!isPaidUser && (
                <Link
                  href="/profile?tab=subscription"
                  className="flex-1 rounded-lg bg-moi-400 px-4 py-2.5 text-sm font-medium text-white hover:bg-moi-500 text-center"
                  onClick={() => setShowUpgradeModal(false)}
                >
                  Upgrade to Pro
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
