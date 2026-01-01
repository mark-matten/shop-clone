"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ViewedProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  imageUrl?: string;
  viewedAt: number;
}

const MAX_RECENT = 10;
const STORAGE_KEY = "recently_viewed_products";

export function useRecentlyViewed() {
  const [viewed, setViewed] = useState<ViewedProduct[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setViewed(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse recently viewed:", e);
      }
    }
  }, []);

  const addViewed = useCallback((product: Omit<ViewedProduct, "viewedAt">) => {
    setViewed((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const updated = [{ ...product, viewedAt: Date.now() }, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearViewed = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setViewed([]);
  }, []);

  return { viewed, addViewed, clearViewed };
}

export function RecentlyViewed() {
  const { viewed, clearViewed } = useRecentlyViewed();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || viewed.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Recently Viewed
        </h3>
        <button
          onClick={clearViewed}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          Clear all
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {viewed.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            className="group flex-shrink-0"
          >
            <div className="w-32 overflow-hidden rounded-lg border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
              <div className="aspect-square bg-zinc-100 dark:bg-zinc-800">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
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
              <div className="p-2">
                <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400 truncate">
                  {product.brand}
                </p>
                <p className="mt-0.5 text-sm text-zinc-900 dark:text-white truncate">
                  {product.name}
                </p>
                <p className="mt-1 font-semibold text-zinc-900 dark:text-white">
                  ${product.price.toFixed(2)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
