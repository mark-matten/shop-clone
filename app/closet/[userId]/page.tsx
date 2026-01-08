"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function PublicClosetPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
                className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
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
    </div>
  );
}
