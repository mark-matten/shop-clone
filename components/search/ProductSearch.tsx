"use client";

import { useState } from "react";
import { useAction, useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { SearchBar } from "./SearchBar";
import { ProductCard } from "./ProductCard";
import { ProductGridSkeleton } from "./ProductCardSkeleton";
import { SearchFilters } from "./SearchFilters";
import { FilterDropdown, FilterState } from "./FilterSidebar";
import { ViewToggle, ProductListItem } from "./ViewToggle";
import { RecentlyViewed, useRecentlyViewed } from "./RecentlyViewed";
import { Id } from "@/convex/_generated/dataModel";

interface Product {
  _id: string;
  name: string;
  description: string;
  brand: string;
  price: number;
  material?: string;
  size?: string;
  category: string;
  gender?: "men" | "women" | "unisex";
  condition: "new" | "used" | "like_new";
  sourceUrl: string;
  sourcePlatform: string;
  imageUrl?: string;
}

interface SearchFilter {
  query: string;
  gender?: "men" | "women" | "unisex";
  category?: string;
  brand?: string;
  material?: string;
  size?: string;
  condition?: "new" | "used" | "like_new";
  minPrice?: number;
  maxPrice?: number;
}

interface SearchResult {
  products: Product[];
  filter: SearchFilter;
  totalResults: number;
}

// Size ordering for comparison
const SHOE_SIZES = ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "12.5", "13", "14", "15"];
const CLOTHING_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
const NUMERIC_SIZES = ["0", "2", "4", "6", "8", "10", "12", "14", "16", "18", "20"];

function isSizeInRange(productSize: string, minSize: string | undefined, maxSize: string | undefined, sizeScale: string[]): boolean {
  if (!minSize && !maxSize) return true;

  const normalizedProductSize = productSize.toUpperCase().trim();
  const productIndex = sizeScale.findIndex(s => normalizedProductSize.includes(s.toUpperCase()));
  if (productIndex === -1) return true; // Can't determine, include it

  const minIndex = minSize ? sizeScale.findIndex(s => s.toUpperCase() === minSize.toUpperCase()) : -1;
  const maxIndex = maxSize ? sizeScale.findIndex(s => s.toUpperCase() === maxSize.toUpperCase()) : sizeScale.length;

  return productIndex >= (minIndex >= 0 ? minIndex : 0) && productIndex <= (maxIndex >= 0 ? maxIndex : sizeScale.length - 1);
}

