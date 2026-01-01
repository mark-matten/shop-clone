"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/layout";

export default function ClosetPage() {
  const { user, isLoaded } = useUser();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const closetItems = useQuery(
    api.closet.getClosetItems,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const closetStats = useQuery(
    api.closet.getClosetStats,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const removeFromCloset = useMutation(api.closet.removeFromCloset);
  const markAsWorn = useMutation(api.closet.markAsWorn);

  const handleRemove = async (productId: Id<"products">) => {
    if (!user?.id) return;
    if (confirm("Remove this item from your closet?")) {
      await removeFromCloset({ clerkId: user.id, productId });
    }
  };

  const handleMarkWorn = async (productId: Id<"products">) => {
    if (!user?.id) return;
    await markAsWorn({ clerkId: user.id, productId });
  };

  const conditionLabels: Record<string, string> = {
    new: "New",
    used: "Used",
    like_new: "Like New",
  };

  const conditionColors: Record<string, string> = {
    new: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    used: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    like_new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };

  // Filter items by category
  const filteredItems = selectedCategory
    ? closetItems?.filter((item) => item.product?.category === selectedCategory)
    : closetItems;

  // Get unique categories
  const categories = closetItems
    ? Array.from(new Set(closetItems.map((item) => item.product?.category).filter(Boolean)))
    : [];

  // Loading state
  if (!isLoaded || closetItems === undefined) {
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
              Track the clothes you own and organize your wardrobe
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              My Closet
            </h1>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              {closetStats?.totalItems || 0} items
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        {closetStats && closetStats.totalItems > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Items</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                {closetStats.totalItems}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Categories</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                {Object.keys(closetStats.categories).length}
              </p>
            </div>
          </div>
        )}

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              All ({closetItems?.length})
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category as string)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                  selectedCategory === category
                    ? "bg-purple-600 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {category} ({closetItems?.filter((i) => i.product?.category === category).length})
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {closetItems.length === 0 ? (
          <div className="mt-16 text-center">
            <svg className="mx-auto h-16 w-16 text-zinc-300 dark:text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-white">
              Your closet is empty
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Browse products and click &quot;I Own This&quot; to add items to your closet
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-lg bg-purple-600 px-6 py-3 font-medium text-white hover:bg-purple-500"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          /* Closet Items Grid */
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems?.map((item) => {
              const product = item.product;
              if (!product) return null;

              return (
                <div
                  key={item._id}
                  className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                >
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
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                          {product.brand}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${conditionColors[product.condition]}`}>
                          {conditionLabels[product.condition]}
                        </span>
                      </div>
                      <h3 className="mt-1 line-clamp-2 text-sm font-medium text-zinc-900 dark:text-white">
                        {product.name}
                      </h3>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-semibold text-zinc-900 dark:text-white">
                          ${product.price.toFixed(2)}
                        </span>
                        {item.wornCount !== undefined && item.wornCount > 0 && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            Worn {item.wornCount}x
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Action Buttons */}
                  <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleMarkWorn(product._id)}
                      className="rounded-full bg-white/90 p-2 text-zinc-600 shadow-sm hover:bg-white hover:text-purple-600 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-purple-400"
                      title="Mark as worn"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRemove(product._id)}
                      className="rounded-full bg-white/90 p-2 text-zinc-600 shadow-sm hover:bg-white hover:text-red-600 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                      title="Remove from closet"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Owned Badge */}
                  <div className="absolute left-2 top-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-600 px-2 py-1 text-xs font-medium text-white">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Owned
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
