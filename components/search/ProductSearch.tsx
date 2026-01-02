"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  originalPrice?: number;
  material?: string;
  size?: string;
  sizes?: string[];
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
  color?: string;
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

// Category synonyms for client-side filtering (mirrors backend)
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  shoe: ["boots", "sneakers", "sandals", "heels", "loafers", "shoes", "shoe"],
  shoes: ["boots", "sneakers", "sandals", "heels", "loafers", "shoe", "shoes"],
  footwear: ["boots", "sneakers", "sandals", "heels", "loafers", "shoes", "shoe"],
  boot: ["boots", "boot"],
  boots: ["boots", "boot"],
  sneaker: ["sneakers", "sneaker"],
  sneakers: ["sneakers", "sneaker"],
  sandal: ["sandals", "sandal"],
  sandals: ["sandals", "sandal"],
  heel: ["heels", "heel", "pumps"],
  heels: ["heels", "heel", "pumps"],
  loafer: ["loafers", "loafer"],
  loafers: ["loafers", "loafer"],
  flat: ["flats", "flat"],
  flats: ["flats", "flat"],
  top: ["shirt", "blouse", "t-shirt", "sweater", "cardigan", "top", "tops", "clothing"],
  tops: ["shirt", "blouse", "t-shirt", "sweater", "cardigan", "top", "tops", "clothing"],
  shirt: ["tops", "top", "shirt", "blouse", "t-shirt", "clothing"],
  shirts: ["tops", "top", "shirt", "blouse", "t-shirt", "clothing"],
  tee: ["tops", "top", "t-shirt", "shirt", "clothing"],
  blouse: ["tops", "top", "blouse", "shirt", "clothing"],
  outerwear: ["jacket", "coat", "blazer"],
  coats: ["coat", "jacket"],
  jackets: ["jacket", "coat", "blazer"],
  bottom: ["pants", "jeans", "shorts", "skirt"],
  bottoms: ["pants", "jeans", "shorts", "skirt"],
  bags: ["bag", "purse", "handbag"],
  purse: ["bag", "handbag", "purse"],
  handbag: ["bag", "purse", "handbag"],
  dresses: ["dress"],
  dress: ["dress", "dresses"],
};

// Specific footwear/clothing types that should also check product name
const SPECIFIC_CATEGORY_KEYWORDS: Record<string, string[]> = {
  boots: ["boot", "bootie"],
  boot: ["boot", "bootie"],
  sneakers: ["sneaker", "trainer"],
  sneaker: ["sneaker", "trainer"],
  sandals: ["sandal"],
  sandal: ["sandal"],
  heels: ["heel", "pump", "stiletto"],
  heel: ["heel", "pump", "stiletto"],
  loafers: ["loafer", "moccasin"],
  loafer: ["loafer", "moccasin"],
  flats: ["flat", "ballet"],
  flat: ["flat", "ballet"],
  cardigans: ["cardigan"],
  cardigan: ["cardigan"],
  hoodies: ["hoodie"],
  hoodie: ["hoodie"],
  blazers: ["blazer"],
  blazer: ["blazer"],
  coats: ["coat", "overcoat", "trench"],
  coat: ["coat", "overcoat", "trench"],
  jackets: ["jacket"],
  jacket: ["jacket"],
  jeans: ["jean", "denim"],
  totes: ["tote"],
  tote: ["tote"],
  backpacks: ["backpack", "rucksack"],
  backpack: ["backpack", "rucksack"],
};

function categoryMatches(productCategory: string, filterCategory: string, productName?: string): boolean {
  const productCatLower = productCategory.toLowerCase();
  const filterCatLower = filterCategory.toLowerCase();

  // Direct match
  if (productCatLower.includes(filterCatLower) || filterCatLower.includes(productCatLower)) {
    return true;
  }

  // Check synonyms
  const synonyms = CATEGORY_SYNONYMS[filterCatLower];
  if (synonyms) {
    if (synonyms.some(syn => productCatLower.includes(syn) || syn.includes(productCatLower))) {
      return true;
    }
  }

  // For specific category types (boots, sneakers, etc.), also check the product name
  // This handles cases where category is "shoes" but the product name is "The Chelsea Boot"
  const keywords = SPECIFIC_CATEGORY_KEYWORDS[filterCatLower];
  if (keywords && productName) {
    const nameLower = productName.toLowerCase();
    if (keywords.some(kw => nameLower.includes(kw))) {
      return true;
    }
  }

  return false;
}

const SEARCH_STATE_KEY = "shopwatch_search_state";

