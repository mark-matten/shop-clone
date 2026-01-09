"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

interface DetailsItem {
  name: string;
  brand?: string;
  imageUrl?: string;
  category?: string;
  material?: string;
  gender?: string;
  colorName?: string;
  size?: string;
  productId?: string;
}

export default function PublicClosetPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.userId as string;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [detailsItem, setDetailsItem] = useState<DetailsItem | null>(null);

  // Check if we came from an outfit page
  const fromOutfitId = searchParams.get("fromOutfit");
  const fromOutfitName = searchParams.get("outfitName");

  const closetData = useQuery(
    api.closet.getPublicCloset,
    userId ? { clerkId: userId } : "skip"
  );

  if (closetData === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (closetData === null) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
          Closet Not Found
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          This closet doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-rose-400 px-6 py-3 font-medium text-white hover:bg-rose-500 transition-colors"
        >
          Go to armoi
        </Link>
      </div>
    );
  }

  if (closetData.isPrivate) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
          Private Closet
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-center max-w-md">
          This user&apos;s closet is private. They can make it public in their settings to share.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-rose-400 px-6 py-3 font-medium text-white hover:bg-rose-500 transition-colors"
        >
          Create your own closet
        </Link>
      </div>
    );
  }

  const { items, byCategory, orderedCategories, totalItems, user } = closetData;

  // Build user display name: "First Name L." format
  const userName = user.firstName
    ? user.lastName
      ? `${user.firstName} ${user.lastName.charAt(0).toUpperCase()}.`
      : user.firstName
    : null;

  const displayItems = selectedCategory
    ? byCategory[selectedCategory] || []
    : items;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-[family-name:var(--font-pacifico)] text-2xl">
              <span style={{ color: '#C2311D' }}>ar</span>
              <span style={{ color: '#942010' }}>moi</span>
            </Link>
            <Link
              href="/sign-in"
              className="rounded-lg bg-rose-400 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 transition-colors"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Back to outfit link */}
        {fromOutfitId && (
          <Link
            href={`/outfit/${fromOutfitId}`}
            className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white mb-6"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {fromOutfitName || "outfit"}
          </Link>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
            {userName ? `${userName}'s Virtual Closet` : "Virtual Closet"}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {totalItems} item{totalItems !== 1 ? "s" : ""} in this closet
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === null
                ? "bg-rose-400 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            All ({totalItems})
          </button>
          {(orderedCategories || []).map((cat: { id: string; label: string; count: number }) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "bg-rose-400 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* Items Grid */}
        {displayItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 dark:text-zinc-400">
              No items in this category
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayItems.map((item: any) => (
              <div
                key={item._id}
                onClick={() => setDetailsItem({
                  name: item.name,
                  brand: item.brand,
                  imageUrl: item.imageUrl,
                  category: item.category || item.categoryLabel,
                  material: item.material,
                  gender: item.gender,
                  colorName: item.colorName,
                  size: item.size,
                  productId: item.productId?.toString(),
                })}
                className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-800">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  {item.brand && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {item.brand}
                    </p>
                  )}
                  <p className="text-xs text-rose-400 mt-1">
                    {item.categoryLabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sign Up CTA */}
        <div className="mt-16 bg-gradient-to-r from-rose-400 to-rose-500 rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-semibold text-white mb-2">
            Create Your Own Closet
          </h2>
          <p className="text-rose-100 mb-6 max-w-md mx-auto">
            Track your wardrobe, try on outfits virtually, and share your style with friends
          </p>
          <Link
            href="/sign-in"
            className="inline-block rounded-lg bg-white px-8 py-3 font-medium text-rose-500 hover:bg-rose-50 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-16 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <Link href="/" className="font-[family-name:var(--font-pacifico)] text-xl">
            <span style={{ color: '#C2311D' }}>ar</span>
            <span style={{ color: '#942010' }}>moi</span>
          </Link>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Your virtual closet for tracking and trying on clothes
          </p>
        </div>
      </footer>

      {/* Item Details Modal */}
      {detailsItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetailsItem(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl dark:bg-zinc-900 overflow-hidden max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-800">
              {detailsItem.imageUrl ? (
                <img
                  src={detailsItem.imageUrl}
                  alt={detailsItem.name || "Item"}
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
                className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
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
                {detailsItem.name}
              </h3>

              {/* Brand */}
              {detailsItem.brand && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                  {detailsItem.brand}
                </p>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {detailsItem.category && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Category</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{detailsItem.category}</p>
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
                {detailsItem.colorName && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Color</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{detailsItem.colorName}</p>
                  </div>
                )}
                {detailsItem.size && (
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Size</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{detailsItem.size}</p>
                  </div>
                )}
              </div>

              {/* Product details link */}
              {detailsItem.productId && (
                <a
                  href={`/product/${detailsItem.productId}?from=closet-popup`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-rose-400 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-500 transition-colors"
                >
                  View Product Details
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
