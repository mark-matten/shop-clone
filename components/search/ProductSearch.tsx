"use client";

import { useState } from "react";
import { SearchBar } from "./SearchBar";
import { ProductCard } from "./ProductCard";
import { SearchFilters } from "./SearchFilters";
import { FilterSidebar, FilterState } from "./FilterSidebar";
import { mockSearch } from "@/lib/mockData";

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

export function ProductSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sidebarFilters, setSidebarFilters] = useState<FilterState | null>(null);

  const applyFilters = (products: Product[], filters: FilterState | null): Product[] => {
    if (!filters) return products;

    return products.filter((product) => {
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
  };

  const handleFilterChange = (filters: FilterState) => {
    setSidebarFilters(filters);
  };

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      const result = mockSearch(query);
      setSearchResult(result as SearchResult);
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

      {searchResult && (
        <div className="mt-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </button>
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

          {applyFilters(searchResult.products, sidebarFilters).length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {applyFilters(searchResult.products, sidebarFilters).map((product) => (
                <ProductCard key={product._id} product={product} />
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

      <FilterSidebar
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onFilterChange={handleFilterChange}
      />

      {!hasSearched && (
        <div className="mt-16 text-center">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
            Natural Language Search
          </h2>
          <p className="mx-auto mt-2 max-w-md text-zinc-500 dark:text-zinc-400">
            Search using everyday language. Describe the style, size, price
            range, or any other details you&apos;re looking for.
          </p>
          <div className="mx-auto mt-6 grid max-w-lg gap-3 text-left">
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
