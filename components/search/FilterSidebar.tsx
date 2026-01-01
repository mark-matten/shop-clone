"use client";

import { useState, useEffect } from "react";

interface FilterDropdownProps {
  onApply: (filters: FilterState) => void;
  isOpen: boolean;
  onClose: () => void;
  initialFilters?: FilterState;
}

export interface FilterState {
  brands: string[];
  conditions: string[];
  priceMin: string;
  priceMax: string;
  sizes: string[];
  platforms: string[];
}

const brandOptions = ["Nike", "Gucci", "Levi's", "Sam Edelman", "Everlane", "Reformation", "Chanel", "Adidas", "Patagonia"];
const conditionOptions = ["new", "like_new", "used"];
const sizeOptions = ["XS", "S", "M", "L", "XL", "6", "7", "8", "9", "10", "11"];
const platformOptions = ["Poshmark", "eBay", "TheRealReal"];

const emptyFilters: FilterState = {
  brands: [],
  conditions: [],
  priceMin: "",
  priceMax: "",
  sizes: [],
  platforms: [],
};

export function FilterDropdown({ onApply, isOpen, onClose, initialFilters }: FilterDropdownProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters || emptyFilters);

  // Sync with initial filters when they change
  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

  const handleToggleFilter = (
    category: "brands" | "conditions" | "sizes" | "platforms",
    value: string
  ) => {
    const newFilters = { ...filters };
    const index = newFilters[category].indexOf(value);
    if (index === -1) {
      newFilters[category] = [...newFilters[category], value];
    } else {
      newFilters[category] = newFilters[category].filter((v) => v !== value);
    }
    setFilters(newFilters);
  };

  const handlePriceChange = (field: "priceMin" | "priceMax", value: string) => {
    setFilters({ ...filters, [field]: value });
  };

  const handleClearAll = () => {
    setFilters(emptyFilters);
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const activeFilterCount =
    filters.brands.length +
    filters.conditions.length +
    filters.sizes.length +
    filters.platforms.length +
    (filters.priceMin ? 1 : 0) +
    (filters.priceMax ? 1 : 0);

  const conditionLabels: Record<string, string> = {
    new: "New",
    like_new: "Like New",
    used: "Used",
  };

  if (!isOpen) return null;

  return (
    <div className="mb-6 w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Price Range */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-white">
              Price Range
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceMin}
                  onChange={(e) => handlePriceChange("priceMin", e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-7 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <span className="text-zinc-400">–</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceMax}
                  onChange={(e) => handlePriceChange("priceMax", e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-7 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Condition & Platform */}
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-white">
                Condition
              </h3>
              <div className="flex flex-wrap gap-2">
                {conditionOptions.map((condition) => (
                  <button
                    key={condition}
                    onClick={() => handleToggleFilter("conditions", condition)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      filters.conditions.includes(condition)
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {conditionLabels[condition]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-white">
                Platform
              </h3>
              <div className="flex flex-wrap gap-2">
                {platformOptions.map((platform) => (
                  <button
                    key={platform}
                    onClick={() => handleToggleFilter("platforms", platform)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      filters.platforms.includes(platform)
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Size */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-white">
              Size
            </h3>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((size) => (
                <button
                  key={size}
                  onClick={() => handleToggleFilter("sizes", size)}
                  className={`min-w-[36px] rounded-lg px-2 py-1 text-sm font-medium transition-colors ${
                    filters.sizes.includes(size)
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Brands */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-white">
              Brand
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-h-36 overflow-y-auto">
              {brandOptions.map((brand) => (
                <label
                  key={brand}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={filters.brands.includes(brand)}
                    onChange={() => handleToggleFilter("brands", brand)}
                    className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                    {brand}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <button
            onClick={handleClearAll}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            Clear all
            {activeFilterCount > 0 && (
              <span className="ml-1 text-zinc-400">({activeFilterCount})</span>
            )}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
  );
}

// Keep the old export name for backwards compatibility
export { FilterDropdown as FilterSidebar };
