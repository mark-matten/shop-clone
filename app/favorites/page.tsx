"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/layout";

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
  return '#6b7280'; // Default gray
}

interface EditingItem {
  productId: Id<"products">;
  productName: string;
  options: { name: string; values: string[] }[];
  currentOptions: Record<string, string>;
  colorGroupId?: string;
  currentColor?: string;
}

export default function FavoritesPage() {
  const { user, isLoaded } = useUser();
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [editOptions, setEditOptions] = useState<Record<string, string>>({});

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const favorites = useQuery(
    api.favorites.getFavoritesWithTracking,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const removeFavorite = useMutation(api.favorites.removeFavorite);
  const updateFavoriteOptions = useMutation(api.favorites.updateFavoriteOptions);
  const trackProduct = useMutation(api.tracking.trackProduct);
  const untrackProduct = useMutation(api.tracking.untrackProduct);

  const handleRemove = async (productId: Id<"products">) => {
    if (!user?.id) return;
    await removeFavorite({ clerkId: user.id, productId });
  };

  const handleEdit = (item: NonNullable<typeof favorites>[number]) => {
    if (!item.product) return;
    const currentColor = item.selectedOptions?.["Color"] || item.selectedOptions?.["Colour"] || item.product.colorName;
    setEditingItem({
      productId: item.product._id,
      productName: item.product.name,
      options: item.product.options || [],
      currentOptions: item.selectedOptions || {},
      colorGroupId: item.product.colorGroupId,
      currentColor,
    });
    setEditOptions({
      ...item.selectedOptions,
      ...(currentColor ? { Color: currentColor } : {}),
    });
  };

  // Fetch color variants when editing an item with a colorGroupId
  const colorVariants = useQuery(
    api.products.getColorVariants,
    editingItem?.colorGroupId ? { colorGroupId: editingItem.colorGroupId } : "skip"
  );

  const handleSaveEdit = async () => {
    if (!user?.id || !editingItem) return;
    await updateFavoriteOptions({
      clerkId: user.id,
      productId: editingItem.productId,
      selectedOptions: editOptions,
    });
    setEditingItem(null);
    setEditOptions({});
  };

  const handleToggleTracking = async (item: NonNullable<typeof favorites>[number]) => {
    if (!convexUser?._id || !item.product) return;

    if (item.isTracking) {
      await untrackProduct({
        userId: convexUser._id,
        productId: item.product._id,
      });
    } else {
      await trackProduct({
        userId: convexUser._id,
        productId: item.product._id,
        targetPrice: Math.round(item.product.price * 0.85),
        selectedOptions: item.selectedOptions,
      });
    }
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

  const favoriteItems = favorites || [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Favorites
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {favoriteItems.length} saved items
          </p>
        </div>

        {/* Favorites Content */}
        {favoriteItems.length === 0 ? (
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
            {favoriteItems.map((item) => {
              const product = item.product;
              if (!product) return null;

              // Get selected color and size from savedOptions or product defaults
              const selectedColor = item.selectedOptions?.["Color"] || item.selectedOptions?.["Colour"] || product.colorName;
              const selectedSize = item.selectedOptions?.["Size"];
              const colorHex = selectedColor ? getColorFromName(selectedColor) : null;

              // Build URL with pre-selected options
              const optionsParams = new URLSearchParams();
              if (item.selectedOptions) {
                Object.entries(item.selectedOptions).forEach(([key, value]) => {
                  if (value) optionsParams.set(key, value);
                });
              }
              const productUrl = `/product/${product._id}${optionsParams.toString() ? `?${optionsParams.toString()}` : ""}`;

              return (
                <div
                  key={product._id}
                  className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <Link href={productUrl}>
                    <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-400">
                          <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <span className={`absolute right-2 top-2 rounded-full px-2 py-1 text-xs font-medium ${conditionColors[product.condition]}`}>
                        {conditionLabels[product.condition]}
                      </span>
                    </div>

                    <div className="p-4">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {product.brand}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                          {product.sourcePlatform}
                        </span>
                      </div>

                      <h3 className="mb-2 line-clamp-2 text-sm font-medium text-zinc-900 dark:text-white">
                        {product.name}
                      </h3>

                      {/* Selected Options (Color & Size) with colored text */}
                      <div className="mb-3 flex flex-wrap gap-1">
                        {selectedColor && (
                          <span
                            className="rounded px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${colorHex}20`,
                              color: colorHex || '#6b7280'
                            }}
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

                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                          ${product.price.toFixed(2)}
                        </span>
                        {item.isTracking && item.targetPrice && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            Target: ${item.targetPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Status badges */}
                  <div className="absolute left-2 top-2 flex flex-col gap-1">
                    {item.isFavorite && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(product._id); }}
                        className="rounded-full bg-red-500 p-2 text-white shadow-sm transition-colors hover:bg-red-600"
                        title="Remove from favorites"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Action Buttons (Edit & Track) */}
                  <div className="absolute right-2 top-12 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(item); }}
                      className="rounded-full bg-white/90 p-2 text-zinc-600 shadow-sm hover:bg-white hover:text-purple-600 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-purple-400"
                      title="Edit size/color"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleTracking(item); }}
                      className={`rounded-full p-2 shadow-sm transition-colors ${
                        item.isTracking
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-white/90 text-zinc-600 hover:bg-white hover:text-green-600 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-green-400"
                      }`}
                      title={item.isTracking ? "Stop tracking" : "Track price"}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Edit Item
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
              {editingItem.productName}
            </p>

            <div className="mt-4 space-y-4">
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
