"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout";
import { mockProducts } from "@/lib/mockData";

// Mock user data for preview
const mockUser = {
  phoneNumber: "+1 (555) 123-4567",
  preferences: {
    shoeSize: "8",
    topSize: "M",
    bottomSize: "28",
    dressSize: "6",
  },
};

// Mock tracked items
const mockTrackedItems = mockProducts.slice(0, 3).map((product, index) => ({
  ...product,
  targetPrice: product.price * 0.8,
  trackedAt: Date.now() - index * 86400000,
  priceChange: index === 0 ? -12.5 : index === 1 ? 5.2 : 0,
}));

const sizeOptions = {
  shoeSize: ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12"],
  topSize: ["XS", "S", "M", "L", "XL", "XXL"],
  bottomSize: ["24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "36", "38", "40"],
  dressSize: ["0", "2", "4", "6", "8", "10", "12", "14", "16"],
};

export default function ProfilePage() {
  const [preferences, setPreferences] = useState(mockUser.preferences);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSaveMessage("Preferences saved!");
    setIsSaving(false);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Your Profile
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          {mockUser.phoneNumber}
        </p>

        {/* Size Preferences */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Size Preferences
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Set your sizes to get personalized recommendations
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(sizeOptions).map(([key, options]) => (
              <div key={key}>
                <label
                  htmlFor={key}
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  {key === "shoeSize"
                    ? "Shoe Size"
                    : key === "topSize"
                    ? "Top Size"
                    : key === "bottomSize"
                    ? "Bottom Size"
                    : "Dress Size"}
                </label>
                <select
                  id={key}
                  value={preferences[key as keyof typeof preferences] || ""}
                  onChange={(e) =>
                    setPreferences({ ...preferences, [key]: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  <option value="">Select...</option>
                  {options.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSaving ? "Saving..." : "Save Preferences"}
            </button>
            {saveMessage && (
              <span className="text-sm text-green-600 dark:text-green-400">
                {saveMessage}
              </span>
            )}
          </div>
        </section>

        {/* Tracked Items */}
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Tracked Items
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {mockTrackedItems.length} items being tracked
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {mockTrackedItems.map((item) => (
              <div
                key={item._id}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                        {item.brand}
                      </p>
                      <h3 className="font-medium text-zinc-900 dark:text-white truncate">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {item.sourcePlatform}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                        ${item.price.toFixed(2)}
                      </p>
                      {item.priceChange !== 0 && (
                        <p
                          className={`text-sm font-medium ${
                            item.priceChange < 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {item.priceChange < 0 ? "↓" : "↑"} {Math.abs(item.priceChange).toFixed(1)}%
                        </p>
                      )}
                      <p className="text-xs text-zinc-400">
                        Target: ${item.targetPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-shrink-0 gap-2">
                  <Link
                    href={`/product/${item._id}`}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    View
                  </Link>
                  <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950">
                    Untrack
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Price Alerts */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Price Alerts
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Get notified when prices drop
          </p>

          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  SMS Alerts Enabled
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  You&apos;ll receive a text when tracked items hit your target price
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
