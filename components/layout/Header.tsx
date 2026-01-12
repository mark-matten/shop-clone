"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { NotificationCenter, NotificationBadge } from "@/components/social/NotificationCenter";

// Keys for sessionStorage
const SEARCH_CONTEXT_KEY = "armoi_search_context";
const SCROLL_POSITION_KEY = "armoi_scroll_position";

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { user: clerkUser } = useUser();

  // Avoid hydration mismatch by only showing theme toggle after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track search context (search page with query only - not product pages)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = searchParams.get("q");
    const isSearchPage = pathname === "/" && query;
    const isHomePage = pathname === "/" && !query;

    if (isSearchPage) {
      // Save search URL as search context (only for search pages, not product pages)
      const currentUrl = `/?q=${encodeURIComponent(query)}`;
      sessionStorage.setItem(SEARCH_CONTEXT_KEY, currentUrl);
    } else if (isHomePage) {
      // Clear context when on fresh home page (no search)
      sessionStorage.removeItem(SEARCH_CONTEXT_KEY);
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

  // Handle search icon click - navigate to saved search context if available
  const handleSearchClick = useCallback((e: React.MouseEvent) => {
    if (typeof window === "undefined") return;

    const query = searchParams.get("q");
    const isSearchHomepage = pathname === "/" && !query;
    const isSearchPage = pathname === "/" && query;

    // If we're on the search homepage (no query), just refresh the page
    if (isSearchHomepage) {
      e.preventDefault();
      router.refresh();
      return;
    }

    // If we're on a search results page, just let the Link navigate to "/" normally
    if (isSearchPage) {
      // Clear context so we go to fresh homepage
      sessionStorage.removeItem(SEARCH_CONTEXT_KEY);
      sessionStorage.removeItem(SCROLL_POSITION_KEY);
      return;
    }

    // If we're on any other page (product, closet, profile, etc.),
    // try to restore saved search context (only search URLs, not product URLs)
    const savedContext = sessionStorage.getItem(SEARCH_CONTEXT_KEY);
    if (savedContext && savedContext.includes("?q=")) {
      e.preventDefault();
      router.push(savedContext);
      return;
    }

    // No saved context, let the Link navigate to "/" normally (fresh homepage)
  }, [pathname, searchParams, router]);

  return (
    <header className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={(e) => {
            // Always go to fresh homepage - clear search context
            if (typeof window !== "undefined") {
              sessionStorage.removeItem(SEARCH_CONTEXT_KEY);
              sessionStorage.removeItem(SCROLL_POSITION_KEY);
            }
          }}
          className="ml-2 -mt-1"
        >
          <span className="font-[family-name:var(--font-pacifico)] text-2xl">
            <span style={{ color: '#942010' }}>ar</span>
            <span style={{ color: '#C2311D' }}>moi</span>
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
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8a2 2 0 100-4 2 2 0 000 4zM12 8v2m0 0l-8 6h16l-8-6z" />
            </svg>
          </Link>
          {/* Mobile Notifications */}
          {clerkUser?.id && (
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              title="Notifications"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <NotificationBadge clerkId={clerkUser.id} />
            </button>
          )}
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
          {clerkUser?.id && (
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
              <NotificationBadge clerkId={clerkUser.id} />
            </button>
          )}

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

      {/* NotificationCenter Panel */}
      {clerkUser?.id && (
        <NotificationCenter
          clerkId={clerkUser.id}
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </header>
  );
}
