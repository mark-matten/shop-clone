"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/layout";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Available categories for closet items
const CLOSET_CATEGORIES = [
  "shoes",
  "clothing",
  "accessories",
  "bags",
  "outerwear",
  "tops",
  "bottoms",
  "dresses",
  "activewear",
  "other",
];

// Helper to get a CSS color from a color name
function getColorFromName(colorName: string): string {
  const colorMap: Record<string, string> = {
    'black': '#000000', 'white': '#ffffff', 'grey': '#6b7280', 'gray': '#6b7280',
    'navy': '#1e3a5f', 'blue': '#2563eb', 'red': '#dc2626', 'green': '#16a34a',
    'brown': '#92400e', 'tan': '#d2b48c', 'beige': '#f5f5dc', 'cream': '#fffdd0',
    'pink': '#ec4899', 'purple': '#9333ea', 'orange': '#ea580c', 'yellow': '#eab308',
    'olive': '#65a30d', 'burgundy': '#800020', 'charcoal': '#374151', 'khaki': '#c3b091',
    'coral': '#f97316', 'teal': '#0d9488', 'maroon': '#7f1d1d', 'mint': '#10b981',
    'gold': '#ca8a04', 'silver': '#9ca3af', 'ivory': '#fffff0', 'indigo': '#4f46e5',
  };

  const lowerColor = colorName.toLowerCase();
  for (const [key, hex] of Object.entries(colorMap)) {
    if (lowerColor.includes(key)) {
      return hex;
    }
  }
  return '#6b7280';
}

interface CombinedItem {
  productId: Id<"products">;
  product: {
    _id: Id<"products">;
    name: string;
    brand: string;
    price: number;
    imageUrl?: string;
    category: string;
    colorName?: string;
    colorGroupId?: string;
    options?: { name: string; values: string[] }[];
  };
  selectedOptions?: Record<string, string>;
  customCategory?: string;
  sortOrder?: number;
  isOwned: boolean;
  isWishlist: boolean;
  addedAt: number;
}

interface EditingItem {
  productId: Id<"products">;
  productName: string;
  options: { name: string; values: string[] }[];
  currentOptions: Record<string, string>;
  colorGroupId?: string;
  currentColor?: string;
  currentCategory: string;
  isOwned: boolean;
  isWishlist: boolean;
}

type TypeFilter = "all" | "owned" | "wishlist";

// Sortable item component
function SortableItem({
  item,
  onEdit,
  onRemove,
  isDragging,
}: {
  item: CombinedItem;
  onEdit: (item: CombinedItem) => void;
  onRemove: (item: CombinedItem) => void;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.productId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const product = item.product;
  const selectedColor = item.selectedOptions?.["Color"] || item.selectedOptions?.["Colour"] || product.colorName;
  const selectedSize = item.selectedOptions?.["Size"];
  const colorHex = selectedColor ? getColorFromName(selectedColor) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-2 z-10 cursor-grab rounded bg-white/80 p-1.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:bg-zinc-800/80 active:cursor-grabbing"
      >
        <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      <Link href={`/product/${product._id}`}>
        <div className="aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-400">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="p-4">
          <span className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
            {product.brand}
          </span>
          <h3 className="mt-1 line-clamp-2 text-sm font-medium text-zinc-900 dark:text-white">
            {product.name}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedColor && (
              <span
                className="rounded px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${colorHex}20`, color: colorHex || '#6b7280' }}
              >
                {selectedColor}
              </span>
            )}
            {selectedSize && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                Size {selectedSize}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">
            ${product.price.toFixed(2)}
          </p>
        </div>
      </Link>

      {/* Action Buttons */}
      <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => { e.preventDefault(); onEdit(item); }}
          className="rounded-full bg-white/90 p-2 text-zinc-600 shadow-sm hover:bg-white hover:text-purple-600 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-purple-400"
          title="Edit size/color/category"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.preventDefault(); onRemove(item); }}
          className="rounded-full bg-white/90 p-2 text-zinc-600 shadow-sm hover:bg-white hover:text-red-600 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400"
          title="Remove"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Status Badge */}
      <div className="absolute right-2 bottom-16">
        {item.isOwned ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-600 px-2 py-1 text-xs font-medium text-white">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Owned
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-xs font-medium text-white">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Wishlist
          </span>
        )}
      </div>
    </div>
  );
}

