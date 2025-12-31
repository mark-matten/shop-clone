"use client";

import { useState } from "react";

interface FilterSidebarProps {
  onFilterChange: (filters: FilterState) => void;
  isOpen: boolean;
  onClose: () => void;
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

export function FilterSidebar({ onFilterChange, isOpen, onClose }: FilterSidebarProps) {
  const [filters, setFilters] = useState<FilterState>({
    brands: [],
    conditions: [],
    priceMin: "",
    priceMax: "",
    sizes: [],
    platforms: [],
  });

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
    onFilterChange(newFilters);
  };

  const handlePriceChange = (field: "priceMin" | "priceMax", value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearAll = () => {
    const clearedFilters: FilterState = {
      brands: [],
      conditions: [],
      priceMin: "",
      priceMax: "",
      sizes: [],
      platforms: [],
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
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

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-80 transform overflow-y-auto bg-white transition-transform dark:bg-zinc-900 lg:static lg:z-auto lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
          <h2 className="font-semibold text-zinc-900 dark:text-white">Filters</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900 dark:text-white">
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-white dark:bg-white dark:text-zinc-900">
                  {activeFilterCount}
                </span>
              )}
            </h2>
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearAll}
                className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Price Range */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-zinc-900 dark:text-white">
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

          {/* Condition */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-zinc-900 dark:text-white">
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

          {/* Brands */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-zinc-900 dark:text-white">
              Brand
            </h3>
            <div className="max-h-48 space-y-2 overflow-y-auto">
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
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {brand}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-zinc-900 dark:text-white">
              Size
            </h3>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((size) => (
                <button
                  key={size}
                  onClick={() => handleToggleFilter("sizes", size)}
                  className={`min-w-[40px] rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
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

          {/* Platform */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-zinc-900 dark:text-white">
              Platform
            </h3>
            <div className="space-y-2">
              {platformOptions.map((platform) => (
                <label
                  key={platform}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={filters.platforms.includes(platform)}
                    onChange={() => handleToggleFilter("platforms", platform)}
                    className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {platform}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
