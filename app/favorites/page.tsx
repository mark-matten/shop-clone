"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/layout";

export default function FavoritesPage() {
  const { user, isLoaded } = useUser();
  const favorites = useQuery(
    api.favorites.getFavorites,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const removeFavorite = useMutation(api.favorites.removeFavorite);

  const handleRemove = async (productId: Id<"products">) => {
    if (!user?.id) return;
    await removeFavorite({ clerkId: user.id, productId });
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

  // Loading state
  if (!isLoaded || favorites === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[3/4] rounded-xl bg-zinc-200 dark:bg-zinc-800" />
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
          <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">
              Sign in to view your favorites
            </p>
            <Link
              href="/sign-in"
              className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Sign in
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const favoriteProducts = favorites.map((f) => f.product).filter(Boolean);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Favorites
            </h1>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              {favoriteProducts.length} saved items
            </p>
          </div>
          <Link
            href="/compare"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Compare favorites
          </Link>
        </div>

        {favoriteProducts.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <svg
              className="mx-auto h-12 w-12 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              No favorites yet
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
              Click the heart icon on products to save them here
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favoriteProducts.map((product) => (
              <div
                key={product!._id}
                className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Link href={`/product/${product!._id}`}>
                  <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {product!.imageUrl ? (
                      <img
                        src={product!.imageUrl}
                        alt={product!.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">
                        <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <span className={`absolute right-2 top-2 rounded-full px-2 py-1 text-xs font-medium ${conditionColors[product!.condition]}`}>
                      {conditionLabels[product!.condition]}
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {product!.brand}
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {product!.sourcePlatform}
                      </span>
                    </div>

                    <h3 className="mb-2 line-clamp-2 text-sm font-medium text-zinc-900 dark:text-white">
                      {product!.name}
                    </h3>

                    <div className="mb-3 flex flex-wrap gap-1">
                      {product!.size && (
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          Size {product!.size}
                        </span>
                      )}
                      {product!.material && (
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {product!.material}
                        </span>
                      )}
                    </div>

                    <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                      ${product!.price.toFixed(2)}
                    </span>
                  </div>
                </Link>

                {/* Action buttons */}
                <div className="absolute left-2 top-2 flex flex-col gap-2">
                  <button
                    onClick={() => handleRemove(product!._id)}
                    className="rounded-full bg-red-500 p-2 text-white shadow-sm transition-colors hover:bg-red-600"
                    title="Remove from favorites"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