// Droppable category section
function CategorySection({
  category,
  items,
  onEdit,
  onRemove,
  activeId,
  isOver,
}: {
  category: string;
  items: CombinedItem[];
  onEdit: (item: CombinedItem) => void;
  onRemove: (item: CombinedItem) => void;
  activeId: string | null;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: `category-${category}` });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
        isOver
          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
          : "border-transparent"
      }`}
    >
      <h3 className="mb-4 text-lg font-semibold capitalize text-zinc-900 dark:text-white">
        {category} ({items.length})
      </h3>
      {items.length > 0 ? (
        <SortableContext items={items.map(i => i.productId)} strategy={rectSortingStrategy}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <SortableItem
                key={item.productId}
                item={item}
                onEdit={onEdit}
                onRemove={onRemove}
                isDragging={activeId === item.productId}
              />
            ))}
          </div>
        </SortableContext>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Drag items here
        </div>
      )}
    </div>
  );
}

// Drag overlay item (shown while dragging)
function DragOverlayItem({ item }: { item: CombinedItem }) {
  const product = item.product;

  return (
    <div className="w-48 overflow-hidden rounded-xl border border-purple-500 bg-white shadow-xl dark:bg-zinc-900">
      <div className="aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {product.imageUrl && (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{product.name}</p>
      </div>
    </div>
  );
}

export default function ClosetPage() {
  const { user, isLoaded } = useUser();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [editOptions, setEditOptions] = useState<Record<string, string>>({});
  const [editCategory, setEditCategory] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overCategory, setOverCategory] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch both closet items and favorites
  const closetItems = useQuery(
    api.closet.getClosetItems,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const favorites = useQuery(
    api.favorites.getFavorites,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const removeFromCloset = useMutation(api.closet.removeFromCloset);
  const removeFavorite = useMutation(api.favorites.removeFavorite);
  const updateClosetItemOptions = useMutation(api.closet.updateClosetItemOptions);
  const updateFavoriteOptions = useMutation(api.favorites.updateFavoriteOptions);
  const updateClosetItemCategory = useMutation(api.closet.updateClosetItemCategory);
  const updateClosetItemsOrder = useMutation(api.closet.updateClosetItemsOrder);

  // Combine closet items and favorites into a unified list
  const combinedItems = useMemo((): CombinedItem[] => {
    if (!closetItems && !favorites) return [];

    const itemMap = new Map<string, CombinedItem>();

    // Add closet items (owned)
    for (const item of closetItems || []) {
      if (!item.product) continue;
      itemMap.set(item.product._id, {
        productId: item.product._id,
        product: item.product as CombinedItem["product"],
        selectedOptions: item.selectedOptions,
        customCategory: (item as any).customCategory,
        sortOrder: (item as any).sortOrder,
        isOwned: true,
        isWishlist: false,
        addedAt: item.addedAt,
      });
    }

    // Add/merge favorites (wishlist)
    for (const fav of favorites || []) {
      if (!fav.product) continue;
      const existing = itemMap.get(fav.product._id);
      if (existing) {
        existing.isWishlist = true;
        // If favorite has customCategory but closet item doesn't, use favorite's
        if (!existing.customCategory && (fav as any).customCategory) {
          existing.customCategory = (fav as any).customCategory;
        }
      } else {
        itemMap.set(fav.product._id, {
          productId: fav.product._id,
          product: fav.product as CombinedItem["product"],
          selectedOptions: fav.selectedOptions,
          customCategory: (fav as any).customCategory,
          isOwned: false,
          isWishlist: true,
          addedAt: fav.createdAt,
        });
      }
    }

    return Array.from(itemMap.values()).sort((a, b) => {
      // Sort by sortOrder if available, otherwise by addedAt
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
      }
      return b.addedAt - a.addedAt;
    });
  }, [closetItems, favorites]);

  // Calculate stats
  const stats = useMemo(() => {
    const ownedCount = combinedItems.filter(i => i.isOwned).length;
    const wishlistCount = combinedItems.filter(i => i.isWishlist && !i.isOwned).length;
    const categories = new Set(combinedItems.map(i => i.customCategory || i.product?.category).filter(Boolean));
    return {
      total: combinedItems.length,
      owned: ownedCount,
      wishlist: wishlistCount,
      categoryCount: categories.size,
    };
  }, [combinedItems]);

  // Filter by type
  const filteredByType = useMemo(() => {
    let items = combinedItems;
    if (typeFilter === "owned") {
      items = items.filter(i => i.isOwned);
    } else if (typeFilter === "wishlist") {
      items = items.filter(i => i.isWishlist && !i.isOwned);
    }
    return items;
  }, [combinedItems, typeFilter]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(filteredByType.map(i => i.customCategory || i.product?.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [filteredByType]);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const groups: Record<string, CombinedItem[]> = {};
    for (const item of filteredByType) {
      const cat = item.customCategory || item.product?.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [filteredByType]);

  // Get filtered items (when a specific category is selected)
  const filteredItems = useMemo(() => {
    if (!selectedCategory) return filteredByType;
    return filteredByType.filter(i => (i.customCategory || i.product?.category) === selectedCategory);
  }, [filteredByType, selectedCategory]);

  const handleRemove = async (item: CombinedItem) => {
    if (!user?.id) return;
    const message = item.isOwned
      ? "Remove this item from your closet?"
      : "Remove this item from your wishlist?";
    if (confirm(message)) {
      if (item.isOwned) {
        await removeFromCloset({ clerkId: user.id, productId: item.productId });
      } else {
        await removeFavorite({ clerkId: user.id, productId: item.productId });
      }
    }
  };

  const handleEdit = (item: CombinedItem) => {
    if (!item.product) return;
    const currentColor = item.selectedOptions?.["Color"] || item.selectedOptions?.["Colour"] || item.product.colorName;
    const currentCategory = item.customCategory || item.product.category;
    setEditingItem({
      productId: item.product._id,
      productName: item.product.name,
      options: item.product.options || [],
      currentOptions: item.selectedOptions || {},
      colorGroupId: item.product.colorGroupId,
      currentColor,
      currentCategory,
      isOwned: item.isOwned,
      isWishlist: item.isWishlist,
    });
    setEditOptions({
      ...item.selectedOptions,
      ...(currentColor ? { Color: currentColor } : {}),
    });
    setEditCategory(currentCategory);
  };

  const colorVariants = useQuery(
    api.products.getColorVariants,
    editingItem?.colorGroupId ? { colorGroupId: editingItem.colorGroupId } : "skip"
  );

  const handleSaveEdit = async () => {
    if (!user?.id || !editingItem) return;

    const categoryChanged = editCategory !== editingItem.currentCategory;

    if (editingItem.isOwned) {
      await updateClosetItemOptions({
        clerkId: user.id,
        productId: editingItem.productId,
        selectedOptions: editOptions,
        customCategory: categoryChanged ? editCategory : undefined,
      });
    } else {
      await updateFavoriteOptions({
        clerkId: user.id,
        productId: editingItem.productId,
        selectedOptions: editOptions,
        customCategory: categoryChanged ? editCategory : undefined,
      });
    }
    setEditingItem(null);
    setEditOptions({});
    setEditCategory("");
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (over?.id && typeof over.id === "string" && over.id.startsWith("category-")) {
      setOverCategory(over.id.replace("category-", ""));
    } else {
      setOverCategory(null);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverCategory(null);

    if (!over || !user?.id) return;

    const activeItem = combinedItems.find(i => i.productId === active.id);
    if (!activeItem || !activeItem.isOwned) return; // Only owned items can be reordered/recategorized

    // Check if dropped on a category
    if (typeof over.id === "string" && over.id.startsWith("category-")) {
      const newCategory = over.id.replace("category-", "");
      const currentCategory = activeItem.customCategory || activeItem.product?.category;

      if (newCategory !== currentCategory) {
        await updateClosetItemCategory({
          clerkId: user.id,
          productId: activeItem.productId,
          customCategory: newCategory,
        });
      }
      return;
    }

    // Check if reordering within same category
    const overItem = combinedItems.find(i => i.productId === over.id);
    if (!overItem) return;

    const activeCategory = activeItem.customCategory || activeItem.product?.category;
    const overCategory = overItem.customCategory || overItem.product?.category;

    if (activeCategory === overCategory) {
      // Reorder within category
      const categoryItems = itemsByCategory[activeCategory] || [];
      const oldIndex = categoryItems.findIndex(i => i.productId === active.id);
      const newIndex = categoryItems.findIndex(i => i.productId === over.id);

      if (oldIndex !== newIndex) {
        const reordered = arrayMove(categoryItems, oldIndex, newIndex);
        const updates = reordered.map((item, index) => ({
          productId: item.productId,
          sortOrder: index,
        }));
        await updateClosetItemsOrder({ clerkId: user.id, items: updates });
      }
    } else {
      // Move to different category
      await updateClosetItemCategory({
        clerkId: user.id,
        productId: activeItem.productId,
        customCategory: overCategory,
      });
    }
  }, [combinedItems, itemsByCategory, user?.id, updateClosetItemCategory, updateClosetItemsOrder]);

  const activeItem = activeId ? combinedItems.find(i => i.productId === activeId) : null;

  // Loading state
  if (!isLoaded || closetItems === undefined || favorites === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-80 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <svg className="mx-auto h-16 w-16 text-zinc-300 dark:text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-white">
              Sign in to view your closet
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Track the clothes you own and save items to your wishlist
            </p>
            <Link
              href="/sign-in"
              className="mt-6 inline-block rounded-lg bg-purple-600 px-6 py-3 font-medium text-white hover:bg-purple-500"
            >
              Sign In
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header with compact stats */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              My Closet
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {stats.total} items · {stats.categoryCount} categories · Drag to reorder or change category
            </p>
          </div>
        </div>

        {/* Type Filter Buttons */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => { setTypeFilter("all"); setSelectedCategory(null); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              typeFilter === "all"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            All Clothes ({stats.total})
          </button>
          <button
            onClick={() => { setTypeFilter("owned"); setSelectedCategory(null); }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              typeFilter === "owned"
                ? "bg-purple-600 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Owned ({stats.owned})
          </button>
          <button
            onClick={() => { setTypeFilter("wishlist"); setSelectedCategory(null); }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              typeFilter === "wishlist"
                ? "bg-red-500 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Wishlist ({stats.wishlist})
          </button>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? "bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors ${
                  selectedCategory === category
                    ? "bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {combinedItems.length === 0 ? (
          <div className="mt-16 text-center">
            <svg className="mx-auto h-16 w-16 text-zinc-300 dark:text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-white">
              Your closet is empty
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Browse products to add items you own or save to your wishlist
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-lg bg-purple-600 px-6 py-3 font-medium text-white hover:bg-purple-500"
            >
              Browse Products
            </Link>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              No items match your current filters
            </p>
          </div>
        ) : (
          /* Items with Drag and Drop */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="mt-6 space-y-8">
              {selectedCategory ? (
                // Single category view
                <SortableContext items={filteredItems.map(i => i.productId)} strategy={rectSortingStrategy}>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredItems.map((item) => (
                      <SortableItem
                        key={item.productId}
                        item={item}
                        onEdit={handleEdit}
                        onRemove={handleRemove}
                        isDragging={activeId === item.productId}
                      />
                    ))}
                  </div>
                </SortableContext>
              ) : (
                // Category sections view
                categories.map((category) => (
                  <CategorySection
                    key={category}
                    category={category}
                    items={itemsByCategory[category] || []}
                    onEdit={handleEdit}
                    onRemove={handleRemove}
                    activeId={activeId}
                    isOver={overCategory === category}
                  />
                ))
              )}
            </div>

            <DragOverlay>
              {activeItem && <DragOverlayItem item={activeItem} />}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Edit Item
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
              {editingItem.productName}
            </p>

            <div className="mt-4 space-y-4">
              {/* Category Selection - available for both owned and wishlist items */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  {CLOSET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="capitalize">
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color selection from variants */}
              {colorVariants && colorVariants.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colorVariants.map((variant) => {
                      if (!variant.colorName) return null;
                      const isSelected = editOptions["Color"] === variant.colorName;
                      const colorHex = variant.colorHex || getColorFromName(variant.colorName);
                      return (
                        <button
                          key={variant._id}
                          onClick={() => setEditOptions({ ...editOptions, Color: variant.colorName! })}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                            isSelected
                              ? "border-purple-600 ring-2 ring-purple-600"
                              : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
                          }`}
                          title={variant.colorName}
                        >
                          <span
                            className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-600"
                            style={{ backgroundColor: colorHex }}
                          />
                          <span className="text-zinc-900 dark:text-white">
                            {variant.colorName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Show current color if no variants available */}
              {(!colorVariants || colorVariants.length <= 1) && editingItem.currentColor && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Color
                  </label>
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <span
                      className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-600"
                      style={{ backgroundColor: getColorFromName(editingItem.currentColor) }}
                    />
                    {editingItem.currentColor}
                    <span className="text-xs text-zinc-400">(no other colors available)</span>
                  </div>
                </div>
              )}

              {/* Size and other options */}
              {editingItem.options.map((option) => (
                <div key={option.name}>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    {option.name}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {option.values.map((value) => {
                      const isSelected = editOptions[option.name] === value;
                      return (
                        <button
                          key={value}
                          onClick={() => setEditOptions({ ...editOptions, [option.name]: value })}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                            isSelected
                              ? "border-purple-600 bg-purple-600 text-white"
                              : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:border-zinc-500"
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setEditingItem(null);
                  setEditOptions({});
                  setEditCategory("");
                }}
                className="flex-1 rounded-lg border border-zinc-300 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 rounded-lg bg-purple-600 py-2 font-medium text-white transition-colors hover:bg-purple-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
