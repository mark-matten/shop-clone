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

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

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
                  {applyFilters(searchResult.products, sidebarFilters).length}
                </span>{" "}
                {applyFilters(searchResult.products, sidebarFilters).length === 1 ? "product" : "products"}
              </p>
            </div>
            <SearchFilters filter={searchResult.filter} />
          </div>

          <FilterDropdown
            isOpen={showFilters}
            onClose={() => setShowFilters(false)}
            onApply={handleApplyFilters}
            initialFilters={sidebarFilters || undefined}
          />

          {applyFilters(searchResult.products, sidebarFilters).length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {applyFilters(searchResult.products, sidebarFilters).map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  isFavorited={favoriteIds?.includes(product._id as any) ?? false}
                />
              ))}
            </div>
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
          )}
        </div>
      )}

      
      {!hasSearched && (
        <div className="mt-16 text-center">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
            Natural Language Search
          </h2>
          <p className="mx-auto mt-2 max-w-md text-zinc-500 dark:text-zinc-400">
            Search using everyday language. Describe the style, size, price
            range, or any other details you&apos;re looking for.
          </p>

          {/* Recent Searches */}
          {recentSearches && recentSearches.length > 0 && (
            <div className="mx-auto mt-8 max-w-lg">
              <h3 className="mb-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
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

          {/* Suggested Searches */}
          {suggestedSearches && suggestedSearches.length > 0 && (
            <div className="mx-auto mt-6 max-w-lg">
              <h3 className="mb-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Suggested for You
              </h3>
              <div className="flex flex-wrap gap-2">
                {suggestedSearches.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(suggestion)}
                    className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:border-blue-700"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Example Searches */}
          <div className="mx-auto mt-6 grid max-w-lg gap-3 text-left">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Try these examples
            </h3>
            {[
              "vintage Levi's denim jacket size M",
              "women's running shoes under $150",
              "used Gucci handbag like new condition",
              "men's cashmere sweater navy blue XL",
            ].map((example) => (
              <button
                key={example}
                onClick={() => handleSearch(example)}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
              >
                &quot;{example}&quot;
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