// Remove filter-related text from search query
function removeFilterTextFromQuery(query: string, filterKey: string, filterValue: unknown): string {
  let cleanedQuery = query;

  switch (filterKey) {
    case "maxPrice":
      // Remove "under $X", "under X", "below $X", "less than $X", "max $X"
      cleanedQuery = cleanedQuery.replace(/\s*(under|below|less than|max|maximum)\s*\$?\d+/gi, "");
      break;
    case "minPrice":
      // Remove "over $X", "above $X", "more than $X", "min $X"
      cleanedQuery = cleanedQuery.replace(/\s*(over|above|more than|min|minimum)\s*\$?\d+/gi, "");
      break;
    case "gender":
      // Remove "men's", "mens", "women's", "womens", "men", "women", "unisex"
      cleanedQuery = cleanedQuery.replace(/\b(women'?s?|men'?s?|unisex)\b/gi, "");
      break;
    case "category":
      // Remove the category word and common variations
      if (typeof filterValue === "string") {
        const val = filterValue.toLowerCase();
        // Handle singular/plural variations
        const variations = [val];
        if (val.endsWith("s")) {
          variations.push(val.slice(0, -1)); // shoes -> shoe
        } else {
          variations.push(val + "s"); // shoe -> shoes
        }
        // Also handle special cases
        if (val === "boots" || val === "boot") {
          variations.push("boots", "boot");
        }
        if (val === "sneakers" || val === "sneaker") {
          variations.push("sneakers", "sneaker");
        }
        for (const v of variations) {
          cleanedQuery = cleanedQuery.replace(new RegExp(`\\b${v}\\b`, "gi"), "");
        }
      }
      break;
    case "brand":
      // Remove the brand name
      if (typeof filterValue === "string") {
        const brandRegex = new RegExp(`\\b${filterValue}\\b`, "gi");
        cleanedQuery = cleanedQuery.replace(brandRegex, "");
      }
      break;
    case "condition":
      // Remove "new", "used", "like new"
      cleanedQuery = cleanedQuery.replace(/\b(like new|new|used)\b/gi, "");
      break;
    case "size":
      // Remove "size X" or just the size value
      if (typeof filterValue === "string") {
        cleanedQuery = cleanedQuery.replace(new RegExp(`\\bsize\\s*${filterValue}\\b`, "gi"), "");
        cleanedQuery = cleanedQuery.replace(new RegExp(`\\b${filterValue}\\b`, "gi"), "");
      }
      break;
    case "material":
      // Remove the material word (includes colors that Claude might parse as material)
      if (typeof filterValue === "string") {
        const materialRegex = new RegExp(`\\b${filterValue}\\b`, "gi");
        cleanedQuery = cleanedQuery.replace(materialRegex, "");
      }
      break;
    case "color":
      // Remove color words
      if (typeof filterValue === "string") {
        const colorRegex = new RegExp(`\\b${filterValue}\\b`, "gi");
        cleanedQuery = cleanedQuery.replace(colorRegex, "");
      }
      break;
    default:
      // For any unknown filter type, try to remove the value directly
      if (typeof filterValue === "string" && filterValue.length > 2) {
        const valueRegex = new RegExp(`\\b${filterValue}\\b`, "gi");
        cleanedQuery = cleanedQuery.replace(valueRegex, "");
      }
      break;
  }

  // Clean up extra whitespace
  return cleanedQuery.replace(/\s+/g, " ").trim();
}

