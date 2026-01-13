"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import Image from "next/image";
import { LazyImage } from "@/components/ui/LazyImage";

interface DetailsItem {
  product: {
    name: string;
    brand?: string;
    imageUrl?: string;
    category?: string;
    material?: string;
    gender?: string;
    colorName?: string;
    size?: string;
  };
  isOwned: boolean;
  isWishlist: boolean;
  source?: string;
  linkedProductId?: string;
}

export default function PublicOutfitPage() {
  const params = useParams();
  const outfitId = params.id as string;
  const [detailsItem, setDetailsItem] = useState<DetailsItem | null>(null);

  const outfitData = useQuery(
    api.storage.getPublicOutfit,
    outfitId ? { outfitId: outfitId as Id<"outfit_images"> } : "skip"
  );

  if (outfitData === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (outfitData === null) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
          Outfit Not Found
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          This outfit doesn&apos;t exist or has been deleted.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-moi-400 px-6 py-3 font-medium text-white hover:bg-moi-500 transition-colors"
        >
          Go to armoi
        </Link>
      </div>
    );
  }

  if (outfitData.isPrivate) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
          Private Closet
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-center max-w-md">
          This user&apos;s closet is private. They need to make it public in their settings to share outfits.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-moi-400 px-6 py-3 font-medium text-white hover:bg-moi-500 transition-colors"
        >
          Create your own closet
        </Link>
      </div>
    );
  }

  const { outfit, user } = outfitData;
  const userName = user.displayName || "User";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-[family-name:var(--font-pacifico)] text-2xl">
              <span style={{ color: '#942010' }}>ar</span>
              <span style={{ color: '#C2311D' }}>moi</span>
            </Link>
            <Link
              href="/sign-in"
              className="rounded-lg bg-moi-400 px-4 py-2 text-sm font-medium text-white hover:bg-moi-500 transition-colors"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Title and Attribution */}
        <div className="mb-3 sm:mb-4">
          <h1 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-white">
            {outfit.name || "Outfit"}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            shared from{" "}
            <Link
              href={`/closet/${user.clerkId}?fromOutfit=${outfitId}&outfitName=${encodeURIComponent(outfit.name || "Outfit")}`}
              className="text-moi-500 hover:underline"
            >
              {userName}&apos;s closet
            </Link>
          </p>
        </div>

        {/* Main Content: Image Left, Items Right */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Left: Outfit Image */}
            <div className="md:w-1/2 flex-shrink-0">
              <div className="relative aspect-[3/4] bg-zinc-100 dark:bg-zinc-800">
                {outfit.url ? (
                  <Image
                    src={outfit.url}
                    alt={outfit.name || "Outfit"}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-400">
                    Image not available
                  </div>
                )}
              </div>
            </div>

            {/* Right: Items List */}
            <div className="md:w-1/2 p-3 sm:p-4 md:p-6 overflow-y-auto max-h-[50vh] md:max-h-[600px]">
              <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-3 sm:mb-4 sticky top-0 bg-white dark:bg-zinc-900 py-1 -mt-1">
                Items in this outfit ({outfit.items?.length || 0})
              </h2>

              {outfit.items && outfit.items.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {outfit.items.map((item: any) => (
                    <div
                      key={item._id}
                      onClick={() => setDetailsItem({
                        product: {
                          name: item.name,
                          brand: item.brand,
                          imageUrl: item.imageUrl,
                          category: item.category,
                          material: item.material,
                          gender: item.gender,
                          colorName: item.colorName,
                          size: item.size,
                        },
                        isOwned: true,
                        isWishlist: false,
                        source: item.productId ? "product" : "generated",
                        linkedProductId: item.productId,
                      })}
                      className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 sm:p-3 dark:border-zinc-700 dark:bg-zinc-800 cursor-pointer hover:border-moi-400 active:bg-zinc-100 dark:active:bg-zinc-700 transition-colors"
                    >
                      <div className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-700">
                        <LazyImage
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          fallbackIcon={
                            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          }
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-base font-medium text-zinc-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        {item.brand && (
                          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 truncate">
                            {item.brand}
                          </p>
                        )}
                        {item.price && (
                          <p className="text-xs sm:text-sm font-semibold text-moi-500 mt-0.5">
                            ${item.price.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <svg className="h-5 w-5 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 dark:text-zinc-400">
                  No item information available
                </p>
              )}
            </div>
          </div>
        </div>

        {/* View Full Closet CTA */}
        <div className="mt-4 sm:mt-6 bg-gradient-to-r from-moi-400 to-moi-500 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-center">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2">
            Like this style?
          </h2>
          <p className="text-moi-100 text-sm sm:text-base mb-3 sm:mb-4">
            View more outfits and items from this closet
          </p>
          <Link
            href={`/closet/${user.clerkId}?fromOutfit=${outfitId}&outfitName=${encodeURIComponent(outfit.name || "Outfit")}`}
            className="inline-block rounded-lg bg-white px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-moi-500 hover:bg-moi-50 active:bg-moi-100 transition-colors"
          >
            View {userName}&apos;s Full Closet
          </Link>
        </div>

        {/* Sign Up CTA */}
        <div className="mt-4 sm:mt-6 text-center">
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mb-3 sm:mb-4">
            Create your own virtual closet and try on outfits
          </p>
          <Link
            href="/sign-in"
            className="inline-block rounded-lg border-2 border-moi-400 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-moi-500 hover:bg-moi-50 active:bg-moi-100 dark:hover:bg-rose-950/20 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-12 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <Link href="/" className="font-[family-name:var(--font-pacifico)] text-xl">
            <span style={{ color: '#942010' }}>ar</span>
            <span style={{ color: '#C2311D' }}>moi</span>
          </Link>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Your virtual closet for tracking and trying on clothes
          </p>
        </div>
      </footer>

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
            </div>

            {/* Details */}
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
                {detailsItem.product.category && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Category</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{detailsItem.product.category}</p>
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
                {detailsItem.product.colorName && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Color</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{detailsItem.product.colorName}</p>
                  </div>
                )}
                {detailsItem.product.size && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Size</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{detailsItem.product.size}</p>
                  </div>
                )}
              </div>

              {/* Product details link */}
              {detailsItem.source !== "generated" && detailsItem.linkedProductId && (
                <div className="space-y-2">
                  <a
                    href={`/product/${detailsItem.linkedProductId}?from=outfit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-lg bg-moi-400 px-4 py-3 text-sm font-medium text-white hover:bg-moi-500 active:bg-moi-600 transition-colors"
                  >
                    View Product Details
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  {/* Add to Wishlist - redirects to sign in with product ID */}
                  <Link
                    href={`/sign-in?addToWishlist=${detailsItem.linkedProductId}`}
                    className="flex items-center justify-center gap-2 w-full rounded-lg border border-moi-400 px-4 py-3 text-sm font-medium text-moi-400 hover:bg-moi-50 active:bg-moi-100 dark:hover:bg-rose-950/20 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Add to Wishlist
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
