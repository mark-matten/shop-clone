"use client";

import { useState, useEffect } from "react";

interface FilterDropdownProps {
  onApply: (filters: FilterState) => void;
  isOpen: boolean;
  onClose: () => void;
  initialFilters?: FilterState;
}

export interface FilterState {
  conditions: string[];
  priceMin: string;
  priceMax: string;
  inStockOnly: boolean;
}

const conditionOptions = ["new", "like_new", "used"];

const emptyFilters: FilterState = {
  conditions: [],
  priceMin: "",
  priceMax: "",
  inStockOnly: false,
};

export function FilterDropdown({ onApply, isOpen, onClose, initialFilters }: FilterDropdownProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters || emptyFilters);

  // Sync with initial filters when they change
  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

  const handleToggleCondition = (value: string) => {
    const newFilters = { ...filters };
    const index = newFilters.conditions.indexOf(value);
    if (index === -1) {
      newFilters.conditions = [...newFilters.conditions, value];
    } else {
      newFilters.conditions = newFilters.conditions.filter((v) => v !== value);
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
    filters.conditions.length +
    (filters.priceMin ? 1 : 0) +
    (filters.priceMax ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0);

  const conditionLabels: Record<string, string> = {
    new: "New",
    like_new: "Like New",
    used: "Used",
  };

  if (!isOpen) return null;

  return (
    <div className="mb-6 w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap gap-6">
          {/* Price Range */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-white">
              Price Range
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceMin}
                  onChange={(e) => handlePriceChange("priceMin", e.target.value)}
                  className="w-24 rounded-lg border border-zinc-200 bg-white py-2 pl-7 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <span className="text-zinc-400">–</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceMax}
                  onChange={(e) => handlePriceChange("priceMax", e.target.value)}
                  className="w-24 rounded-lg border border-zinc-200 bg-white py-2 pl-7 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Condition */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-white">
              Condition
            </h3>
            <div className="flex flex-wrap gap-2">
              {conditionOptions.map((condition) => (
                <button
                  key={condition}
                  onClick={() => handleToggleCondition(condition)}
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

          {/* In Stock Only */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-white">&nbsp;</h3>
            <label className="flex cursor-pointer items-center gap-2 py-1.5">
              <input
                type="checkbox"
                checked={filters.inStockOnly}
                onChange={() => setFilters({ ...filters, inStockOnly: !filters.inStockOnly })}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800"
              />
              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                In Stock Only
              </span>
            </label>
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
