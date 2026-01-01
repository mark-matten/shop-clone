"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/layout";

export default function DashboardPage() {
  const { user: clerkUser, isLoaded } = useUser();

  const stats = useQuery(
    api.dashboard.getUserStats,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  const charts = useQuery(
    api.dashboard.getDashboardCharts,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!clerkUser) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Sign in to view your dashboard
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Track your savings, view price trends, and manage your tracked items.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-block rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Sign In
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Your Dashboard
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Track your savings and monitor price trends
        </p>

        {/* Stats Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Savings</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${stats?.stats.totalSavings.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Tracked Items</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {stats?.stats.totalTracked || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Favorites</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {stats?.stats.totalFavorites || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
                <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Price Alerts</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {stats?.stats.totalAlerts || 0}
                  {stats?.stats.unreadAlerts ? (
                    <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                      {stats.stats.unreadAlerts} new
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tracked Items with Trends */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Price Tracking
            </h2>
            <Link href="/profile" className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
              View all
            </Link>
          </div>

          {stats?.trackedItems && stats.trackedItems.length > 0 ? (
            <div className="mt-4 space-y-4">
              {stats.trackedItems.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    {item.product?.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product?.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${item.productId}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-white truncate block"
                    >
                      {item.product?.name || "Unknown Product"}
                    </Link>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {item.product?.brand} &bull; {item.product?.sourcePlatform}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                        ${item.priceStats.current.toFixed(2)}
                      </span>
                      {item.priceStats.trend === "down" && (
                        <span className="flex items-center text-green-600 dark:text-green-400">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          </svg>
                        </span>
                      )}
                      {item.priceStats.trend === "up" && (
                        <span className="flex items-center text-red-600 dark:text-red-400">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </span>
                      )}
                    </div>
                    {item.targetPrice && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Target: ${item.targetPrice.toFixed(2)}
                      </p>
                    )}
                    {item.priceStats.savingsFromHigh > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        ${item.priceStats.savingsFromHigh.toFixed(2)} below high
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                No items being tracked yet
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Search for products and click &quot;Track Price&quot; to start monitoring
              </p>
              <Link
                href="/"
                className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Start Searching
              </Link>
            </div>
          )}
        </section>

        {/* Category Breakdown */}
        {charts?.categoryBreakdown && charts.categoryBreakdown.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Tracked by Category
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {charts.categoryBreakdown.map(({ category, count }) => (
                <div
                  key={category}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span className="font-medium text-zinc-900 dark:text-white capitalize">
                    {category}
                  </span>
                  <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Alerts */}
        {stats?.recentAlerts && stats.recentAlerts.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Recent Alerts
            </h2>
            <div className="mt-4 space-y-3">
              {stats.recentAlerts.map((alert) => (
                <div
                  key={alert._id}
                  className={`flex items-center gap-4 rounded-xl border p-4 ${
                    alert.isNew
                      ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20"
                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <div className={`rounded-full p-2 ${
                    alert.alertType === "target_reached"
                      ? "bg-green-100 dark:bg-green-900/50"
                      : "bg-blue-100 dark:bg-blue-900/50"
                  }`}>
                    {alert.alertType === "target_reached" ? (
                      <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {alert.alertType === "target_reached" ? "Target Price Reached!" : "Price Drop!"}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      ${alert.previousPrice.toFixed(2)} → ${alert.newPrice.toFixed(2)}
                      <span className="ml-2 text-green-600 dark:text-green-400">
                        (Save ${(alert.previousPrice - alert.newPrice).toFixed(2)})
                      </span>
                    </p>
                  </div>
                  {alert.isNew && (
                    <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
                      New
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
