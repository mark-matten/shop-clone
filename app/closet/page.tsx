"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/layout";
import { AddClothesModal, EditImageModal, TryOnModal } from "@/components/closet";
import { FindFriendsModal } from "@/components/social/FindFriendsModal";
import { FollowingList } from "@/components/social/FollowingList";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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

// Available categories for closet items (consistent with try-on)
const CLOSET_CATEGORIES = [
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

// Infer category from text (product name, description, etc.)
function inferCategoryFromText(text: string): string | null {
  const lower = text.toLowerCase();

  // Check outerwear FIRST (before tops) because jackets/coats are often misclassified as tops
  if (lower.includes("jacket") || lower.includes("coat") || lower.includes("outerwear") ||
      lower.includes("blazer") || lower.includes("parka") || lower.includes("windbreaker") ||
      lower.includes("anorak") || lower.includes("trench") || lower.includes("puffer") ||
      lower.includes("bomber") || lower.includes("peacoat") || lower.includes("overcoat")) {
    return "outerwear";
  }

  // Dresses: dresses, jumpsuits, rompers
  if (lower.includes("dress") || lower.includes("jumpsuit") || lower.includes("romper") ||
      lower.includes("gown") || lower.includes("maxi") || lower.includes("midi")) {
    return "dresses";
  }

  // Bottoms: pants, jeans, shorts, skirts, chinos, trousers, leggings
  if (lower.includes("bottom") || lower.includes("pant") || lower.includes("jean") ||
      lower.includes("skirt") || lower.includes("short") || lower.includes("chino") ||
      lower.includes("trouser") || lower.includes("legging") || lower.includes("jogger") ||
      lower.includes("cargo") || lower.includes("capri") || lower.includes("culottes")) {
    return "bottoms";
  }

  // Shoes: all footwear
  if (lower.includes("shoe") || lower.includes("boot") || lower.includes("sneaker") ||
      lower.includes("heel") || lower.includes("sandal") || lower.includes("loafer") ||
      lower.includes("flat") || lower.includes("mule") || lower.includes("slipper") ||
      lower.includes("oxford") || lower.includes("pump") || lower.includes("wedge") ||
      lower.includes("footwear") || lower.includes("trainer") || lower.includes("kicks") ||
      lower.includes("espadrille") || lower.includes("clog") || lower.includes("derby")) {
    return "shoes";
  }

  // Bags: all bags and purses
  if (lower.includes("bag") || lower.includes("tote") || lower.includes("purse") ||
      lower.includes("backpack") || lower.includes("clutch") || lower.includes("satchel") ||
      lower.includes("crossbody") || lower.includes("wallet") || lower.includes("pouch") ||
      lower.includes("handbag") || lower.includes("duffel") || lower.includes("weekender")) {
    return "bags";
  }

  // Accessories: jewelry, hats, scarves, belts, socks, etc.
  if (lower.includes("accessor") || lower.includes("jewelry") || lower.includes("hat") ||
      lower.includes("scarf") || lower.includes("belt") || lower.includes("watch") ||
      lower.includes("sock") || lower.includes("glove") || lower.includes("sunglasse") ||
      lower.includes("tie") || lower.includes("beanie") || lower.includes("cap") ||
      lower.includes("earring") || lower.includes("necklace") || lower.includes("bracelet") ||
      lower.includes("ring") || lower.includes("headband")) {
    return "accessories";
  }

  // Activewear: athletic, sports, workout, yoga, gym
  if (lower.includes("active") || lower.includes("sport") || lower.includes("athletic") ||
      lower.includes("workout") || lower.includes("yoga") || lower.includes("gym") ||
      lower.includes("running") || lower.includes("training") || lower.includes("leotard") ||
      lower.includes("sports bra")) {
    return "activewear";
  }

  // Tops checked last - it's often used as a fallback incorrectly
  if (lower.includes("shirt") || lower.includes("blouse") ||
      lower.includes("sweater") || lower.includes("tee") || lower.includes("polo") ||
      lower.includes("bodysuit") || lower.includes("tank") || lower.includes("cami") ||
      lower.includes("henley") || lower.includes("cardigan") || lower.includes("pullover") ||
      lower.includes("hoodie") || lower.includes("vest") || lower.includes("t-shirt") ||
      lower.includes("crop top") || lower.includes("tunic")) {
    return "tops";
  }

  return null;
}

// Map any category to a normalized key (consistent with try-on)
// Also checks product name for better accuracy
function getCategoryKey(category: string, productName?: string): string {
  // First, try to infer category from product name (more accurate)
  if (productName) {
    const inferredFromName = inferCategoryFromText(productName);
    if (inferredFromName) {
      return inferredFromName;
    }
  }

  // Fall back to inferring from category string
  const inferredFromCategory = inferCategoryFromText(category);
  if (inferredFromCategory) {
    return inferredFromCategory;
  }

  // Handle generic category names
  const lower = category.toLowerCase();
  if (lower === "top" || lower === "tops") return "tops";
  if (lower === "bottom" || lower === "bottoms") return "bottoms";
  if (lower === "dress" || lower === "dresses") return "dresses";
  if (lower === "shoe" || lower === "shoes") return "shoes";
  if (lower === "bag" || lower === "bags") return "bags";
  if (lower === "accessory" || lower === "accessories") return "accessories";

  // Intimates/loungewear/clothing -> other
  if (lower.includes("intimate") || lower.includes("underwear") || lower.includes("bra") ||
      lower.includes("lounge") || lower.includes("pajama") || lower.includes("sleepwear") ||
      lower.includes("robe") || lower.includes("lingerie") || lower === "clothing") {
    return "other";
  }

  return "other";
}

// Helper to get a CSS color from a color name
function getColorFromName(colorName: string): string {
  const colorMap: Record<string, string> = {
    'black': '#000000', 'white': '#ffffff', 'grey': '#6b7280', 'gray': '#6b7280',
    'navy': '#1e3a5f', 'blue': '#2563eb', 'red': '#dc2626', 'green': '#16a34a',
    'brown': '#92400e', 'tan': '#d2b48c', 'beige': '#f5f5dc', 'cream': '#fffdd0',
    'pink': '#ec4899', 'rose': '#f43f5e', 'purple': '#9333ea', 'orange': '#ea580c', 'yellow': '#eab308',
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

// Helper to check if a color is light (needs dark text)
function isLightColor(hex: string): boolean {
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

// Get text color for a color badge (dark text for light colors)
function getColorBadgeTextColor(hex: string): string {
  return isLightColor(hex) ? '#374151' : hex;
}

interface CombinedItem {
  productId: Id<"products">;
  closetItemId?: string; // The actual closet_item._id for linking to TryOnModal
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
    gender?: "men" | "women" | "unisex"; // For user-added items
    material?: string; // For user-added items
  };
  selectedOptions?: Record<string, string>;
  customCategory?: string;
  sortOrder?: number;
  isOwned: boolean;
  isWishlist: boolean;
  addedAt: number;
  isUserAdded?: boolean; // true for URL-sourced or generated items (no real product)
  sourceUrl?: string; // Original URL for URL-sourced items
}

interface EditingItem {
  productId: Id<"products">;
  productName: string;
  options: { name: string; values: string[] }[];
  currentOptions: Record<string, string>;
  colorGroupId?: string;
  currentColor?: string;
  currentCategory: string;
  currentSize?: string;
  currentGender?: "men" | "women" | "unisex";
  currentMaterial?: string;
  currentBrand?: string; // For user-added items
  isOwned: boolean;
  isWishlist: boolean;
  isUserAdded?: boolean; // true for URL-sourced or generated items
  closetItemId?: string; // ID for user-added items
}

type TypeFilter = "all" | "owned" | "wishlist";
type ViewMode = "grid" | "list";

// Sortable list item component
function SortableListItem({
  item,
  onEdit,
  onRemove,
  onViewDetails,
  isDragging,
}: {
  item: CombinedItem;
  onEdit: (item: CombinedItem) => void;
  onRemove: (item: CombinedItem) => void;
  onViewDetails: (item: CombinedItem) => void;
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

  // Content for thumbnail
  const thumbnailContent = (
    <div className="h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-zinc-400">
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  );

  // Content for info section
  const infoContent = (
    <div className="min-w-0">
      <p className="text-[10px] sm:text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400 truncate">
        {product.brand}
      </p>
      <h3 className="truncate text-xs sm:text-sm font-medium text-zinc-900 dark:text-white">
        {product.name}
      </h3>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {selectedColor && colorHex && (
          <span
            className="inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] sm:text-xs font-medium leading-none"
            style={{
              backgroundColor: `${colorHex}20`,
              color: getColorBadgeTextColor(colorHex),
              borderColor: isLightColor(colorHex) ? '#d1d5db' : 'transparent'
            }}
          >
            <span
              className="h-2 w-2 rounded-full border flex-shrink-0"
              style={{
                backgroundColor: colorHex,
                borderColor: isLightColor(colorHex) ? '#d1d5db' : 'transparent'
              }}
            />
            <span className="truncate max-w-[50px] sm:max-w-none">{selectedColor}</span>
          </span>
        )}
        {selectedSize && (
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 leading-none">
            {selectedSize}
          </span>
        )}
        {/* Status Badge inline */}
        {item.isOwned ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-500 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-white leading-none">
            <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Owned
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-white leading-none">
            <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Wishlist
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 sm:gap-3 rounded-lg border border-zinc-200 bg-white p-1.5 sm:p-2 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      {/* Drag Handle - visible on all devices */}
      <div
        {...attributes}
        {...listeners}
        className="flex flex-shrink-0 cursor-grab rounded p-1.5 text-zinc-400 opacity-70 sm:opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-600 sm:group-hover:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 active:cursor-grabbing touch-none"
      >
        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Thumbnail - Click to view details */}
      <div className="flex-shrink-0 cursor-pointer" onClick={() => onViewDetails(item)}>
        {thumbnailContent}
      </div>

      {/* Info - Click to view details */}
      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onViewDetails(item)}>
        {infoContent}
      </div>

      {/* Action Button - Edit only */}
      <div className="flex flex-shrink-0 opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100">
        <button
          onClick={(e) => { e.preventDefault(); onEdit(item); }}
          className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-moi-400 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-moi-400"
          title="Edit"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Sortable item component
function SortableItem({
  item,
  onEdit,
  onRemove,
  onViewDetails,
  isDragging,
}: {
  item: CombinedItem;
  onEdit: (item: CombinedItem) => void;
  onRemove: (item: CombinedItem) => void;
  onViewDetails: (item: CombinedItem) => void;
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

  // Content for the card
  const cardContent = (
    <>
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
      <div className="p-2 sm:p-3">
        <span className="text-[10px] sm:text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400 truncate block">
          {product.brand}
        </span>
        <h3 className="mt-0.5 line-clamp-1 sm:line-clamp-2 text-xs sm:text-sm font-medium text-zinc-900 dark:text-white">
          {product.name}
        </h3>
        {/* Badges row - aligned horizontally */}
        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
          {selectedColor && colorHex && (
            <span
              className="inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] sm:text-xs font-medium leading-none"
              style={{
                backgroundColor: `${colorHex}20`,
                color: getColorBadgeTextColor(colorHex),
                borderColor: isLightColor(colorHex) ? '#d1d5db' : 'transparent'
              }}
            >
              <span
                className="h-2 w-2 rounded-full border flex-shrink-0"
                style={{
                  backgroundColor: colorHex,
                  borderColor: isLightColor(colorHex) ? '#d1d5db' : 'transparent'
                }}
              />
              <span className="truncate max-w-[45px] sm:max-w-none">{selectedColor}</span>
            </span>
          )}
          {selectedSize && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 leading-none">
              {selectedSize}
            </span>
          )}
          {/* Status Badge inline on mobile */}
          {item.isOwned ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-500 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-white leading-none">
              <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Owned
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-white leading-none">
              <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Wishlist
            </span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div
      id={item.closetItemId ? `closet-item-${item.closetItemId}` : undefined}
      ref={setNodeRef}
      style={style}
      className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {/* Drag Handle - visible on all devices */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1 sm:left-2 sm:top-2 z-10 cursor-grab rounded bg-white/80 p-1.5 sm:p-1.5 shadow-sm transition-opacity opacity-70 sm:opacity-0 sm:group-hover:opacity-100 dark:bg-zinc-800/80 active:cursor-grabbing touch-none"
      >
        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Card content - Click to view details */}
      <div
        className="cursor-pointer"
        onClick={() => onViewDetails(item)}
      >
        {cardContent}
      </div>

      {/* Action Button - Edit only, visible on mobile, hover on desktop */}
      <div className="absolute right-1 top-1 sm:right-2 sm:top-2 opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100">
        <button
          onClick={(e) => { e.preventDefault(); onEdit(item); }}
          className="rounded-full bg-white/90 p-1.5 sm:p-2 text-zinc-600 shadow-sm hover:bg-white hover:text-moi-400 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-moi-400"
          title="Edit"
        >
          <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
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
  onViewDetails,
  activeId,
  isOver,
}: {
  category: string;
  items: CombinedItem[];
  onEdit: (item: CombinedItem) => void;
  onRemove: (item: CombinedItem) => void;
  onViewDetails: (item: CombinedItem) => void;
  activeId: string | null;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: `category-${category}` });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed p-1.5 sm:p-2 transition-colors ${
        isOver
          ? "border-red-400 bg-red-50 dark:bg-red-900/20"
          : "border-transparent"
      }`}
    >
      <h3 className="mb-1.5 sm:mb-2 text-sm sm:text-lg font-semibold capitalize text-zinc-900 dark:text-white">
        {category} ({items.length})
      </h3>
      {items.length > 0 ? (
        <SortableContext items={items.map(i => i.productId)} strategy={rectSortingStrategy}>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1.5 px-1.5 sm:-mx-2 sm:px-2 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
            {items.map((item) => (
              <div key={item.productId} className="flex-shrink-0 w-36 sm:w-44">
                <SortableItem
                  item={item}
                  onEdit={onEdit}
                  onRemove={onRemove}
                  onViewDetails={onViewDetails}
                  isDragging={activeId === item.productId}
                />
              </div>
            ))}
          </div>
        </SortableContext>
      ) : (
        <div className="flex h-16 sm:h-20 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs sm:text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No items
        </div>
      )}
    </div>
  );
}

// Droppable list category section
function ListCategorySection({
  category,
  items,
  onEdit,
  onRemove,
  onViewDetails,
  activeId,
  isOver,
}: {
  category: string;
  items: CombinedItem[];
  onEdit: (item: CombinedItem) => void;
  onRemove: (item: CombinedItem) => void;
  onViewDetails: (item: CombinedItem) => void;
  activeId: string | null;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: `category-${category}` });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed p-1.5 sm:p-2 transition-colors ${
        isOver
          ? "border-red-400 bg-red-50 dark:bg-red-900/20"
          : "border-transparent"
      }`}
    >
      <h3 className="mb-1.5 text-sm sm:text-lg font-semibold capitalize text-zinc-900 dark:text-white">
        {category} ({items.length})
      </h3>
      <SortableContext items={items.map(i => i.productId)} strategy={rectSortingStrategy}>
        <div className="space-y-1.5">
          {items.map((item) => (
            <SortableListItem
              key={item.productId}
              item={item}
              onEdit={onEdit}
              onRemove={onRemove}
              onViewDetails={onViewDetails}
              isDragging={activeId === item.productId}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// Drag overlay item (shown while dragging)
function DragOverlayItem({ item }: { item: CombinedItem }) {
  const product = item.product;

  return (
    <div className="w-48 overflow-hidden rounded-xl border border-red-400 bg-white shadow-xl dark:bg-zinc-900">
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

const CLOSET_STATE_KEY = "armoi_closet_state";

export default function ClosetPage() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [wishlistToast, setWishlistToast] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [editOptions, setEditOptions] = useState<Record<string, string>>({});
  const [editCategory, setEditCategory] = useState<string>("");
  const [editSize, setEditSize] = useState<string>("");
  const [editGender, setEditGender] = useState<"men" | "women" | "unisex" | null>(null);
  const [editMaterial, setEditMaterial] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editBrand, setEditBrand] = useState<string>("");
  const [editColor, setEditColor] = useState<string>("");
  const [editIsOwned, setEditIsOwned] = useState<boolean>(false);
  const [editIsWishlist, setEditIsWishlist] = useState<boolean>(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overCategory, setOverCategory] = useState<string | null>(null);
  const [showAddClothesModal, setShowAddClothesModal] = useState(false);
  const [showTryOnModal, setShowTryOnModal] = useState(false);
  const [tryOnInitialItem, setTryOnInitialItem] = useState<{ id: string; category: string } | undefined>(undefined);
  const [showSavedOutfitsModal, setShowSavedOutfitsModal] = useState(false);
  const [showFindFriendsModal, setShowFindFriendsModal] = useState(false);
  const [outfitCollectionFilter, setOutfitCollectionFilter] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<typeof savedOutfits extends (infer T)[] | undefined ? T | null : never>(null);
  const [isEditingOutfit, setIsEditingOutfit] = useState(false);
  const [editOutfitName, setEditOutfitName] = useState("");
  const [editOutfitCollectionId, setEditOutfitCollectionId] = useState<Id<"collections"> | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [closetShareCopied, setClosetShareCopied] = useState(false);
  const [detailsItem, setDetailsItem] = useState<CombinedItem | null>(null);
  const [editImageItem, setEditImageItem] = useState<{ itemId: string; imageUrl?: string } | null>(null);
  const [newlyAddedItemId, setNewlyAddedItemId] = useState<string | null>(null);
  const pendingScrollPosition = useRef<number | null>(null);
  const hasRestoredScroll = useRef(false);

  // Restore scroll position on mount
  useEffect(() => {
    if (hasRestoredScroll.current) return;

    try {
      const saved = sessionStorage.getItem(CLOSET_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.scrollPosition === "number" && parsed.scrollPosition > 0) {
          pendingScrollPosition.current = parsed.scrollPosition;
          // Wait for content to render
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (pendingScrollPosition.current !== null) {
                window.scrollTo(0, pendingScrollPosition.current);
                pendingScrollPosition.current = null;
              }
            });
          });
        }
        // Restore filters if saved
        if (parsed.typeFilter) setTypeFilter(parsed.typeFilter);
        if (parsed.selectedCategory !== undefined) setSelectedCategory(parsed.selectedCategory);
        if (parsed.viewMode) setViewMode(parsed.viewMode);
      }
    } catch (e) {
      // Ignore errors
    }
    hasRestoredScroll.current = true;
  }, []);

  // Save scroll position on scroll (debounced)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        try {
          const stateToSave = {
            scrollPosition: window.scrollY,
            typeFilter,
            selectedCategory,
            viewMode,
          };
          sessionStorage.setItem(CLOSET_STATE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
          // Ignore errors
        }
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [typeFilter, selectedCategory, viewMode]);

  // Also save state when filters change
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(CLOSET_STATE_KEY);
      const existing = saved ? JSON.parse(saved) : {};
      const stateToSave = {
        ...existing,
        typeFilter,
        selectedCategory,
        viewMode,
      };
      sessionStorage.setItem(CLOSET_STATE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      // Ignore errors
    }
  }, [typeFilter, selectedCategory, viewMode]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
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

  const savedOutfits = useQuery(
    api.storage.getSavedOutfits,
    user?.id ? { clerkId: user.id, limit: 20 } : "skip"
  );
  const deleteOutfitImage = useMutation(api.storage.deleteOutfitImage);
  const updateOutfitImage = useMutation(api.storage.updateOutfitImage);
  const createCollection = useMutation(api.collections.createCollectionByClerkId);
  const collections = useQuery(
    api.collections.getCollectionsByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Price tracking
  const trackedItemIds = useQuery(
    api.tracking.getTrackedItemIdsByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const trackProduct = useMutation(api.tracking.trackProductByClerkId);
  const untrackProduct = useMutation(api.tracking.untrackProductByClerkId);

  // Price tracking modal state
  const [showPriceTrackingModal, setShowPriceTrackingModal] = useState(false);
  const [priceTrackingProductId, setPriceTrackingProductId] = useState<Id<"products"> | null>(null);
  const [priceTrackingCurrentPrice, setPriceTrackingCurrentPrice] = useState<number>(0);
  const [targetPrice, setTargetPrice] = useState<string>("");

  const removeFromCloset = useMutation(api.closet.removeFromCloset);
  const removeFavorite = useMutation(api.favorites.removeFavorite);
  const addToCloset = useMutation(api.closet.addToCloset);
  const addFavorite = useMutation(api.favorites.addFavorite);
  const updateClosetItemOptions = useMutation(api.closet.updateClosetItemOptions);
  const updateClosetItem = useMutation(api.closet.updateClosetItem);
  const updateFavoriteOptions = useMutation(api.favorites.updateFavoriteOptions);
  const updateClosetItemCategory = useMutation(api.closet.updateClosetItemCategory);
  const updateClosetItemsOrder = useMutation(api.closet.updateClosetItemsOrder);
  const updateFavoritesOrder = useMutation(api.favorites.updateFavoritesOrder);

  // Handle addToWishlist URL parameter (from shared outfit page)
  useEffect(() => {
    const addToWishlistId = searchParams.get("addToWishlist");
    if (addToWishlistId && user?.id) {
      // Add the product to wishlist
      addFavorite({
        clerkId: user.id,
        productId: addToWishlistId as Id<"products">,
      })
        .then(() => {
          setWishlistToast("Item added to your wishlist!");
          // Clear the URL parameter
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("addToWishlist");
          router.replace(newUrl.pathname + newUrl.search);
          // Auto-hide toast after 3 seconds
          setTimeout(() => setWishlistToast(null), 3000);
        })
        .catch((error) => {
          console.error("Failed to add to wishlist:", error);
          setWishlistToast("Failed to add item to wishlist");
          setTimeout(() => setWishlistToast(null), 3000);
        });
    }
  }, [searchParams, user?.id, addFavorite, router]);

  // Combine closet items and favorites into a unified list
  const combinedItems = useMemo((): CombinedItem[] => {
    if (!closetItems && !favorites) return [];

    const itemMap = new Map<string, CombinedItem>();

    // Add closet items (owned) - includes product-linked, URL-sourced, and generated items
    for (const item of closetItems || []) {
      // Handle product-linked items
      if (item.product) {
        // Build selectedOptions from various sources
        const typedItem = item as any;
        let selectedOptions = item.selectedOptions || {};

        // Add selectedSize if available and not already in options
        if (typedItem.selectedSize && !selectedOptions["Size"]) {
          selectedOptions = { ...selectedOptions, Size: typedItem.selectedSize };
        }
        // Add colorName if available and not already in options
        if (typedItem.colorName && !selectedOptions["Color"] && !selectedOptions["Colour"]) {
          selectedOptions = { ...selectedOptions, Color: typedItem.colorName };
        }

        itemMap.set(item.product._id, {
          productId: item.product._id,
          closetItemId: typedItem._id, // Store closet_item._id for TryOnModal
          product: item.product as CombinedItem["product"],
          selectedOptions: Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined,
          customCategory: typedItem.customCategory,
          sortOrder: typedItem.sortOrder,
          isOwned: !typedItem.isWishlist,
          isWishlist: typedItem.isWishlist === true,
          addedAt: item.addedAt,
        });
      }
      // Handle URL-sourced and generated items (no product reference)
      else if ((item as any).source === "url" || (item as any).source === "generated") {
        const typedItem = item as any;
        const itemId = typedItem._id as string;
        // For generated items, displayImageUrl is resolved from storage
        const imageUrl = typedItem.displayImageUrl || typedItem.imageUrl;
        // Check if this is a wishlist item (generated items can be wishlist)
        const isWishlistItem = typedItem.isWishlist === true;
        // URL-sourced items have a sourceUrl we can link to
        const isUrlSourced = typedItem.source === "url";
        itemMap.set(itemId, {
          productId: itemId as any, // Use item ID as pseudo-productId
          closetItemId: itemId, // Store closet_item._id for TryOnModal
          product: {
            _id: itemId as any,
            name: typedItem.name || "Unknown Item",
            brand: typedItem.brand || "Unknown",
            price: 0,
            imageUrl: imageUrl,
            category: typedItem.customCategory || typedItem.category || "other",
            colorName: typedItem.color,
            gender: typedItem.gender, // Include gender for user-added items
            material: typedItem.material, // Include material for user-added items
          },
          selectedOptions: typedItem.size ? { Size: typedItem.size } : undefined,
          customCategory: typedItem.customCategory || typedItem.category,
          sortOrder: typedItem.sortOrder,
          isOwned: !isWishlistItem, // Owned if not wishlist
          isWishlist: isWishlistItem,
          addedAt: typedItem.addedAt,
          isUserAdded: !isUrlSourced, // Only generated items are truly "user-added" (no link)
          sourceUrl: isUrlSourced ? typedItem.sourceUrl : undefined, // Store original URL for URL-sourced items
        });
      }
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
        // Wishlist-only item (not in closet)
        const typedFav = fav as any;
        itemMap.set(fav.product._id, {
          productId: fav.product._id,
          closetItemId: typedFav._id, // Store favorites._id for TryOnModal
          product: fav.product as CombinedItem["product"],
          selectedOptions: fav.selectedOptions,
          customCategory: typedFav.customCategory,
          sortOrder: typedFav.sortOrder, // Include sortOrder from favorites
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

  // Scroll to newly added item
  useEffect(() => {
    if (newlyAddedItemId && combinedItems.length > 0) {
      // Find the element with the newly added item ID
      const element = document.getElementById(`closet-item-${newlyAddedItemId}`);
      if (element) {
        // Scroll to the element with a small delay to allow rendering
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // Add a highlight animation
          element.classList.add("ring-2", "ring-moi-400", "ring-offset-2");
          // Remove highlight after animation
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-moi-400", "ring-offset-2");
            setNewlyAddedItemId(null);
          }, 2000);
        }, 300);
      }
    }
  }, [newlyAddedItemId, combinedItems]);

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

  // Filter by type and search query
  const filteredByType = useMemo(() => {
    let items = combinedItems;
    if (typeFilter === "owned") {
      items = items.filter(i => i.isOwned);
    } else if (typeFilter === "wishlist") {
      items = items.filter(i => i.isWishlist && !i.isOwned);
    }
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      items = items.filter(i => {
        const product = i.product;
        if (!product) return false;
        const searchableText = [
          product.name,
          product.brand,
          product.colorName,
          i.selectedOptions?.["Color"],
          i.selectedOptions?.["Size"],
          i.customCategory || product.category,
        ].filter(Boolean).join(" ").toLowerCase();
        return searchableText.includes(query);
      });
    }
    return items;
  }, [combinedItems, typeFilter, searchQuery]);

  // Group items by normalized category key and sort: owned first, then wishlist-only, each sorted by sortOrder
  const itemsByCategory = useMemo(() => {
    const groups: Record<string, CombinedItem[]> = {};
    for (const item of filteredByType) {
      const rawCat = item.customCategory || item.product?.category || "other";
      const productName = item.name || item.product?.name;
      const normalizedCat = getCategoryKey(rawCat, productName);
      if (!groups[normalizedCat]) groups[normalizedCat] = [];
      groups[normalizedCat].push(item);
    }
    // Sort items within each category: owned first, then wishlist-only, each group sorted by sortOrder
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => {
        // First sort by ownership: owned items before wishlist-only items
        if (a.isOwned !== b.isOwned) {
          return a.isOwned ? -1 : 1;
        }
        // Within same ownership group, sort by sortOrder
        if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
          return a.sortOrder - b.sortOrder;
        }
        if (a.sortOrder !== undefined) return -1;
        if (b.sortOrder !== undefined) return 1;
        return b.addedAt - a.addedAt;
      });
    }
    return groups;
  }, [filteredByType]);

  // Get count for each category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CLOSET_CATEGORIES) {
      counts[cat.id] = itemsByCategory[cat.id]?.length || 0;
    }
    return counts;
  }, [itemsByCategory]);

  // Get filtered items (when a specific category is selected)
  const filteredItems = useMemo(() => {
    if (!selectedCategory) return filteredByType;
    return itemsByCategory[selectedCategory] || [];
  }, [filteredByType, selectedCategory, itemsByCategory]);

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

  const handleViewDetails = (item: CombinedItem) => {
    setDetailsItem(item);
  };

  const handleEdit = (item: CombinedItem) => {
    if (!item.product) return;
    const currentColor = item.selectedOptions?.["Color"] || item.selectedOptions?.["Colour"] || item.product.colorName;
    const currentCategory = item.customCategory || item.product.category;
    // Get size from selectedOptions or from product options
    const currentSize = item.selectedOptions?.["Size"] || "";
    // Get gender and material from product (for user-added items they're stored directly)
    const currentGender = item.product.gender;
    const currentMaterial = item.product.material;
    const currentBrand = item.product.brand;
    // Check if this is a user-added item (URL-sourced or generated)
    const isUserAdded = typeof item.productId === "string" &&
      (item.productId.toString().startsWith("url-") || item.productId.toString().startsWith("gen-") ||
       !item.productId.toString().includes("products"));

    setEditingItem({
      productId: item.product._id,
      productName: item.product.name,
      options: item.product.options || [],
      currentOptions: item.selectedOptions || {},
      colorGroupId: item.product.colorGroupId,
      currentColor,
      currentCategory,
      currentSize,
      currentGender,
      currentMaterial,
      currentBrand,
      isOwned: item.isOwned,
      isWishlist: item.isWishlist,
      isUserAdded,
      closetItemId: isUserAdded ? item.productId.toString() : undefined,
    });
    setEditOptions({
      ...item.selectedOptions,
      ...(currentColor ? { Color: currentColor } : {}),
    });
    setEditCategory(currentCategory);
    setEditSize(currentSize);
    setEditGender(currentGender || null);
    setEditMaterial(currentMaterial || "");
    setEditName(item.product.name);
    setEditBrand(currentBrand || "");
    setEditColor(currentColor || "");
    setEditIsOwned(item.isOwned);
    setEditIsWishlist(item.isWishlist);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditOptions({});
    setEditCategory("");
    setEditSize("");
    setEditGender(null);
    setEditMaterial("");
    setEditName("");
    setEditBrand("");
    setEditColor("");
    setEditIsOwned(false);
    setEditIsWishlist(false);
  };

  const handleDeleteFromEdit = async () => {
    if (!user?.id || !editingItem) return;
    const message = editingItem.isOwned
      ? "Remove this item from your closet?"
      : "Remove this item from your wishlist?";
    if (confirm(message)) {
      if (editingItem.isOwned) {
        await removeFromCloset({ clerkId: user.id, productId: editingItem.productId });
      }
      if (editingItem.isWishlist) {
        await removeFavorite({ clerkId: user.id, productId: editingItem.productId });
      }
      closeEditModal();
    }
  };

  const colorVariants = useQuery(
    api.products.getColorVariants,
    editingItem?.colorGroupId ? { colorGroupId: editingItem.colorGroupId } : "skip"
  );

  const handleSaveEdit = async () => {
    if (!user?.id || !editingItem) return;

    const categoryChanged = editCategory !== editingItem.currentCategory;
    const sizeChanged = editSize !== (editingItem.currentSize || "");
    const genderChanged = editGender !== editingItem.currentGender;
    const materialChanged = editMaterial !== (editingItem.currentMaterial || "");
    const nameChanged = editName !== editingItem.productName;
    const brandChanged = editBrand !== (editingItem.currentBrand || "");
    const colorChanged = editColor !== (editingItem.currentColor || "");
    const ownershipChanged = editIsOwned !== editingItem.isOwned || editIsWishlist !== editingItem.isWishlist;

    // Include size in options
    const updatedOptions = {
      ...editOptions,
      ...(editSize ? { Size: editSize } : {}),
    };

    // Handle ownership changes first
    if (ownershipChanged) {
      // If newly owned and wasn't before, add to closet
      if (editIsOwned && !editingItem.isOwned) {
        await addToCloset({
          clerkId: user.id,
          productId: editingItem.productId,
          selectedOptions: updatedOptions,
        });
      }
      // If no longer owned but was before, remove from closet
      if (!editIsOwned && editingItem.isOwned) {
        await removeFromCloset({ clerkId: user.id, productId: editingItem.productId });
      }
      // If newly wishlisted and wasn't before, add to favorites
      if (editIsWishlist && !editingItem.isWishlist) {
        await addFavorite({
          clerkId: user.id,
          productId: editingItem.productId,
          selectedOptions: updatedOptions,
        });
      }
      // If no longer wishlisted but was before, remove from favorites
      if (!editIsWishlist && editingItem.isWishlist) {
        await removeFavorite({ clerkId: user.id, productId: editingItem.productId });
      }
    }

    // Update options/category for items that still exist
    if (editIsOwned) {
      await updateClosetItemOptions({
        clerkId: user.id,
        productId: editingItem.productId,
        selectedOptions: updatedOptions,
        customCategory: categoryChanged ? editCategory : undefined,
      });

      // For user-added items, also update size, gender, material, name, brand, and color directly
      if (editingItem.isUserAdded && editingItem.closetItemId &&
          (sizeChanged || genderChanged || materialChanged || nameChanged || brandChanged || colorChanged)) {
        await updateClosetItem({
          clerkId: user.id,
          itemId: editingItem.closetItemId as any,
          size: sizeChanged ? editSize : undefined,
          gender: genderChanged && editGender ? editGender : undefined,
          material: materialChanged ? editMaterial : undefined,
          name: nameChanged ? editName : undefined,
          brand: brandChanged ? editBrand : undefined,
          color: colorChanged ? editColor : undefined,
        });
      }
    } else if (editIsWishlist) {
      await updateFavoriteOptions({
        clerkId: user.id,
        productId: editingItem.productId,
        selectedOptions: updatedOptions,
        customCategory: categoryChanged ? editCategory : undefined,
      });

      // For user-added wishlist items, also update directly in closet_items
      if (editingItem.isUserAdded && editingItem.closetItemId &&
          (sizeChanged || genderChanged || materialChanged || nameChanged || brandChanged || colorChanged || categoryChanged)) {
        await updateClosetItem({
          clerkId: user.id,
          itemId: editingItem.closetItemId as any,
          size: sizeChanged ? editSize : undefined,
          gender: genderChanged && editGender ? editGender : undefined,
          material: materialChanged ? editMaterial : undefined,
          name: nameChanged ? editName : undefined,
          brand: brandChanged ? editBrand : undefined,
          color: colorChanged ? editColor : undefined,
          category: categoryChanged ? editCategory : undefined,
        });
      }
    }

    closeEditModal();
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
    if (!activeItem) return;

    // Ignore drops on category headers - only allow reordering within same category
    if (typeof over.id === "string" && over.id.startsWith("category-")) {
      return;
    }

    // Check if reordering within same category
    const overItem = combinedItems.find(i => i.productId === over.id);
    if (!overItem) return;

    // Items must be the same type (both owned OR both wishlist-only)
    const activeIsOwned = activeItem.isOwned;
    const overIsOwned = overItem.isOwned;
    if (activeIsOwned !== overIsOwned) return; // Can't mix owned and wishlist-only items

    const activeCategoryRaw = activeItem.customCategory || activeItem.product?.category || "other";
    const overCategoryRaw = overItem.customCategory || overItem.product?.category || "other";
    const activeProductName = activeItem.name || activeItem.product?.name;
    const overProductName = overItem.name || overItem.product?.name;
    const activeCategoryNormalized = getCategoryKey(activeCategoryRaw, activeProductName);
    const overCategoryNormalized = getCategoryKey(overCategoryRaw, overProductName);

    // Only allow reordering within the same category
    if (activeCategoryNormalized === overCategoryNormalized) {
      // Filter items by ownership type (owned vs wishlist-only)
      const categoryItems = (itemsByCategory[activeCategoryNormalized] || []).filter(i => i.isOwned === activeIsOwned);
      const oldIndex = categoryItems.findIndex(i => i.productId === active.id);
      const newIndex = categoryItems.findIndex(i => i.productId === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(categoryItems, oldIndex, newIndex);
        const updates = reordered.map((item, index) => ({
          productId: String(item.productId),
          sortOrder: index,
        }));

        // Use appropriate mutation based on item type
        if (activeIsOwned) {
          await updateClosetItemsOrder({ clerkId: user.id, items: updates });
        } else {
          await updateFavoritesOrder({ clerkId: user.id, items: updates });
        }
      }
    }
    // Cross-category drops are ignored - items stay in their original category
  }, [combinedItems, itemsByCategory, user?.id, updateClosetItemsOrder, updateFavoritesOrder]);

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
              className="mt-6 inline-block rounded-lg bg-red-400 px-6 py-3 font-medium text-white hover:bg-red-500"
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

      {/* Toast notification for wishlist additions */}
      {wishlistToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className={`rounded-lg px-4 py-3 shadow-lg flex items-center gap-2 ${
            wishlistToast.includes("Failed")
              ? "bg-red-100 text-red-700 dark:bg-red-900/90 dark:text-red-200"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/90 dark:text-emerald-200"
          }`}>
            {!wishlistToast.includes("Failed") && (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium">{wishlistToast}</span>
          </div>
        </div>
      )}

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-2 sm:py-4 sm:px-6 lg:px-8">
        {/* Header with compact stats */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
              My Closet
            </h1>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              {stats.total} items · {stats.categoryCount} categories
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowAddClothesModal(true)}
              className="flex items-center gap-1 sm:gap-2 rounded-lg bg-moi-400 px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white transition-colors hover:bg-moi-500"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Items
            </button>
            <button
              onClick={() => setShowTryOnModal(true)}
              className="flex items-center gap-1 sm:gap-2 rounded-lg border border-moi-400 px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-moi-400 transition-colors hover:bg-moi-400/10"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Try On
            </button>
            <button
              onClick={() => setShowSavedOutfitsModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-zinc-300 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Outfits
            </button>
            <button
              onClick={async () => {
                const closetUrl = `${window.location.origin}/closet/${user?.id}`;
                try {
                  if (navigator.share) {
                    await navigator.share({
                      title: "My armoi Closet",
                      text: "Check out my virtual closet!",
                      url: closetUrl,
                    });
                  } else {
                    await navigator.clipboard.writeText(closetUrl);
                    setClosetShareCopied(true);
                    setTimeout(() => setClosetShareCopied(false), 2000);
                  }
                } catch (err) {
                  try {
                    await navigator.clipboard.writeText(closetUrl);
                    setClosetShareCopied(true);
                    setTimeout(() => setClosetShareCopied(false), 2000);
                  } catch {
                    // Ignore
                  }
                }
              }}
              className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-zinc-300 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {closetShareCopied ? "Copied!" : "Share"}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-2 sm:mt-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search your closet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 pl-9 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
            />
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              {filteredByType.length === 0 ? (
                <span>No items match "{searchQuery}"</span>
              ) : (
                <span>Found {filteredByType.length} item{filteredByType.length !== 1 ? 's' : ''} matching "{searchQuery}"</span>
              )}
            </p>
          )}
        </div>

        {/* Type Filter Buttons */}
        <div className="mt-2 sm:mt-3 flex gap-1.5 sm:gap-2">
          <button
            onClick={() => { setTypeFilter("all"); setSelectedCategory(null); }}
            className={`rounded-lg px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${
              typeFilter === "all"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => { setTypeFilter("owned"); setSelectedCategory(null); }}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${
              typeFilter === "owned"
                ? "bg-purple-500 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Owned ({stats.owned})
          </button>
          <button
            onClick={() => { setTypeFilter("wishlist"); setSelectedCategory(null); }}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${
              typeFilter === "wishlist"
                ? "bg-red-500 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Wishlist ({stats.wishlist})
          </button>
        </div>

        {/* Category Filter - Always show all categories with counts */}
        <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm font-medium transition-colors ${
              selectedCategory === null
                ? "bg-moi-400 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            All ({filteredByType.length})
          </button>
          {CLOSET_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "bg-moi-400 text-white"
                  : categoryCounts[cat.id] > 0
                  ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  : "bg-zinc-50 text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-600"
              }`}
            >
              {cat.label} ({categoryCounts[cat.id]})
            </button>
          ))}
        </div>

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
              className="mt-6 inline-block rounded-lg bg-red-400 px-6 py-3 font-medium text-white hover:bg-red-500"
            >
              Browse Products
            </Link>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              {selectedCategory
                ? `You haven't added any ${CLOSET_CATEGORIES.find(c => c.id === selectedCategory)?.label.toLowerCase() || selectedCategory} to your closet`
                : "No items match your current filters"}
            </p>
          </div>
        ) : viewMode === "list" ? (
          /* List View with Drag and Drop */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="mt-2 space-y-1">
              {selectedCategory ? (
                // Single category list
                <SortableContext items={filteredItems.map(i => i.productId)} strategy={rectSortingStrategy}>
                  <div className="space-y-1">
                    {filteredItems.map((item) => (
                      <SortableListItem
                        key={item.productId}
                        item={item}
                        onEdit={handleEdit}
                        onRemove={handleRemove}
                        onViewDetails={handleViewDetails}
                        isDragging={activeId === item.productId}
                      />
                    ))}
                  </div>
                </SortableContext>
              ) : (
                // Category sections list
                CLOSET_CATEGORIES.filter(cat => (itemsByCategory[cat.id]?.length || 0) > 0).map((cat) => (
                  <ListCategorySection
                    key={cat.id}
                    category={cat.label}
                    items={itemsByCategory[cat.id] || []}
                    onEdit={handleEdit}
                    onRemove={handleRemove}
                    onViewDetails={handleViewDetails}
                    activeId={activeId}
                    isOver={overCategory === cat.id}
                  />
                ))
              )}
            </div>

            <DragOverlay>
              {activeItem && <DragOverlayItem item={activeItem} />}
            </DragOverlay>
          </DndContext>
        ) : (
          /* Grid View with Drag and Drop */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="mt-2 space-y-1">
              {selectedCategory ? (
                // Single category view
                <SortableContext items={filteredItems.map(i => i.productId)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredItems.map((item) => (
                      <SortableItem
                        key={item.productId}
                        item={item}
                        onEdit={handleEdit}
                        onRemove={handleRemove}
                        onViewDetails={handleViewDetails}
                        isDragging={activeId === item.productId}
                      />
                    ))}
                  </div>
                </SortableContext>
              ) : (
                // Category sections view
                CLOSET_CATEGORIES.filter(cat => (itemsByCategory[cat.id]?.length || 0) > 0).map((cat) => (
                  <CategorySection
                    key={cat.id}
                    category={cat.label}
                    items={itemsByCategory[cat.id] || []}
                    onEdit={handleEdit}
                    onRemove={handleRemove}
                    onViewDetails={handleViewDetails}
                    activeId={activeId}
                    isOver={overCategory === cat.id}
                  />
                ))
              )}
            </div>

            <DragOverlay>
              {activeItem && <DragOverlayItem item={activeItem} />}
            </DragOverlay>
          </DndContext>
        )}

        {/* Following Section */}
        {user?.id && (
          <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Following
              </h2>
              <button
                onClick={() => setShowFindFriendsModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find Friends
              </button>
            </div>
            <FollowingList
              clerkId={user.id}
              onFindFriends={() => setShowFindFriendsModal(true)}
            />
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-zinc-900 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Edit Item
            </h3>
            {!editingItem.isUserAdded && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                {editingItem.productName}
              </p>
            )}

            <div className="mt-2 space-y-2">
              {/* Name Input (for user-added items only) */}
              {editingItem.isUserAdded && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g., Black cashmere sweater"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                  />
                </div>
              )}

              {/* Brand Input (for user-added items only) */}
              {editingItem.isUserAdded && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    placeholder="e.g., J.Crew"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                  />
                </div>
              )}

              {/* Status Selection - Owned or Wishlist (mutually exclusive) */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Status
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditIsOwned(true); setEditIsWishlist(false); }}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      editIsOwned
                        ? "border-purple-500 bg-purple-500 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Owned
                  </button>
                  <button
                    onClick={() => { setEditIsWishlist(true); setEditIsOwned(false); }}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      editIsWishlist
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Wishlist
                  </button>
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  {CLOSET_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Size Input/Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Size
                </label>
                {/* For product-linked items with Size options, show buttons */}
                {!editingItem.isUserAdded && editingItem.options.find(o => o.name === "Size") ? (
                  <div className="flex flex-wrap gap-2">
                    {editingItem.options.find(o => o.name === "Size")!.values.map((value) => {
                      const isSelected = editOptions["Size"] === value;
                      return (
                        <button
                          key={value}
                          onClick={() => setEditOptions({ ...editOptions, Size: value })}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                            isSelected
                              ? "border-moi-400 bg-moi-400 text-white"
                              : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:border-zinc-500"
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* For user-added items or products without Size option, show text input */
                  <input
                    type="text"
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value)}
                    placeholder="e.g., M, L, 32x30"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                  />
                )}
              </div>

              {/* Gender Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Gender
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditGender("men")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      editGender === "men"
                        ? "border-moi-400 bg-moi-400 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => setEditGender("women")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      editGender === "women"
                        ? "border-moi-400 bg-moi-400 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                    }`}
                  >
                    F
                  </button>
                  <button
                    onClick={() => setEditGender("unisex")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      editGender === "unisex"
                        ? "border-moi-400 bg-moi-400 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                    }`}
                  >
                    M/F
                  </button>
                </div>
              </div>

              {/* Material Input */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Material
                </label>
                <input
                  type="text"
                  value={editMaterial}
                  onChange={(e) => setEditMaterial(e.target.value)}
                  placeholder="e.g., Cotton, Wool, Polyester"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                />
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
                              ? "border-moi-400 ring-2 ring-moi-400"
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

              {/* Color Input (for user-added items, show editable input) */}
              {editingItem.isUserAdded && (!colorVariants || colorVariants.length <= 1) && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Color
                  </label>
                  <input
                    type="text"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    placeholder="e.g., Navy, Black, White"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                  />
                </div>
              )}

              {/* Show current color if no variants available (for non-user-added items) */}
              {!editingItem.isUserAdded && (!colorVariants || colorVariants.length <= 1) && editingItem.currentColor && (
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

              {/* Other options (excluding Size and size-related options which are handled above) */}
              {editingItem.options.filter(o => {
                const name = o.name.toLowerCase();
                // Exclude size-related options
                return name !== "size" &&
                       name !== "waist" &&
                       name !== "length" &&
                       name !== "inseam" &&
                       name !== "waist size" &&
                       name !== "pant size" &&
                       name !== "short length" &&
                       name !== "regular length" &&
                       name !== "long length";
              }).map((option) => (
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
                              ? "border-moi-400 bg-moi-400 text-white"
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

            {/* Edit Image Button (for user-added items only) */}
            {editingItem.isUserAdded && editingItem.closetItemId && (
              <button
                onClick={() => setEditImageItem({
                  itemId: editingItem.closetItemId!,
                  imageUrl: undefined,
                })}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700 hover:border-moi-400 hover:bg-moi-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-moi-400 dark:hover:bg-moi-900/20 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Edit Image
              </button>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleDeleteFromEdit}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                title="Delete item"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={closeEditModal}
                className="flex-1 rounded-lg border border-zinc-300 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editIsOwned && !editIsWishlist}
                className="flex-1 rounded-lg bg-moi-400 py-2 font-medium text-white transition-colors hover:bg-moi-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Clothes Modal */}
      <AddClothesModal
        isOpen={showAddClothesModal}
        onClose={() => setShowAddClothesModal(false)}
        clerkId={user.id}
        onItemAdded={(itemId) => setNewlyAddedItemId(itemId)}
      />

      {/* Try On Modal */}
      <TryOnModal
        isOpen={showTryOnModal}
        onClose={() => { setShowTryOnModal(false); setTryOnInitialItem(undefined); }}
        clerkId={user.id}
        initialItem={tryOnInitialItem}
      />

      {/* Saved Outfits Modal */}
      {showSavedOutfitsModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => { setShowSavedOutfitsModal(false); setSelectedOutfit(null); setIsEditingOutfit(false); }}
        >
          <div
            className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl bg-white p-3 sm:p-4 sm:p-6 dark:bg-zinc-900 max-h-[96vh] sm:max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pb-2 -mt-1">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            </div>
            <div className="flex items-center justify-between mb-4">
              {selectedOutfit ? (
                <button
                  onClick={() => { setSelectedOutfit(null); setIsEditingOutfit(false); }}
                  className="flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              ) : (
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Saved Outfits
                </h3>
              )}
              {/* Outfit name and collection in header */}
              {selectedOutfit && !isEditingOutfit && (
                <div className="flex-1 text-center px-4">
                  <h4 className="text-base font-semibold text-zinc-900 dark:text-white truncate">
                    {(selectedOutfit as any).name || "Untitled Outfit"}
                  </h4>
                  {(selectedOutfit as any).collectionId && collections && (
                    <button
                      onClick={() => {
                        setOutfitCollectionFilter((selectedOutfit as any).collectionId);
                        setSelectedOutfit(null);
                      }}
                      className="text-xs text-moi-500 truncate hover:underline"
                    >
                      {collections.find((c) => c._id === (selectedOutfit as any).collectionId)?.name || ""}
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={() => { setShowSavedOutfitsModal(false); setSelectedOutfit(null); setIsEditingOutfit(false); setOutfitCollectionFilter(null); }}
                className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {selectedOutfit ? (
                /* Detail View */
                <div className="space-y-4">
                  {/* Outfit name - editable when in edit mode */}
                  {isEditingOutfit ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          Outfit Name
                        </label>
                        <input
                          type="text"
                          value={editOutfitName}
                          onChange={(e) => setEditOutfitName(e.target.value)}
                          placeholder="Name your outfit..."
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          Collection
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <button
                            onClick={() => setEditOutfitCollectionId(null)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                              editOutfitCollectionId === null
                                ? "bg-moi-400 text-white"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                            }`}
                          >
                            None
                          </button>
                          {collections?.map((col) => (
                            <button
                              key={col._id}
                              onClick={() => setEditOutfitCollectionId(col._id)}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                editOutfitCollectionId === col._id
                                  ? "bg-moi-400 text-white"
                                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                              }`}
                            >
                              {col.name}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCollectionName}
                            onChange={(e) => setNewCollectionName(e.target.value)}
                            placeholder="Create new collection..."
                            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                          />
                          {newCollectionName.trim() && (
                            <button
                              onClick={async () => {
                                const newId = await createCollection({
                                  clerkId: user.id,
                                  name: newCollectionName.trim(),
                                });
                                setEditOutfitCollectionId(newId);
                                setNewCollectionName("");
                              }}
                              className="rounded-lg bg-moi-400 px-3 py-1.5 text-xs font-medium text-white hover:bg-moi-500"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            setIsEditingOutfit(false);
                            setNewCollectionName("");
                          }}
                          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            await updateOutfitImage({
                              clerkId: user.id,
                              outfitId: selectedOutfit._id,
                              name: editOutfitName || undefined,
                              collectionId: editOutfitCollectionId ?? undefined,
                            });
                            setIsEditingOutfit(false);
                            setNewCollectionName("");
                          }}
                          className="flex-1 rounded-lg bg-moi-400 px-3 py-2 text-sm font-medium text-white hover:bg-moi-500"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Outfit image and items side by side (stacked on mobile) */}
                  {!isEditingOutfit && (
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      {/* Left/Top: Outfit image */}
                      <div className="w-full sm:w-1/2 flex-shrink-0">
                        <div className="aspect-square sm:aspect-[3/4] overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 max-h-[200px] sm:max-h-none mx-auto sm:mx-0 w-fit sm:w-full">
                          {selectedOutfit.url ? (
                            <img
                              src={selectedOutfit.url}
                              alt={(selectedOutfit as any).name || "Saved outfit"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <svg className="h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Right/Bottom: Items list */}
                      <div className="w-full sm:w-1/2 space-y-2 overflow-y-auto max-h-[200px] sm:max-h-[400px]">
                        <h5 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 sticky top-0 bg-white dark:bg-zinc-900 py-1">
                          Items Used ({selectedOutfit.items?.length || 0})
                        </h5>
                        {selectedOutfit.items?.map((item: any) => (
                          <div
                            key={item._id}
                            onClick={() => setDetailsItem({
                              productId: item.productId as Id<"products">,
                              product: {
                                _id: item.productId as Id<"products">,
                                name: item.name || "",
                                brand: item.brand || "",
                                price: item.price || 0,
                                imageUrl: item.imageUrl,
                                category: item.category || "other",
                                material: item.material,
                                gender: item.gender,
                                colorName: item.colorName,
                              },
                              selectedOptions: item.size ? { "Size": item.size } : undefined,
                              isOwned: true,
                              isWishlist: false,
                              addedAt: Date.now(),
                              isUserAdded: !item.productId, // No productId means user-added item
                            })}
                            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-800/50 cursor-pointer hover:border-moi-400 transition-colors"
                          >
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-700">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-zinc-400">
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-zinc-900 dark:text-white">
                                {item.name}
                              </p>
                              {item.brand && (
                                <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                                  {item.brand}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {(!selectedOutfit.items || selectedOutfit.items.length === 0) && (
                          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 py-4">
                            No item information available
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {!isEditingOutfit && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {/* Edit button */}
                      <button
                        onClick={() => {
                          setEditOutfitName((selectedOutfit as any).name || "");
                          setEditOutfitCollectionId((selectedOutfit as any).collectionId || null);
                          setIsEditingOutfit(true);
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      {/* Share button - shares link to outfit page */}
                      {selectedOutfit.url && (
                        <button
                          onClick={async () => {
                            const outfitUrl = `${window.location.origin}/outfit/${selectedOutfit._id}`;
                            try {
                              // Try native share first (mobile)
                              if (navigator.share) {
                                await navigator.share({
                                  title: (selectedOutfit as any).name || "My Outfit",
                                  text: "Check out this outfit I created!",
                                  url: outfitUrl,
                                });
                              } else {
                                // Fall back to clipboard
                                await navigator.clipboard.writeText(outfitUrl);
                                setShareCopied(true);
                                setTimeout(() => setShareCopied(false), 2000);
                              }
                            } catch (err) {
                              // User cancelled or error, try clipboard
                              try {
                                await navigator.clipboard.writeText(outfitUrl);
                                setShareCopied(true);
                                setTimeout(() => setShareCopied(false), 2000);
                              } catch {
                                // Ignore
                              }
                            }
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          {shareCopied ? "Copied!" : "Share"}
                        </button>
                      )}
                      {/* Download button */}
                      {selectedOutfit.url && (
                        <a
                          href={selectedOutfit.url}
                          download={`outfit-${selectedOutfit._id}.png`}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </a>
                      )}
                      {/* Delete button */}
                      <button
                        onClick={async () => {
                          if (confirm("Delete this outfit?")) {
                            await deleteOutfitImage({ clerkId: user.id, outfitId: selectedOutfit._id });
                            setSelectedOutfit(null);
                            setIsEditingOutfit(false);
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}

                </div>
              ) : !savedOutfits || savedOutfits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <svg className="h-16 w-16 text-zinc-300 dark:text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                    No saved outfits yet
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                    Use the virtual try-on to create and save outfits
                  </p>
                  <button
                    onClick={() => { setShowSavedOutfitsModal(false); setShowTryOnModal(true); }}
                    className="mt-4 rounded-lg bg-moi-400 px-4 py-2 text-sm font-medium text-white hover:bg-moi-500"
                  >
                    Try On Clothes
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Collection filter tabs */}
                  {collections && collections.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide">
                      <button
                        onClick={() => setOutfitCollectionFilter(null)}
                        className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          outfitCollectionFilter === null
                            ? "bg-moi-400 text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 active:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        }`}
                      >
                        All
                      </button>
                      {collections.map((col) => (
                        <button
                          key={col._id}
                          onClick={() => setOutfitCollectionFilter(col._id)}
                          className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                            outfitCollectionFilter === col._id
                              ? "bg-moi-400 text-white"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 active:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {col.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Outfits grid */}
                  {savedOutfits.filter((outfit) => outfitCollectionFilter === null || (outfit as any).collectionId === outfitCollectionFilter).length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-zinc-500 dark:text-zinc-400">
                        No outfits have been added to this collection yet
                      </p>
                    </div>
                  ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {savedOutfits
                      .filter((outfit) => outfitCollectionFilter === null || (outfit as any).collectionId === outfitCollectionFilter)
                      .map((outfit) => (
                      <div
                        key={outfit._id}
                        onClick={() => setSelectedOutfit(outfit)}
                        className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 cursor-pointer hover:ring-2 hover:ring-moi-400 active:scale-[0.98] transition-all"
                      >
                        {outfit.url ? (
                          <img
                            src={outfit.url}
                            alt={(outfit as any).name || "Saved outfit"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        {/* Name, collection, and item count overlay */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="truncate text-xs font-medium text-white">
                            {(outfit as any).name || "Untitled"}
                          </p>
                          {(outfit as any).collectionId && collections && (
                            <p className="truncate text-[10px] text-moi-300">
                              {collections.find((c) => c._id === (outfit as any).collectionId)?.name || ""}
                            </p>
                          )}
                          <p className="text-[10px] text-white/70">
                            {outfit.items?.length || 0} items
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Item Details Modal */}
      {detailsItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => setDetailsItem(null)}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-white shadow-xl dark:bg-zinc-900 overflow-hidden max-h-[90vh] sm:max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center py-2 bg-white dark:bg-zinc-900 sticky top-0 z-10">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            </div>

            {/* Image */}
            <div className="relative aspect-square sm:aspect-[4/3] bg-zinc-100 dark:bg-zinc-800">
              {detailsItem.product.imageUrl ? (
                <img
                  src={detailsItem.product.imageUrl}
                  alt={detailsItem.product.name || "Item"}
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
              <div className="absolute left-3 top-3 rounded-full bg-white/90 dark:bg-zinc-900/90 px-2.5 py-1.5 flex items-center gap-1 shadow-sm">
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
                {detailsItem.product.name}
              </h3>

              {/* Brand */}
              {detailsItem.product.brand && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                  {detailsItem.product.brand}
                </p>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                {(detailsItem.customCategory || detailsItem.product.category) && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Category</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{detailsItem.customCategory || detailsItem.product.category}</p>
                  </div>
                )}
                {detailsItem.product.material && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Material</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{detailsItem.product.material}</p>
                  </div>
                )}
                {detailsItem.product.gender && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Gender</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{detailsItem.product.gender}</p>
                  </div>
                )}
                {(detailsItem.selectedOptions?.["Size"]) && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Size</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{detailsItem.selectedOptions["Size"]}</p>
                  </div>
                )}
                {(detailsItem.selectedOptions?.["Color"] || detailsItem.selectedOptions?.["Colour"] || detailsItem.product.colorName) && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Color</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{detailsItem.selectedOptions?.["Color"] || detailsItem.selectedOptions?.["Colour"] || detailsItem.product.colorName}</p>
                  </div>
                )}
              </div>

              {/* Ownership toggle for URL-sourced items */}
              {detailsItem.sourceUrl && detailsItem.closetItemId && (
                <div className="mt-4">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Item Status</p>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!user?.id) return;
                        try {
                          await updateClosetItem({
                            clerkId: user.id,
                            itemId: detailsItem.closetItemId as any,
                            isWishlist: false,
                          });
                          // Update local state to reflect change
                          setDetailsItem({ ...detailsItem, isOwned: true, isWishlist: false });
                        } catch (error) {
                          console.error("Failed to update item:", error);
                        }
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        detailsItem.isOwned
                          ? "bg-emerald-500 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      }`}
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      I Own This
                    </button>
                    <button
                      onClick={async () => {
                        if (!user?.id) return;
                        try {
                          await updateClosetItem({
                            clerkId: user.id,
                            itemId: detailsItem.closetItemId as any,
                            isWishlist: true,
                          });
                          // Update local state to reflect change
                          setDetailsItem({ ...detailsItem, isOwned: false, isWishlist: true });
                        } catch (error) {
                          console.error("Failed to update item:", error);
                        }
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        detailsItem.isWishlist && !detailsItem.isOwned
                          ? "bg-moi-500 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      }`}
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      Wishlist
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons with spacing */}
              <div className="space-y-3 mt-4">
                {/* Try This On button - opens TryOnModal with item pre-selected */}
                {detailsItem.closetItemId && (
                  <button
                    onClick={() => {
                      const category = detailsItem.customCategory || detailsItem.product.category;
                      setTryOnInitialItem({ id: detailsItem.closetItemId!, category });
                      setDetailsItem(null);
                      setShowTryOnModal(true);
                    }}
                    className="flex items-center justify-center gap-2 w-full rounded-lg bg-moi-400 px-4 py-3 text-sm font-medium text-white hover:bg-moi-500 active:bg-moi-600 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Try This On
                  </button>
                )}

                {/* Track Price button - for wishlist items from real products (not URL-sourced) */}
                {detailsItem.isWishlist && !detailsItem.isUserAdded && !detailsItem.sourceUrl && detailsItem.product._id && (() => {
                  const isTracked = trackedItemIds?.includes(detailsItem.product._id);
                  return isTracked ? (
                    <button
                      onClick={async () => {
                        if (!user?.id) return;
                        try {
                          await untrackProduct({
                            clerkId: user.id,
                            productId: detailsItem.product._id,
                          });
                        } catch (error) {
                          console.error("Failed to untrack product:", error);
                        }
                      }}
                      className="flex items-center justify-center gap-2 w-full rounded-lg bg-emerald-100 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-200 active:bg-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Tracking Price
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setPriceTrackingProductId(detailsItem.product._id);
                        setPriceTrackingCurrentPrice(detailsItem.product.price);
                        setTargetPrice("");
                        setShowPriceTrackingModal(true);
                      }}
                      className="flex items-center justify-center gap-2 w-full rounded-lg bg-moi-100 px-4 py-3 text-sm font-medium text-moi-700 hover:bg-moi-200 active:bg-moi-300 dark:bg-moi-900/30 dark:text-moi-400 dark:hover:bg-moi-900/50 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Track Price
                    </button>
                  );
                })()}

                {/* View Original link - for URL-sourced wishlist items */}
                {detailsItem.isWishlist && detailsItem.sourceUrl && (
                  <a
                    href={detailsItem.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-lg bg-moi-100 px-4 py-3 text-sm font-medium text-moi-700 hover:bg-moi-200 active:bg-moi-300 dark:bg-moi-900/30 dark:text-moi-400 dark:hover:bg-moi-900/50 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View on Store
                  </a>
                )}

                {/* Link to product page - only for non-user-added items with valid product ID */}
                {!detailsItem.isUserAdded && detailsItem.product._id && (
                  <a
                    href={`/product/${detailsItem.product._id}?from=closet-popup`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-lg border border-moi-400 px-4 py-3 text-sm font-medium text-moi-400 hover:bg-moi-50 active:bg-moi-100 dark:hover:bg-moi-400/10 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Product Details
                  </a>
                )}

                {/* Edit button - opens edit modal */}
                <button
                  onClick={() => {
                    setDetailsItem(null);
                    handleEdit(detailsItem);
                  }}
                  className="flex items-center justify-center gap-2 w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Price Tracking Modal */}
      {showPriceTrackingModal && priceTrackingProductId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowPriceTrackingModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl dark:bg-zinc-900 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Track Price
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Get notified when the price drops below your target
              </p>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Current Price */}
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Current Price</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  ${priceTrackingCurrentPrice.toFixed(2)}
                </p>
              </div>

              {/* Target Price Input */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Alert me when price drops to
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder={`e.g., ${(priceTrackingCurrentPrice * 0.8).toFixed(2)}`}
                    className="w-full rounded-lg border border-zinc-300 bg-white pl-7 pr-3 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                  />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Leave empty to get notified of any price drop
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-700 flex gap-2">
              <button
                onClick={() => setShowPriceTrackingModal(false)}
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!user?.id || !priceTrackingProductId) return;
                  try {
                    await trackProduct({
                      clerkId: user.id,
                      productId: priceTrackingProductId,
                      targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
                      selectedOptions: detailsItem?.selectedOptions,
                    });
                    setShowPriceTrackingModal(false);
                  } catch (error) {
                    console.error("Failed to track product:", error);
                  }
                }}
                className="flex-1 rounded-lg bg-moi-400 px-4 py-2.5 text-sm font-medium text-white hover:bg-moi-500 active:bg-moi-600 transition-colors"
              >
                Start Tracking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Find Friends Modal */}
      {user?.id && (
        <FindFriendsModal
          isOpen={showFindFriendsModal}
          onClose={() => setShowFindFriendsModal(false)}
          clerkId={user.id}
        />
      )}

      {/* Edit Image Modal */}
      {user?.id && editImageItem && (
        <EditImageModal
          isOpen={!!editImageItem}
          onClose={() => setEditImageItem(null)}
          clerkId={user.id}
          itemId={editImageItem.itemId}
          currentImageUrl={editImageItem.imageUrl}
          onImageUpdated={() => {
            setEditImageItem(null);
            // Close the edit modal after image update
            if (editingItem?.closetItemId === editImageItem.itemId) {
              closeEditModal();
            }
            // Also close details item if it's still open
            if (detailsItem?.closetItemId === editImageItem.itemId) {
              setDetailsItem(null);
            }
          }}
        />
      )}
    </div>
  );
}
