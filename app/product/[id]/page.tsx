"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/layout";
import { useRecentlyViewed } from "@/components/search/RecentlyViewed";
import { ImageCarousel } from "@/components/ui/ImageCarousel";
import { VariantSelector } from "@/components/ui/VariantSelector";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = params.id as string;
  const { user: clerkUser } = useUser();

  // Fetch product from Convex
  const product = useQuery(api.products.getProduct, {
    id: productId as Id<"products">,
  });

  // Get the Convex user
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Check if already tracking this product
  const trackedItems = useQuery(
    api.tracking.getTrackedItems,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  const trackProduct = useMutation(api.tracking.trackProduct);
  const untrackProduct = useMutation(api.tracking.untrackProduct);

  // Favorites
  const favoriteIds = useQuery(
    api.favorites.getFavoriteIds,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );
  const addFavorite = useMutation(api.favorites.addFavorite);
  const removeFavorite = useMutation(api.favorites.removeFavorite);

  const isFavorited = favoriteIds?.includes(productId as Id<"products">) ?? false;

  // Filter out empty values from selected options
  const getSelectedOptionsForSave = () => {
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(selectedOptions)) {
      if (value && value.trim() !== "") {
        filtered[key] = value;
      }
    }
    return Object.keys(filtered).length > 0 ? filtered : undefined;
  };

  const handleToggleFavorite = async () => {
    if (!clerkUser?.id) {
      alert("Please sign in to save favorites");
      return;
    }

    try {
      if (isFavorited) {
        await removeFavorite({
          clerkId: clerkUser.id,
          productId: productId as Id<"products">,
        });
      } else {
        await addFavorite({
          clerkId: clerkUser.id,
          productId: productId as Id<"products">,
          selectedOptions: getSelectedOptionsForSave(),
        });
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  // Closet (I own this)
  const isInCloset = useQuery(
    api.closet.isInCloset,
    clerkUser?.id ? { clerkId: clerkUser.id, productId: productId as Id<"products"> } : "skip"
  );
  const toggleCloset = useMutation(api.closet.toggleCloset);
  const [isTogglingCloset, setIsTogglingCloset] = useState(false);

  const handleToggleCloset = async () => {
    if (!clerkUser?.id) {
      alert("Please sign in to add items to your closet");
      return;
    }

    setIsTogglingCloset(true);
    try {
      await toggleCloset({
        clerkId: clerkUser.id,
        productId: productId as Id<"products">,
        selectedOptions: getSelectedOptionsForSave(),
      });
    } catch (error) {
      console.error("Failed to toggle closet:", error);
    } finally {
      setIsTogglingCloset(false);
    }
  };

  // Get similar products
  const similarProducts = useQuery(
    api.recommendations.getSimilarProducts,
    productId ? { productId: productId as Id<"products">, limit: 6 } : "skip"
  );

  // Get color variants for this product
  const colorVariants = useQuery(
    api.products.getColorVariants,
    product?.colorGroupId ? { colorGroupId: product.colorGroupId } : "skip"
  );

  const [targetPrice, setTargetPrice] = useState("");
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitializedPrice, setHasInitializedPrice] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  const { addViewed } = useRecentlyViewed();
  const addedViewRef = useRef<string | null>(null);
  const [previousProductId, setPreviousProductId] = useState<string | null>(null);
  const [previousProductName, setPreviousProductName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const processedProductId = useRef<string | null>(null);

  // Get the cached search query on mount
  useEffect(() => {
    try {
      const savedState = sessionStorage.getItem("shopwatch_search_state");
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.query) {
          setSearchQuery(parsed.query);
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }, []);

  // Track navigation history for back links - single effect to avoid race conditions
  useEffect(() => {
    if (!product || !productId) return;

    // Prevent processing the same product twice
    if (processedProductId.current === productId) return;
    processedProductId.current = productId;

    // Get the current navigation stack from sessionStorage
    const navStackStr = sessionStorage.getItem("product_nav_stack");
    let navStack: { id: string; name: string }[] = navStackStr ? JSON.parse(navStackStr) : [];

    // Find current product's position in the stack
    const currentIndex = navStack.findIndex(p => p.id === productId);

    // Determine the previous product BEFORE modifying the stack
    if (currentIndex > 0) {
      // Current product is in stack and has a predecessor
      const prevProduct = navStack[currentIndex - 1];
      setPreviousProductId(prevProduct.id);
      setPreviousProductName(prevProduct.name);
      // Trim stack to current position (navigated back)
      navStack = navStack.slice(0, currentIndex + 1);
    } else if (currentIndex === -1 && navStack.length > 0) {
      // Current product is not in stack yet - previous is the last item
      const lastProduct = navStack[navStack.length - 1];
      setPreviousProductId(lastProduct.id);
      setPreviousProductName(lastProduct.name);
      // Add new product to stack
      navStack.push({ id: productId, name: product.name });
      if (navStack.length > 10) navStack.shift();
    } else {
      // No previous product (first in chain or empty stack)
      setPreviousProductId(null);
      setPreviousProductName(null);
      // Add first product to stack
      navStack.push({ id: productId, name: product.name });
    }

    sessionStorage.setItem("product_nav_stack", JSON.stringify(navStack));
  }, [product, productId]);

  // Reset processed flag when productId changes (before product loads)
  useEffect(() => {
    if (productId && processedProductId.current !== productId) {
      // Clear previous product info until we process the new product
      // This prevents showing stale data
    }
  }, [productId]);

  const handleBackToPreviousProduct = () => {
    if (!previousProductId) return;
    // Clear the processed flag so the next product page processes correctly
    processedProductId.current = null;
    router.push(`/product/${previousProductId}`);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product ? `${product.brand} ${product.name}` : "Product",
          text: product?.description,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error - fallback to copy
        if ((err as Error).name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      // Fallback for browsers that don't support native share
      handleCopyLink();
    }
  };

  // Check if this product is being tracked
  const trackedItem = trackedItems?.find(
    (item) => item.productId === productId
  );
  const isTracking = !!trackedItem;

  // Set default target price only once when product first loads
  useEffect(() => {
    if (product && !hasInitializedPrice) {
      setTargetPrice(Math.round(product.price * 0.85).toString());
      setHasInitializedPrice(true);
    }
  }, [product, hasInitializedPrice]);

  // Initialize selected options from URL params (for favorites navigation) or reset when product changes
  useEffect(() => {
    const initialOptions: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      // Only include Size and Color/Colour params
      if (key === "Size" || key === "Color" || key === "Colour") {
        initialOptions[key] = value;
      }
    });
    setSelectedOptions(initialOptions);
  }, [productId, searchParams]);

  // Track product view - only run once per product
  useEffect(() => {
    if (product && productId && addedViewRef.current !== productId) {
      addedViewRef.current = productId;
      addViewed({
        id: productId,
        name: product.name,
        brand: product.brand,
        price: product.price,
        imageUrl: product.imageUrl,
      });
    }
  }, [product, productId, addViewed]);

  const handleTrack = async () => {
    if (!convexUser?._id) {
      alert("Please sign in to track prices");
      return;
    }

    setIsSaving(true);
    try {
      await trackProduct({
        userId: convexUser._id,
        productId: productId as Id<"products">,
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        selectedOptions: getSelectedOptionsForSave(),
      });
      setShowTrackingModal(false);
    } catch (error) {
      console.error("Failed to track product:", error);
      alert("Failed to track product. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUntrack = async () => {
    if (!convexUser?._id) return;

    try {
      await untrackProduct({
        userId: convexUser._id,
        productId: productId as Id<"products">,
      });
    } catch (error) {
      console.error("Failed to untrack product:", error);
    }
  };

  const conditionLabels: Record<string, string> = {
    new: "New",
    used: "Used",
    like_new: "Like New",
  };

  // Loading state
  if (product === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-6 grid gap-8 lg:grid-cols-2">
              <div className="aspect-square rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
              <div className="space-y-4">
                <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-8 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-10 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-20 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Not found state
  if (product === null) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href={searchQuery ? `/?q=${encodeURIComponent(searchQuery)}` : "/"}
            className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to search{searchQuery ? ` results` : ""}
          </Link>
          <div className="mt-16 text-center">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Product not found</h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              This product may have been removed or the link is incorrect.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link
            href={searchQuery ? `/?q=${encodeURIComponent(searchQuery)}` : "/"}
            className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to search{searchQuery ? ` results` : ""}
          </Link>
          {previousProductId && previousProductName && (
            <>
              <span className="text-zinc-300 dark:text-zinc-600">|</span>
              <button
                onClick={handleBackToPreviousProduct}
                className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to {previousProductName.length > 25 ? previousProductName.slice(0, 25) + "..." : previousProductName}
              </button>
            </>
          )}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {/* Product Images Carousel */}
          <div className="aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <ImageCarousel
              images={product.imageUrls && product.imageUrls.length > 0
                ? product.imageUrls
                : product.imageUrl
                  ? [product.imageUrl]
                  : []
              }
              alt={product.name}
            />
          </div>

          {/* Product Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {product.brand}
              </span>
              <span className="text-zinc-300 dark:text-zinc-600">•</span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {product.sourcePlatform}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
              {product.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                ${product.price.toFixed(2)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span className="text-xl text-zinc-400 line-through dark:text-zinc-500">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                  </span>
                </>
              )}
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                {conditionLabels[product.condition]}
              </span>
            </div>

            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              {product.description}
            </p>

            {/* Color & Size Selector */}
            <div className="mt-6">
              <VariantSelector
                variants={product.variants}
                options={product.options}
                colorName={product.colorName}
                colorHex={product.colorHex}
                colorVariants={colorVariants?.map((v) => ({
                  _id: v._id,
                  colorName: v.colorName,
                  colorHex: v.colorHex,
                  imageUrl: v.imageUrl,
                })) ?? []}
                currentProductId={productId}
                onOptionsChange={setSelectedOptions}
                initialSelectedOptions={selectedOptions}
              />
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4">
              {product.size && (
                <div>
                  <dt className="text-sm text-zinc-500 dark:text-zinc-400">Size</dt>
                  <dd className="font-medium text-zinc-900 dark:text-white">{product.size}</dd>
                </div>
              )}
              {product.material && (
                <div>
                  <dt className="text-sm text-zinc-500 dark:text-zinc-400">Material</dt>
                  <dd className="font-medium text-zinc-900 dark:text-white">{product.material}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-zinc-500 dark:text-zinc-400">Category</dt>
                <dd className="font-medium text-zinc-900 dark:text-white capitalize">{product.category}</dd>
              </div>
              {product.gender && (
                <div>
                  <dt className="text-sm text-zinc-500 dark:text-zinc-400">Gender</dt>
                  <dd className="font-medium text-zinc-900 dark:text-white capitalize">{product.gender}</dd>
                </div>
              )}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              {/* View on Platform */}
              <a
                href={product.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-xl bg-emerald-700 py-3 text-center font-medium text-white transition-colors hover:bg-emerald-600 dark:bg-emerald-700 dark:hover:bg-emerald-600"
              >
                View on {product.sourcePlatform}
              </a>

              {/* Favorite */}
              <button
                onClick={handleToggleFavorite}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 font-medium transition-colors ${
                  isFavorited
                    ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
                title={isFavorited ? "Remove from favorites" : "Add to favorites"}
              >
                <svg
                  className="h-5 w-5"
                  fill={isFavorited ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                Favorite
              </button>

              {/* I Own This */}
              <button
                onClick={handleToggleCloset}
                disabled={isTogglingCloset}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 font-medium transition-colors ${
                  isInCloset
                    ? "border-purple-300 bg-purple-50 text-purple-600 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-400 dark:hover:bg-purple-900"
                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                } ${isTogglingCloset ? "opacity-50 cursor-not-allowed" : ""}`}
                title={isInCloset ? "Remove from My Closet" : "Add to My Closet"}
              >
                <svg
                  className="h-5 w-5"
                  fill={isInCloset ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                {isInCloset ? "In My Closet" : "I Own This"}
              </button>

              {/* Track */}
              {isTracking ? (
                <button
                  onClick={handleUntrack}
                  className="flex items-center gap-2 rounded-xl border border-green-600 px-4 py-3 font-medium text-green-600 transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-500 dark:hover:bg-green-950"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Tracking
                  {trackedItem?.targetPrice && (
                    <span className="text-sm opacity-75">
                      (${trackedItem.targetPrice.toFixed(0)})
                    </span>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setShowTrackingModal(true)}
                  className="flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Track
                </button>
              )}

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Copy link"
              >
                {showCopied ? (
                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
                {showCopied ? "Copied!" : "Copy"}
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                className="flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Share"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts && similarProducts.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Similar Products
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              You might also like these items
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {similarProducts.map((item) => (
                <Link
                  key={item._id}
                  href={`/product/${item._id}`}
                  className="group rounded-xl border border-zinc-200 bg-white p-3 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                >
                  <div className="aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {item.brand}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-zinc-900 line-clamp-2 dark:text-white">
                      {item.name}
                    </p>
                    <p className="mt-1 font-semibold text-zinc-900 dark:text-white">
                      ${item.price.toFixed(2)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Tracking Modal */}
      {showTrackingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Track this item
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Set a target price and we&apos;ll notify you when it drops.
            </p>

            {!clerkUser && (
              <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                Please sign in to track prices.
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Target Price
              </label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="Enter target price"
                  className="block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-8 pr-3 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Current price: ${product.price.toFixed(2)} | Leave empty to track any price drop
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowTrackingModal(false)}
                className="flex-1 rounded-lg border border-zinc-300 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleTrack}
                disabled={isSaving || !clerkUser}
                className="flex-1 rounded-lg bg-zinc-900 py-2 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {isSaving ? "Saving..." : "Start Tracking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
