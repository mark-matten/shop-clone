"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/layout";

const COLLECTION_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#0ea5e9", "#6b7280",
];

export default function FavoritesPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<"all" | "collections">("all");
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionColor, setNewCollectionColor] = useState(COLLECTION_COLORS[0]);
  const [selectedCollection, setSelectedCollection] = useState<Id<"collections"> | null>(null);

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const favorites = useQuery(
    api.favorites.getFavorites,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const collections = useQuery(
    api.collections.getCollections,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  const collectionDetails = useQuery(
    api.collections.getCollection,
    selectedCollection ? { collectionId: selectedCollection } : "skip"
  );

  const removeFavorite = useMutation(api.favorites.removeFavorite);
  const createCollection = useMutation(api.collections.createCollection);
  const deleteCollection = useMutation(api.collections.deleteCollection);
  const removeFromCollection = useMutation(api.collections.removeFromCollection);

  const handleRemove = async (productId: Id<"products">) => {
    if (!user?.id) return;
    await removeFavorite({ clerkId: user.id, productId });
  };

  const handleCreateCollection = async () => {
    if (!convexUser?._id || !newCollectionName.trim()) return;
    await createCollection({
      userId: convexUser._id,
      name: newCollectionName.trim(),
      color: newCollectionColor,
    });
    setNewCollectionName("");
    setShowNewCollectionModal(false);
  };

  const handleDeleteCollection = async (collectionId: Id<"collections">) => {
    if (!convexUser?._id) return;
    if (confirm("Delete this collection? Items will remain in your favorites.")) {
      await deleteCollection({ collectionId, userId: convexUser._id });
      if (selectedCollection === collectionId) {
        setSelectedCollection(null);
      }
    }
  };

  const handleRemoveFromCollection = async (productId: Id<"products">) => {
    if (!selectedCollection) return;
    await removeFromCollection({ collectionId: selectedCollection, productId });
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

  const favoriteProducts = favorites?.map((f) => f.product).filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Favorites
            </h1>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              {favoriteProducts.length} saved items
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewCollectionModal(true)}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Collection
            </button>
            <Link
              href="/compare"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Compare
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
          <button
            onClick={() => { setActiveTab("all"); setSelectedCollection(null); }}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "all"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            All Favorites ({favoriteProducts.length})
          </button>
          <button
            onClick={() => setActiveTab("collections")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "collections"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            Collections ({collections?.length || 0})
          </button>
        </div>

        {/* Collections Tab Content */}
        {activeTab === "collections" && (
          <>
            {selectedCollection && collectionDetails ? (
              // Show selected collection items
              <div>
                <button
                  onClick={() => setSelectedCollection(null)}
                  className="mb-4 flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to collections
                </button>
                <div className="mb-6 flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: collectionDetails.color || "#6366f1" }}
                  />
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                    {collectionDetails.name}
                  </h2>
                  <span className="text-sm text-zinc-500">
                    ({collectionDetails.items.length} items)
                  </span>
                </div>
                {collectionDetails.items.length === 0 ? (
                  <div className="rounded-xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-zinc-500">No items in this collection</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {collectionDetails.items.map((item) => item.product && (
                      <div
                        key={item._id}
                        className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <Link href={`/product/${item.product._id}`}>
                          <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                            {item.product.imageUrl ? (
                              <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-zinc-400">
                                <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <span className="text-xs font-medium uppercase text-zinc-500">{item.product.brand}</span>
                            <h3 className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-white">{item.product.name}</h3>
                            <span className="text-lg font-semibold text-zinc-900 dark:text-white">${item.product.price.toFixed(2)}</span>
                          </div>
                        </Link>
                        <button
                          onClick={() => handleRemoveFromCollection(item.product!._id)}
                          className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-zinc-600 shadow-sm hover:bg-white hover:text-red-500 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Show collections grid
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {collections?.map((collection) => (
                  <div
                    key={collection._id}
                    className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <button
                      onClick={() => setSelectedCollection(collection._id)}
                      className="block w-full text-left"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-lg"
                          style={{ backgroundColor: collection.color || "#6366f1" }}
                        />
                        <div>
                          <h3 className="font-semibold text-zinc-900 dark:text-white">
                            {collection.name}
                          </h3>
                          <p className="text-sm text-zinc-500">
                            {collection.itemCount} items
                          </p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDeleteCollection(collection._id)}
                      className="absolute right-2 top-2 rounded-full p-2 text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                {(!collections || collections.length === 0) && (
                  <div className="col-span-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-12 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
                    <p className="text-zinc-500">No collections yet</p>
                    <button
                      onClick={() => setShowNewCollectionModal(true)}
                      className="mt-3 text-sm font-medium text-zinc-900 hover:underline dark:text-white"
                    >
                      Create your first collection
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* All Favorites Tab Content */}
        {activeTab === "all" && favoriteProducts.length === 0 ? (
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
        ) : activeTab === "all" ? (
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
        ) : null}
      </main>

      {/* New Collection Modal */}
      {showNewCollectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Create Collection
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Organize your favorites into collections
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Collection Name
              </label>
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g., Summer Wishlist"
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {COLLECTION_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCollectionColor(color)}
                    className={`h-8 w-8 rounded-full transition-transform ${
                      newCollectionColor === color ? "scale-110 ring-2 ring-zinc-900 ring-offset-2 dark:ring-white" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowNewCollectionModal(false);
                  setNewCollectionName("");
                }}
                className="flex-1 rounded-lg border border-zinc-300 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
                className="flex-1 rounded-lg bg-zinc-900 py-2 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
