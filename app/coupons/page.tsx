"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { CouponCard } from "@/components/coupons/CouponCard";

export default function CouponsPage() {
  const { user: clerkUser } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  // Get user if logged in
  const dbUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Get coupons based on filter
  const activeCoupons = useQuery(api.coupons.getActiveCoupons, { limit: 50 });
  const platformCoupons = useQuery(
    api.coupons.getCouponsForPlatform,
    selectedPlatform ? { platform: selectedPlatform } : "skip"
  );
  const searchResults = useQuery(
    api.coupons.searchCoupons,
    searchQuery.length >= 2 ? { query: searchQuery } : "skip"
  );
  const savedCoupons = useQuery(
    api.coupons.getSavedCoupons,
    dbUser?._id ? { userId: dbUser._id } : "skip"
  );
  const popularPlatforms = useQuery(api.coupons.getPopularPlatforms, {});

  // Determine which coupons to show
  const displayCoupons = searchQuery.length >= 2
    ? searchResults
    : selectedPlatform
    ? platformCoupons
    : activeCoupons;

  const isLoading = displayCoupons === undefined;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>Back</span>
            </Link>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Deals & Coupons
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedPlatform(null);
              }}
              placeholder="Search coupons by store, code, or discount..."
              className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-12 pr-4 text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
            />
          </div>
        </div>

        {/* Popular Platforms */}
        {popularPlatforms && popularPlatforms.length > 0 && !searchQuery && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Popular Stores
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedPlatform(null)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  !selectedPlatform
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                All
              </button>
              {popularPlatforms.slice(0, 8).map(({ platform, count }) => (
                <button
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    selectedPlatform === platform
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {platform}
                  <span className="ml-1 text-xs opacity-70">({count})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Saved Coupons Section */}
        {savedCoupons && savedCoupons.length > 0 && !searchQuery && !selectedPlatform && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Your Saved Coupons
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {savedCoupons.slice(0, 3).map((coupon) => (
                <CouponCard
                  key={coupon._id}
                  coupon={coupon}
                  userId={dbUser?._id}
                  isSaved={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Main Coupons Grid */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            {searchQuery
              ? `Search Results`
              : selectedPlatform
              ? `${selectedPlatform} Coupons`
              : "Active Coupons"}
          </h2>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
                />
              ))}
            </div>
          ) : displayCoupons && displayCoupons.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayCoupons.map((coupon) => (
                <CouponCard
                  key={coupon._id}
                  coupon={coupon}
                  userId={dbUser?._id}
                  isSaved={savedCoupons?.some((s) => s._id === coupon._id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <svg
                  className="h-8 w-8 text-zinc-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-medium text-zinc-900 dark:text-white">
                No coupons found
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {searchQuery
                  ? "Try a different search term"
                  : "Check back later for new deals!"}
              </p>
            </div>
          )}
        </div>

        {/* Submit Coupon CTA */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-center text-white">
          <h3 className="mb-2 text-xl font-bold">Know a working coupon?</h3>
          <p className="mb-4 text-emerald-100">
            Help the community save money by sharing coupons you&apos;ve found!
          </p>
          <button
            className="rounded-lg bg-white px-6 py-2.5 font-medium text-emerald-600 transition-colors hover:bg-emerald-50"
            onClick={() => {
              // TODO: Open submit coupon modal
              alert("Submit coupon feature coming soon!");
            }}
          >
            Submit a Coupon
          </button>
        </div>
      </main>
    </div>
  );
}
