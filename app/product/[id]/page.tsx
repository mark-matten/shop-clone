"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/layout";

// Generate mock price history (will be replaced with real data later)
function generatePriceHistory(basePrice: number) {
  const history = [];
  const now = Date.now();
  for (let i = 30; i >= 0; i--) {
    const fluctuation = (Math.random() - 0.5) * 0.15;
    const price = basePrice * (1 + fluctuation);
    history.push({
      date: new Date(now - i * 86400000).toISOString().split("T")[0],
      price: Math.round(price * 100) / 100,
    });
  }
  return history;
}

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  // Fetch product from Convex
  const product = useQuery(api.products.getProduct, {
    id: productId as Id<"products">,
  });

  const [isTracking, setIsTracking] = useState(false);
  const [targetPrice, setTargetPrice] = useState("");
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  // Generate price history only when product is loaded
  const priceHistory = useMemo(
    () => (product ? generatePriceHistory(product.price) : []),
    [product]
  );

  const lowestPrice = priceHistory.length > 0 ? Math.min(...priceHistory.map((p) => p.price)) : 0;
  const highestPrice = priceHistory.length > 0 ? Math.max(...priceHistory.map((p) => p.price)) : 0;
  const avgPrice = priceHistory.length > 0
    ? priceHistory.reduce((sum, p) => sum + p.price, 0) / priceHistory.length
    : 0;

  const handleTrack = () => {
    setIsTracking(true);
    setShowTrackingModal(false);
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
            href="/"
            className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to search
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

  // Set default target price when product loads
  if (targetPrice === "" && product) {
    setTargetPrice(Math.round(product.price * 0.85).toString());
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to search
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {/* Product Image */}
          <div className="aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-400">
                <svg className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
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

            <div className="mt-4 flex items-baseline gap-4">
              <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                ${product.price.toFixed(2)}
              </span>
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                {conditionLabels[product.condition]}
              </span>
            </div>

            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              {product.description}
            </p>

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

            <div className="mt-8 flex gap-4">
              <a
                href={product.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-xl bg-zinc-900 py-3 text-center font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                View on {product.sourcePlatform}
              </a>
              {isTracking ? (
                <button
                  onClick={() => setIsTracking(false)}
                  className="flex items-center gap-2 rounded-xl border border-green-600 px-6 py-3 font-medium text-green-600 transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-500 dark:hover:bg-green-950"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Tracking
                </button>
              ) : (
                <button
                  onClick={() => setShowTrackingModal(true)}
                  className="flex items-center gap-2 rounded-xl border border-zinc-300 px-6 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Track Price
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Price History */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Price History
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Last 30 days
          </p>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Lowest</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                ${lowestPrice.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Average</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">
                ${avgPrice.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Highest</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                ${highestPrice.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="relative h-64">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-zinc-400">
                <span>${highestPrice.toFixed(0)}</span>
                <span>${avgPrice.toFixed(0)}</span>
                <span>${lowestPrice.toFixed(0)}</span>
              </div>

              {/* Chart area */}
              <div className="ml-12 h-full">
                <svg className="h-full w-full" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="0" x2="100%" y2="0" stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" strokeWidth="1" />
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="100%" x2="100%" y2="100%" stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" strokeWidth="1" />

                  {/* Price line */}
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    className="text-blue-500"
                    strokeWidth="2"
                    points={priceHistory
                      .map((p, i) => {
                        const x = (i / (priceHistory.length - 1)) * 100;
                        const y = 100 - ((p.price - lowestPrice) / (highestPrice - lowestPrice)) * 100;
                        return `${x}%,${y}%`;
                      })
                      .join(" ")}
                  />

                  {/* Area fill */}
                  <polygon
                    fill="currentColor"
                    className="text-blue-500/10"
                    points={`0%,100% ${priceHistory
                      .map((p, i) => {
                        const x = (i / (priceHistory.length - 1)) * 100;
                        const y = 100 - ((p.price - lowestPrice) / (highestPrice - lowestPrice)) * 100;
                        return `${x}%,${y}%`;
                      })
                      .join(" ")} 100%,100%`}
                  />
                </svg>
              </div>
            </div>

            {/* X-axis labels */}
            <div className="ml-12 mt-2 flex justify-between text-xs text-zinc-400">
              <span>{priceHistory[0].date}</span>
              <span>{priceHistory[Math.floor(priceHistory.length / 2)].date}</span>
              <span>{priceHistory[priceHistory.length - 1].date}</span>
            </div>
          </div>
        </section>
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

            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Target Price
              </label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-8 pr-3 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Current price: ${product.price.toFixed(2)}
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
                className="flex-1 rounded-lg bg-zinc-900 py-2 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Start Tracking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