export function ProductSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

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
  const [currentSearchQuery, setCurrentSearchQuery] = useState(initialQuery);
  const [showSavedSearchesDropdown, setShowSavedSearchesDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const lastRestoredQuery = useRef<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<SearchFilter | null>(null);
  const isRestoringFromUrl = useRef(false);
  const pendingScrollPosition = useRef<number | null>(null);

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
  const clearSearchHistory = useMutation(api.searchHistory.clearSearchHistory);
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

    // Apply "My sizes only" filter (includes gender filtering)
    if (showMySizesOnly && convexUser?.preferences && products.length > 0) {
      const prefs = convexUser.preferences;
      filtered = filtered.filter((product) => {
        const gender = product.gender;

        // Filter by gender based on user's shopping preferences
        const shopsWomen = prefs.shopsWomen ?? false;
        const shopsMen = prefs.shopsMen ?? false;

        // If user has gender preferences set, filter accordingly
        if (shopsWomen || shopsMen) {
          // Unisex products are always included if user shops either gender
          if (gender === "unisex") {
            // Include unisex
          } else if (gender === "women" && !shopsWomen) {
            return false; // User doesn't shop women's
          } else if (gender === "men" && !shopsMen) {
            return false; // User doesn't shop men's
          }
        }

        if (!product.size) return true; // No size info, include it

        const category = product.category.toLowerCase();
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

    let products = searchResult.products;

    // Apply the active filter (parsed search filter with any removed filters)
    const filterToApply = activeFilter || searchResult.filter;

    products = products.filter((product) => {
      // Gender filter
      if (filterToApply.gender) {
        if (filterToApply.gender === "men" && product.gender !== "men" && product.gender !== "unisex") return false;
        if (filterToApply.gender === "women" && product.gender !== "women" && product.gender !== "unisex") return false;
      }

      // Condition filter
      if (filterToApply.condition && product.condition !== filterToApply.condition) return false;

      // Category filter with synonym expansion (also checks product name for specific types)
      if (filterToApply.category && !categoryMatches(product.category, filterToApply.category, product.name)) return false;

      // Brand filter
      if (filterToApply.brand && !product.brand.toLowerCase().includes(filterToApply.brand.toLowerCase())) return false;

      // Material filter - exclude products without material when filtering by material
      if (filterToApply.material) {
        if (!product.material) return false;
        if (!product.material.toLowerCase().includes(filterToApply.material.toLowerCase())) return false;
      }

      // Size filter
      if (filterToApply.size && product.size && !product.size.toLowerCase().includes(filterToApply.size.toLowerCase())) return false;

      // Price filters
      if (filterToApply.minPrice !== undefined && product.price < filterToApply.minPrice) return false;
      if (filterToApply.maxPrice !== undefined && product.price > filterToApply.maxPrice) return false;

      return true;
    });

    const filtered = applyFilters(products, sidebarFilters);
    return sortProducts(filtered);
  };

  // Get the current filter to display (activeFilter takes precedence)
  const currentDisplayFilter = activeFilter || searchResult?.filter;

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

  const handleSearch = useCallback(async (query: string, updateUrl: boolean = true) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setDisplayCount(20); // Reset pagination
    setCurrentSearchQuery(query); // Track current query

    // Only reset filters for new user-initiated searches, not URL restoration
    if (updateUrl) {
      setActiveFilter(null);
      setSidebarFilters(null);
    }

    // Update URL with search query
    if (updateUrl) {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      router.replace(`/?${params.toString()}`, { scroll: false });
    }

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
      // Always reset this flag after search completes so saving can happen
      isRestoringFromUrl.current = false;
    }
  }, [searchParams, router, searchProducts, clerkUser?.id, saveSearch]);

  // Handle removing a filter from the parsed search results
  const handleRemoveFilter = useCallback(async (key: keyof SearchFilter) => {
    const currentFilter = activeFilter || searchResult?.filter;
    if (!currentFilter) return;

    // Get the value being removed for text cleanup
    const removedValue = currentFilter[key];

    // Build the new filter with the key removed
    const newFilter = { ...currentFilter };
    delete newFilter[key];

    // Update the search query text to remove the filter text
    const newQuery = removeFilterTextFromQuery(currentSearchQuery, key, removedValue);

    // Trigger a new search with the cleaned query
    if (newQuery.trim()) {
      setIsLoading(true);
      setCurrentSearchQuery(newQuery);

      // Update URL
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", newQuery);
      router.replace(`/?${params.toString()}`, { scroll: false });

      try {
        const result = await searchProducts({ searchText: newQuery });
        setSearchResult({
          products: result.products.map((p) => ({ ...p, _id: p._id.toString() })) as Product[],
          filter: result.filter as SearchFilter,
          totalResults: result.totalResults,
        });
        // Preserve the remaining filters (don't let LLM re-parse override them)
        // Merge the new search filter with our explicitly kept filters
        const mergedFilter = { ...result.filter, ...newFilter };
        // Remove the key we explicitly deleted
        delete mergedFilter[key];
        setActiveFilter(mergedFilter);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    } else {
      // If query is empty after removing filter, clear results
      setActiveFilter(null);
      setSearchResult(null);
      setCurrentSearchQuery("");
      setHasSearched(false);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("q");
      router.replace(`/?${params.toString()}`, { scroll: false });
    }
  }, [activeFilter, searchResult?.filter, currentSearchQuery, searchParams, router, searchProducts]);

  // Handle back navigation via pageshow event (fires when page is restored from bfcache)
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was restored from bfcache (back/forward navigation)
        const saved = sessionStorage.getItem(SEARCH_STATE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.scrollPosition) {
              // Scroll immediately since page is already rendered
              setTimeout(() => {
                window.scrollTo(0, parsed.scrollPosition);
              }, 50);
            }
          } catch (e) {}
        }
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // Restore search from URL when query changes (including on navigation back)
  // Also clear everything when navigating to "/" without a query
  useEffect(() => {
    if (initialQuery) {
      const isNewQuery = lastRestoredQuery.current !== initialQuery;
      const needsResults = !searchResult;

      // If it's a new query OR we don't have results (back navigation), try to restore
      if (isNewQuery || needsResults) {
        lastRestoredQuery.current = initialQuery;

        // Check if we have cached results for this query
        const saved = sessionStorage.getItem(SEARCH_STATE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.query === initialQuery && parsed.searchResult) {
              // Restore everything from cache without making API call
              setSearchResult(parsed.searchResult);
              setHasSearched(true);
              setCurrentSearchQuery(parsed.query);
              if (parsed.activeFilter) setActiveFilter(parsed.activeFilter);
              if (parsed.sidebarFilters) setSidebarFilters(parsed.sidebarFilters);
              if (parsed.displayCount) setDisplayCount(parsed.displayCount);

              // Scroll after state is restored
              if (typeof parsed.scrollPosition === "number" && parsed.scrollPosition > 0) {
                pendingScrollPosition.current = parsed.scrollPosition;
                // Use requestAnimationFrame to wait for render
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    if (pendingScrollPosition.current !== null) {
                      window.scrollTo(0, pendingScrollPosition.current);
                      pendingScrollPosition.current = null;
                    }
                  });
                });
              }
              return;
            }
          } catch (e) {
            console.error("Failed to parse cached state:", e);
          }
        }

        // No cache or different query, do a fresh search
        isRestoringFromUrl.current = true;
        handleSearch(initialQuery, false);
      }
    } else if (!initialQuery && lastRestoredQuery.current) {
      // Clear everything when URL query is removed (e.g., clicking logo)
      lastRestoredQuery.current = null;
      setSearchResult(null);
      setHasSearched(false);
      setActiveFilter(null);
      setCurrentSearchQuery("");
      setSidebarFilters(null);
      setDisplayCount(20);
      // Clear sessionStorage too
      sessionStorage.removeItem(SEARCH_STATE_KEY);
    }
  }, [initialQuery, handleSearch]);

  // Save full state including search results to sessionStorage
  // But NOT while we're restoring from URL/sessionStorage
  useEffect(() => {
    if (searchResult && hasSearched && !isRestoringFromUrl.current) {
      const stateToSave = {
        activeFilter,
        searchResult, // Cache the full search results
        sidebarFilters,
        query: currentSearchQuery,
        displayCount,
        scrollPosition: window.scrollY,
      };
      sessionStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(stateToSave));
    }
  }, [activeFilter, searchResult, sidebarFilters, currentSearchQuery, hasSearched, displayCount]);

  // Save scroll position on scroll (debounced) so it's captured before navigation
  useEffect(() => {
    if (!searchResult || !hasSearched) return;

    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (isRestoringFromUrl.current) return;
        try {
          const saved = sessionStorage.getItem(SEARCH_STATE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.scrollPosition = window.scrollY;
            sessionStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(parsed));
          }
        } catch (e) {
          // Ignore errors
        }
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [searchResult, hasSearched]);

  // Scroll to saved position after displayCount changes (for cache restoration)
  useEffect(() => {
    if (pendingScrollPosition.current !== null) {
      const scrollTarget = pendingScrollPosition.current;

      // Wait for React to render the products
      const attemptScroll = (attempts: number) => {
        if (attempts <= 0) {
          pendingScrollPosition.current = null;
          return;
        }

        requestAnimationFrame(() => {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          if (maxScroll >= scrollTarget) {
            window.scrollTo(0, scrollTarget);
            pendingScrollPosition.current = null;
          } else {
            setTimeout(() => attemptScroll(attempts - 1), 50);
          }
        });
      };

      attemptScroll(20);
    }
  }, [displayCount, searchResult]);

  return (
    <div className="w-full">
      <div className="mx-auto max-w-2xl">
        <SearchBar
          onSearch={handleSearch}
          isLoading={isLoading}
          placeholder="Describe what you're looking for..."
          initialValue={currentSearchQuery}
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
              {currentDisplayFilter && (
                <SearchFilters filter={currentDisplayFilter} onRemoveFilter={handleRemoveFilter} />
              )}

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
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-300">
                No products found
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                Try adjusting your search or removing some filters
              </p>

              {/* Clear filters button */}
              {(activeFilter && Object.keys(activeFilter).filter(k => k !== "query" && activeFilter[k as keyof SearchFilter] !== undefined).length > 0) && (
                <button
                  onClick={() => setActiveFilter({ query: activeFilter.query })}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear all filters
                </button>
              )}

              {/* Search suggestions */}
              <div className="mt-6">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Try searching for:</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {["women's shoes", "men's jacket", "vintage denim", "leather boots"].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSearch(suggestion)}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
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
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Recent Searches
                </h3>
                <button
                  onClick={() => clerkUser?.id && clearSearchHistory({ clerkId: clerkUser.id })}
                  className="text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  Clear all
                </button>
              </div>
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
