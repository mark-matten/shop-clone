"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { LazyImage } from "@/components/ui/LazyImage";

interface ProductVariant {
  id: string;
  title: string;
  available: boolean;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  brand: string;
  price: number;
  originalPrice?: number; // For showing price drops
  material?: string;
  size?: string;
  category: string;
  gender?: "men" | "women" | "unisex";
  condition: "new" | "used" | "like_new";
  sourceUrl: string;
  sourcePlatform: string;
  imageUrl?: string;
  variants?: ProductVariant[];
}

interface ProductCardProps {
  product: Product;
  isFavorited?: boolean;
}

const conditionLabels = {
  new: "New",
  used: "Used",
  like_new: "Like New",
};

const conditionColors = {
  new: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  used: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  like_new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const genderLabels = {
  men: "M",
  women: "F",
  unisex: "M/F",
};

export function ProductCard({ product, isFavorited = false }: ProductCardProps) {
  const { user } = useUser();
  const [isTracked, setIsTracked] = useState(false);
  const [isFavorite, setIsFavorite] = useState(isFavorited);
  const [isLoading, setIsLoading] = useState(false);

  const toggleFavorite = useMutation(api.favorites.toggleFavorite);

  // Calculate price drop percentage if originalPrice exists
  const priceDropPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  // Check if all variants are sold out
  const isSoldOut = product.variants && product.variants.length > 0
    ? product.variants.every(v => !v.available)
    : false;

  // Sync favorite state with prop
  useEffect(() => {
    setIsFavorite(isFavorited);
  }, [isFavorited]);

  const handleTrackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTracked(!isTracked);
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user?.id || isLoading) return;

    setIsLoading(true);
    try {
      const result = await toggleFavorite({
        clerkId: user.id,
        productId: product._id as Id<"products">,
      });
      setIsFavorite(result.isFavorite);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <Link href={`/product/${product._id}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {product.imageUrl ? (
            <LazyImage
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              fallbackIcon={
                <svg
                  className="h-16 w-16 text-zinc-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              }
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-400">
              <svg
                className="h-16 w-16"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
          <span
            className={`absolute right-2 top-2 rounded-full px-2 py-1 text-xs font-medium ${conditionColors[product.condition]}`}
          >
            {conditionLabels[product.condition]}
          </span>
          {isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-bold text-white">
                Sold Out
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
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

          <div className="mb-3 flex flex-wrap gap-1">
            {product.gender && (
              <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                {genderLabels[product.gender]}
              </span>
            )}
            {product.size && (
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Size {product.size}
              </span>
            )}
            {product.material && (
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {product.material}
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                ${product.price.toFixed(2)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-sm text-zinc-400 line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            {priceDropPercent && priceDropPercent >= 5 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/50 dark:text-red-300">
                -{priceDropPercent}%
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Track button */}
      <button
        onClick={handleTrackClick}
        className={`absolute left-2 top-2 rounded-full p-2 transition-all ${
          isTracked
            ? "bg-green-500 text-white"
            : "bg-white/90 text-zinc-600 opacity-0 group-hover:opacity-100 hover:bg-white dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:bg-zinc-800"
        }`}
        title={isTracked ? "Stop tracking" : "Track price"}
      >
        {isTracked ? (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )}
      </button>

      {/* Favorite button */}
      <button
        onClick={handleFavoriteClick}
        className={`absolute left-2 top-12 rounded-full p-2 transition-all ${
          isFavorite
            ? "bg-red-500 text-white"
            : "bg-white/90 text-zinc-600 opacity-0 group-hover:opacity-100 hover:bg-white dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:bg-zinc-800"
        }`}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <svg
          className="h-4 w-4"
          fill={isFavorite ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>
    </div>
  );
}
