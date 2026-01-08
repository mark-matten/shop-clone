"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Keys for sessionStorage
const SEARCH_CONTEXT_KEY = "armoi_search_context";
const SCROLL_POSITION_KEY = "armoi_scroll_position";

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { user: clerkUser } = useUser();

  // Get user from Convex
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Get alerts from Convex
  const userAlerts = useQuery(
    api.alerts.getUserAlerts,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  // Mark all alerts as read mutation
  const markAllRead = useMutation(api.alerts.markAllAlertsRead);

  // Transform alerts to match expected format
  const alerts = userAlerts?.map((alert) => ({
    _id: alert._id,
    productName: alert.product?.name || "Unknown Product",
    previousPrice: alert.previousPrice,
    newPrice: alert.newPrice,
    alertType: alert.alertType,
    createdAt: alert.createdAt,
    sentAt: alert.sentAt,
  })) || [];

  // Avoid hydration mismatch by only showing theme toggle after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track search context (search page with query or product page)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = searchParams.get("q");
    const isSearchPage = pathname === "/" && query;
    const isProductPage = pathname.startsWith("/product/");
    const isHomePage = pathname === "/" && !query;

    if (isSearchPage || isProductPage) {
      // Save current URL as search context
      const currentUrl = isSearchPage
        ? `/?q=${encodeURIComponent(query)}`
        : pathname;
      sessionStorage.setItem(SEARCH_CONTEXT_KEY, currentUrl);
    } else if (isHomePage) {
      // Clear scroll position when on fresh home page (no search)
      // but keep search context so user can get back to it
      sessionStorage.removeItem(SCROLL_POSITION_KEY);
    }
  }, [pathname, searchParams]);

  // Save scroll position when leaving search page
  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = searchParams.get("q");
    const isSearchPage = pathname === "/" && query;

    if (isSearchPage) {
      // Save scroll position on scroll
      const handleScroll = () => {
        sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString());
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [pathname, searchParams]);

  // Restore scroll position when returning to search page
  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = searchParams.get("q");
    const isSearchPage = pathname === "/" && query;

    if (isSearchPage) {
      // Small delay to allow content to render
      const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
      if (savedPosition) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedPosition, 10));
        }, 100);
      }
    }
  }, [pathname, searchParams]);

  // Handle search icon click - navigate to saved context or home, but refresh if already on search homepage
  const handleSearchClick = useCallback((e: React.MouseEvent) => {
    if (typeof window === "undefined") return;

    const query = searchParams.get("q");
    const isSearchHomepage = pathname === "/" && !query;

    // If we're on the search homepage (no query), just refresh the page
    if (isSearchHomepage) {
      e.preventDefault();
      router.refresh();
      return;
    }

    const savedContext = sessionStorage.getItem(SEARCH_CONTEXT_KEY);
    const currentPath = pathname + (query ? `?q=${query}` : "");

    // If we have a saved context and we're not already there, navigate to it
    if (savedContext && savedContext !== currentPath && savedContext !== "/") {
      e.preventDefault();
      router.push(savedContext);
    }
    // Otherwise, the Link will navigate to "/" normally
  }, [pathname, searchParams, router]);

  const unreadCount = alerts.filter((a) => !a.sentAt).length;

  const handleMarkAllRead = async () => {
    if (!convexUser?._id) return;
    try {
      await markAllRead({ userId: convexUser._id });
    } catch (error) {
      console.error("Failed to mark alerts as read:", error);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <header className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" onClick={handleSearchClick} className="ml-2 -mt-1">
          <span className="font-[family-name:var(--font-pacifico)] text-2xl">
            <span style={{ color: '#C2311D' }}>ar</span>
            <span style={{ color: '#942010' }}>moi</span>
          </span>
        </Link>

        {/* Mobile navigation - inline icons */}
        <nav className="flex items-center gap-1 sm:hidden">
          <Link
            href="/"
            onClick={handleSearchClick}
            className={`rounded-lg p-2 transition-colors ${
              pathname === "/"
                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            }`}
            title="Search"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>
          <Link
            href="/closet"
            className={`rounded-lg p-2 transition-colors ${
              pathname === "/closet"
                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            }`}
            title="My Closet"
          >
            <svg className="h-6 w-6 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8a2 2 0 100-4 2 2 0 000 4zM12 8v2m0 0l-8 6h16l-8-6z" />
            </svg>
          </Link>
          <Link
            href="/profile"
            className={`rounded-lg p-2 transition-colors ${
              pathname === "/profile"
                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            }`}
            title="Profile"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
        </nav>

        <nav className="hidden items-center gap-2 sm:flex">
          <Link
            href="/"
            onClick={handleSearchClick}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              pathname === "/"
                ? "bg-zinc-200 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            }`}
          >
            Search
          </Link>
          {/* Hidden for now - Compare and Favorites moved to My Closet
          <Link
            href="/compare"
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              pathname === "/compare"
                ? "bg-zinc-200 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            }`}
          >
            Compare
          </Link>
          <Link
            href="/favorites"
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              pathname === "/favorites"
                ? "bg-zinc-200 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            }`}
          >
            Favorites
          </Link>
          */}
          <Link
            href="/closet"
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              pathname === "/closet"
                ? "bg-zinc-200 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            }`}
          >
            My Closet
          </Link>
          {/* Hidden for now
          <Link
            href="/dashboard"
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              pathname === "/dashboard"
                ? "bg-zinc-200 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/tools"
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              pathname === "/tools"
                ? "bg-zinc-200 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            }`}
          >
            Tools
          </Link>
          */}
          {/* Deals link - hidden for now
          <Link
            href="/coupons"
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              pathname === "/coupons"
                ? "bg-zinc-200 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            }`}
          >
            Deals
          </Link>
          */}

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      No notifications
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert._id}
                        className={`flex gap-3 border-b border-zinc-100 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 ${
                          !alert.sentAt
                            ? "bg-blue-50/50 dark:bg-blue-950/20"
                            : ""
                        }`}
                      >
                        <div
                          className={`mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                            alert.alertType === "target_reached"
                              ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                        >
                          {alert.alertType === "target_reached" ? (
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                            {alert.productName}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {alert.alertType === "target_reached" ? "Hit target price!" : "Price dropped"}{" "}
                            <span className="text-green-600 dark:text-green-400">
                              ${alert.newPrice.toFixed(2)}
                            </span>{" "}
                            <span className="text-zinc-400 line-through">${alert.previousPrice.toFixed(2)}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">{formatTimeAgo(alert.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button
                  className="block w-full border-t border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  onClick={() => {
                    setShowNotifications(false);
                    setShowAllNotifications(true);
                  }}
                >
                  View all alerts
                </button>
              </div>
            )}
          </div>

          {/* My Profile Link */}
          <Link
            href="/profile"
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              pathname === "/profile"
                ? "bg-zinc-200 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white"
                : "font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            }`}
          >
            My Profile
          </Link>
        </nav>
      </div>

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}

      {/* All Notifications Modal */}
      {showAllNotifications && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowAllNotifications(false)}
          />
          <div className="fixed inset-4 z-50 mx-auto max-w-2xl sm:inset-8 md:inset-12 lg:inset-16">
            <div className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">All Notifications</h2>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowAllNotifications(false)}
                    className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-zinc-900 dark:text-white">No notifications yet</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Track items to get price drop alerts
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {alerts.map((alert) => (
                      <div
                        key={alert._id}
                        className={`flex gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                          !alert.sentAt ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        <div
                          className={`mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                            alert.alertType === "target_reached"
                              ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                        >
                          {alert.alertType === "target_reached" ? (
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-zinc-900 dark:text-white">
                            {alert.productName}
                          </p>
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {alert.alertType === "target_reached" ? "Hit your target price!" : "Price dropped"}{" "}
                            <span className="font-medium text-green-600 dark:text-green-400">
                              ${alert.newPrice.toFixed(2)}
                            </span>{" "}
                            <span className="text-zinc-400 line-through">${alert.previousPrice.toFixed(2)}</span>
                            <span className="ml-2 text-zinc-400">
                              (saved ${(alert.previousPrice - alert.newPrice).toFixed(2)})
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">{formatTimeAgo(alert.createdAt)}</p>
                        </div>
                        {!alert.sentAt && (
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              New
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
