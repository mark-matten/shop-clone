"use client";

import { LazyImage } from "@/components/ui/LazyImage";

interface ClosetItem {
  _id: string;
  displayName: string;
  displayBrand?: string;
  displayCategory: string;
  displayImageUrl?: string | null;
  isOwned: boolean;
  isWishlist: boolean;
}

interface ClosetItemCardProps {
  item: ClosetItem;
  isSelected: boolean;
  isOtherSelectedInCategory: boolean;
  onSelect: () => void;
  onShowDetails: () => void;
  variant?: "mobile" | "desktop";
}

export function ClosetItemCard({
  item,
  isSelected,
  isOtherSelectedInCategory,
  onSelect,
  onShowDetails,
  variant = "mobile",
}: ClosetItemCardProps) {
  const isMobile = variant === "mobile";

  return (
    <button
      onClick={onSelect}
      className={`relative overflow-hidden rounded-xl border-2 transition-all w-full h-full ${
        isSelected
          ? "border-moi-400 ring-2 ring-moi-400/30"
          : isOtherSelectedInCategory
          ? "border-transparent opacity-40"
          : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-600"
      }`}
    >
      <div className="aspect-square">
        <LazyImage
          src={item.displayImageUrl}
          alt={item.displayName || "Closet item"}
          className="h-full w-full object-cover"
          fallbackIcon={
            <svg className={`${isMobile ? "h-6 w-6" : "h-8 w-8"} text-zinc-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Product Name - Mobile only */}
      {isMobile && (
        <div className="bg-white/90 dark:bg-zinc-900/90 px-1.5 py-1">
          <p className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
            {item.displayName || "Unnamed"}
          </p>
        </div>
      )}

      {/* Desktop hover overlay */}
      {!isMobile && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <p className="truncate text-xs font-medium text-white">{item.displayName}</p>
          {item.displayBrand && <p className="truncate text-xs text-white/70">{item.displayBrand}</p>}
        </div>
      )}

      {/* Owned/Wishlist Icon */}
      <div className={`absolute left-1 top-1 rounded-full bg-white/90 ${isMobile ? "p-0.5" : "p-1"} shadow-sm dark:bg-zinc-900/90`}>
        {item.isOwned ? (
          <svg className={`${isMobile ? "h-3 w-3" : "h-3.5 w-3.5"} text-emerald-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : item.isWishlist ? (
          <svg className={`${isMobile ? "h-3 w-3" : "h-3.5 w-3.5"} text-moi-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        ) : null}
      </div>

      {/* Selection Indicator or Info Button */}
      {isSelected ? (
        <div className={`absolute right-1 top-1 rounded-full bg-moi-400 ${isMobile ? "p-0.5" : "p-1"}`}>
          <svg className={`${isMobile ? "h-3 w-3" : "h-4 w-4"} text-white`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      ) : (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onShowDetails();
          }}
          className={`absolute ${isMobile ? "right-0.5 top-0.5 p-1.5" : "right-1 top-1 p-1.5"} rounded-full bg-white/90 dark:bg-zinc-900/90 shadow-sm cursor-pointer ${isMobile ? "" : "opacity-0 group-hover:opacity-100 transition-opacity"} hover:bg-white dark:hover:bg-zinc-800`}
          aria-label="View item details"
        >
          <svg className="h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}
    </button>
  );
}