export function ProductSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sidebarFilters, setSidebarFilters] = useState<FilterState | null>(null);
  const [showMySizesOnly, setShowMySizesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"relevance" | "price_low" | "price_high" | "newest">("relevance");
  const [displayCount, setDisplayCount] = useState(20);
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [currentSearchQuery, setCurrentSearchQuery] = useState("");
  const [showSavedSearchesDropdown, setShowSavedSearchesDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { user: clerkUser } = useUser();
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  const searchProducts = useAction(api.search.searchProducts);

  // Fetch user's favorites for showing heart state
  const favoriteIds = useQuery(
    api.favorites.getFavoriteIds,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Search history
  const saveSearch = useMutation(api.searchHistory.saveSearch);
  const recentSearches = useQuery(
    api.searchHistory.getRecentSearches,
    clerkUser?.id ? { clerkId: clerkUser.id, limit: 5 } : "skip"
  );
  const suggestedSearches = useQuery(
    api.searchHistory.getSuggestedSearches,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Saved searches
  const savedSearches = useQuery(
    api.savedSearches.getSavedSearches,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );
  const saveSearchMutation = useMutation(api.savedSearches.saveSearch);
  const deleteSavedSearch = useMutation(api.savedSearches.deleteSavedSearch);

  const applyFilters = (products: Product[], filters: FilterState | null): Product[] => {
    let filtered = products;

    // Apply sidebar filters
    if (filters) {
      filtered = filtered.filter((product) => {
        // Price filter
        if (filters.priceMin && product.price < parseFloat(filters.priceMin)) return false;
        if (filters.priceMax && product.price > parseFloat(filters.priceMax)) return false;

        // Brand filter
        if (filters.brands.length > 0 && !filters.brands.includes(product.brand)) return false;

        // Condition filter
        if (filters.conditions.length > 0 && !filters.conditions.includes(product.condition)) return false;

        // Size filter
        if (filters.sizes.length > 0 && product.size && !filters.sizes.includes(product.size)) return false;

        // Platform filter
        if (filters.platforms.length > 0 && !filters.platforms.includes(product.sourcePlatform)) return false;

        return true;
      });
    }

    // Apply "My sizes only" filter
    if (showMySizesOnly && convexUser?.preferences && products.length > 0) {
      const prefs = convexUser.preferences;
      filtered = filtered.filter((product) => {
        if (!product.size) return true; // No size info, include it

        const category = product.category.toLowerCase();
        const gender = product.gender;
        const size = product.size;

        // Determine which size preferences to use based on product gender/category
        if (gender === "women" || (!gender && prefs.shopsWomen)) {
          if (category.includes("shoe") || category.includes("boot") || category.includes("sneaker") || category.includes("sandal") || category.includes("heel") || category.includes("loafer")) {
            return isSizeInRange(size, prefs.womenShoeSizeMin, prefs.womenShoeSizeMax, SHOE_SIZES);
          }
          if (category.includes("dress")) {
            return isSizeInRange(size, prefs.womenDressSizeMin, prefs.womenDressSizeMax, NUMERIC_SIZES) ||
                   isSizeInRange(size, prefs.womenDressSizeMin, prefs.womenDressSizeMax, CLOTHING_SIZES);
          }
          if (category.includes("top") || category.includes("shirt") || category.includes("blouse") || category.includes("sweater")) {
            return isSizeInRange(size, prefs.womenTopSizeMin, prefs.womenTopSizeMax, CLOTHING_SIZES);
          }
          if (category.includes("pant") || category.includes("jean") || category.includes("short") || category.includes("skirt")) {
            return isSizeInRange(size, prefs.womenBottomSizeMin, prefs.womenBottomSizeMax, NUMERIC_SIZES) ||
                   isSizeInRange(size, prefs.womenBottomSizeMin, prefs.womenBottomSizeMax, CLOTHING_SIZES);
          }
        }

        if (gender === "men" || (!gender && prefs.shopsMen)) {
          if (category.includes("shoe") || category.includes("boot") || category.includes("sneaker")) {
            return isSizeInRange(size, prefs.menShoeSizeMin, prefs.menShoeSizeMax, SHOE_SIZES);
          }
          if (category.includes("top") || category.includes("shirt") || category.includes("sweater")) {
            return isSizeInRange(size, prefs.menTopSizeMin, prefs.menTopSizeMax, CLOTHING_SIZES);
          }
          if (category.includes("pant") || category.includes("jean") || category.includes("short")) {
            return isSizeInRange(size, prefs.menBottomSizeMin, prefs.menBottomSizeMax, NUMERIC_SIZES) ||
                   isSizeInRange(size, prefs.menBottomSizeMin, prefs.menBottomSizeMax, CLOTHING_SIZES);
          }
        }

        return true; // No matching category, include it
      });
    }

    return filtered;
  };

  const handleApplyFilters = (filters: FilterState) => {
    setSidebarFilters(filters);
    setShowFilters(false);
  };

  const sortProducts = (products: Product[]): Product[] => {
    const sorted = [...products];
    switch (sortBy) {
      case "price_low":
        return sorted.sort((a, b) => a.price - b.price);
      case "price_high":
        return sorted.sort((a, b) => b.price - a.price);
      case "newest":
        // Sort by _id as a proxy for newest (Convex IDs are time-based)
        return sorted.sort((a, b) => b._id.localeCompare(a._id));
      case "relevance":
      default:
        return sorted; // Keep original order from search
    }
  };

  const getFilteredAndSortedProducts = (): Product[] => {
    if (!searchResult) return [];
    const filtered = applyFilters(searchResult.products, sidebarFilters);
    return sortProducts(filtered);
  };

  const handleSaveSearch = async () => {
    if (!convexUser?._id || !currentSearchQuery.trim() || !saveSearchName.trim()) return;

    try {
      await saveSearchMutation({
        userId: convexUser._id,
        name: saveSearchName.trim(),
        query: currentSearchQuery.trim(),
        filters: sidebarFilters ? {
          brands: sidebarFilters.brands,
          conditions: sidebarFilters.conditions,
          priceMin: sidebarFilters.priceMin || undefined,
          priceMax: sidebarFilters.priceMax || undefined,
          sizes: sidebarFilters.sizes,
          platforms: sidebarFilters.platforms,
        } : undefined,
      });
      setShowSaveSearchModal(false);
      setSaveSearchName("");
    } catch (err) {
      console.error("Failed to save search:", err);
    }
  };

  const handleLoadSavedSearch = (search: NonNullable<typeof savedSearches>[0]) => {
    setShowSavedSearchesDropdown(false);
    // Apply the saved filters if any
    if (search.filters) {
      setSidebarFilters({
        brands: search.filters.brands || [],
        conditions: search.filters.conditions || [],
        priceMin: search.filters.priceMin || "",
        priceMax: search.filters.priceMax || "",
        sizes: search.filters.sizes || [],
        platforms: search.filters.platforms || [],
      });
    }
    // Run the search
    handleSearch(search.query);
  };

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setDisplayCount(20); // Reset pagination
    setCurrentSearchQuery(query); // Track current query

    try {
      const result = await searchProducts({ searchText: query });
      setSearchResult({
        products: result.products.map((p) => ({ ...p, _id: p._id.toString() })) as Product[],
        filter: result.filter as SearchFilter,
        totalResults: result.totalResults,
      });

      // Save to search history
      if (clerkUser?.id) {
        saveSearch({
          clerkId: clerkUser.id,
          query,
          resultCount: result.totalResults,
        });
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search products. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mx-auto max-w-2xl">
        <SearchBar
          onSearch={handleSearch}
          isLoading={isLoading}
          placeholder="Describe what you're looking for..."
        />
      </div>

      {error && (
        <div className="mx-auto mt-8 max-w-2xl rounded-lg bg-red-50 p-4 text-center text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading && hasSearched && (
        <div className="mt-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-10 w-24 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
          <ProductGridSkeleton count={6} />
        </div>
      )}

      {!isLoading && searchResult && (
        <div className="mt-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    showFilters || (sidebarFilters && (sidebarFilters.brands.length > 0 || sidebarFilters.conditions.length > 0 || sidebarFilters.sizes.length > 0 || sidebarFilters.platforms.length > 0 || sidebarFilters.priceMin || sidebarFilters.priceMax))
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters
                  {sidebarFilters && (sidebarFilters.brands.length + sidebarFilters.conditions.length + sidebarFilters.sizes.length + sidebarFilters.platforms.length + (sidebarFilters.priceMin ? 1 : 0) + (sidebarFilters.priceMax ? 1 : 0)) > 0 && (
                    <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-xs text-zinc-900 dark:bg-zinc-900 dark:text-white">
                      {sidebarFilters.brands.length + sidebarFilters.conditions.length + sidebarFilters.sizes.length + sidebarFilters.platforms.length + (sidebarFilters.priceMin ? 1 : 0) + (sidebarFilters.priceMax ? 1 : 0)}
                    </span>
                  )}
                </button>
              {clerkUser && convexUser?.preferences && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showMySizesOnly}
                    onChange={(e) => setShowMySizesOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800"
                  />
                  <span className="text-zinc-600 dark:text-zinc-400">My sizes only</span>
                </label>
              )}
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Found{" "}
                <span className="font-medium text-zinc-900 dark:text-white">
                  {getFilteredAndSortedProducts().length}
                </span>{" "}
                {getFilteredAndSortedProducts().length === 1 ? "product" : "products"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SearchFilters filter={searchResult.filter} />

              {/* Saved Searches Dropdown */}
              {clerkUser && savedSearches && savedSearches.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowSavedSearchesDropdown(!showSavedSearchesDropdown)}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Saved
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showSavedSearchesDropdown && (
                    <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                      <div className="max-h-64 overflow-y-auto p-2">
                        {savedSearches.map((search) => (
                          <div
                            key={search._id}
                            className="group flex items-center justify-between rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          >
                            <button
                              onClick={() => handleLoadSavedSearch(search)}
                              className="flex-1 text-left"
                            >
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                {search.name}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                {search.query}
                              </p>
                            </button>
                            <button
                              onClick={() => deleteSavedSearch({ searchId: search._id, userId: convexUser!._id })}
                              className="ml-2 p-1 text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Save Search Button */}
              {clerkUser && currentSearchQuery && (
                <button
                  onClick={() => {
                    setSaveSearchName(currentSearchQuery);
                    setShowSaveSearchModal(true);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  title="Save this search"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Save
                </button>
              )}

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="newest">Newest First</option>
              </select>

              <ViewToggle view={viewMode} onViewChange={setViewMode} />
            </div>
          </div>

          <FilterDropdown
            isOpen={showFilters}
            onClose={() => setShowFilters(false)}
            onApply={handleApplyFilters}
            initialFilters={sidebarFilters || undefined}
          />

          {(() => {
            const allProducts = getFilteredAndSortedProducts();
            const displayedProducts = allProducts.slice(0, displayCount);
            const hasMore = allProducts.length > displayCount;

            return allProducts.length > 0 ? (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {displayedProducts.map((product) => (
                      <ProductCard
                        key={product._id}
                        product={product}
                        isFavorited={favoriteIds?.includes(product._id as any) ?? false}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayedProducts.map((product) => (
                      <ProductListItem
                        key={product._id}
                        product={product}
                        isFavorited={favoriteIds?.includes(product._id as any) ?? false}
                      />
                    ))}
                  </div>
                )}
                {hasMore && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={() => setDisplayCount((prev) => prev + 20)}
                      className="rounded-lg border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      Load More ({allProducts.length - displayCount} remaining)
                    </button>
                  </div>
                )}
              </>
            ) : (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <svg
                className="mx-auto h-12 w-12 text-zinc-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                No products found matching your filters.
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                Try adjusting your filters.
              </p>
            </div>
            );
          })()}
        </div>
      )}

      
      {!hasSearched && (
        <div className="mt-6">
          {/* Recent Searches */}
          {recentSearches && recentSearches.length > 0 && (
            <div className="mx-auto max-w-2xl">
              <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Recent Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search) => (
                  <button
                    key={search._id}
                    onClick={() => handleSearch(search.query)}
                    className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {search.query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Searches - combines suggested and examples */}
          <div className="mx-auto mt-6 max-w-2xl">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Popular Searches
              </h3>
              <span className="text-zinc-300 dark:text-zinc-600">|</span>
              <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-400"></span>
                For you
              </span>
              <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                <span className="inline-block h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                Trending
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* User's suggested searches based on preferences */}
              {suggestedSearches?.slice(0, 4).map((suggestion, i) => (
                <button
                  key={`suggested-${i}`}
                  onClick={() => handleSearch(suggestion)}
                  className="group flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:border-indigo-700"
                  title="Based on your preferences"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {suggestion}
                </button>
              ))}
              {/* Trending searches */}
              {[
                "vintage Levi's denim jacket size M",
                "women's running shoes under $150",
                "used Gucci handbag like new condition",
                "men's cashmere sweater navy blue XL",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => handleSearch(example)}
                  className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600"
                  title="Trending search"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recently Viewed */}
      <RecentlyViewed />

      {/* Save Search Modal */}
      {showSaveSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Save this search
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Give your search a name to quickly access it later.
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Search Name
              </label>
              <input
                type="text"
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                placeholder="e.g., Winter jacket deals"
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white py-2 px-3 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            <div className="mt-3 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Search query:</p>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">&quot;{currentSearchQuery}&quot;</p>
              {sidebarFilters && (sidebarFilters.brands.length > 0 || sidebarFilters.conditions.length > 0 || sidebarFilters.priceMin || sidebarFilters.priceMax) && (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  + filters will be saved
                </p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowSaveSearchModal(false);
                  setSaveSearchName("");
                }}
                className="flex-1 rounded-lg border border-zinc-300 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSearch}
                disabled={!saveSearchName.trim()}
                className="flex-1 rounded-lg bg-zinc-900 py-2 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Save Search
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
