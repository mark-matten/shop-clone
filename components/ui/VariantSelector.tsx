"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface Variant {
  id: string;
  title: string;
  available: boolean;
  price?: number;
  option1?: string;
  option2?: string;
  option3?: string;
}

interface ProductOption {
  name: string;
  values: string[];
}

interface ColorVariant {
  _id: string;
  colorName?: string;
  colorHex?: string;
  imageUrl?: string;
}

interface VariantSelectorProps {
  variants?: Variant[];
  options?: ProductOption[];
  colorName?: string;
  colorHex?: string;
  colorVariants?: ColorVariant[];
  currentProductId: string;
}

export function VariantSelector({
  variants = [],
  options = [],
  colorName,
  colorHex,
  colorVariants = [],
  currentProductId,
}: VariantSelectorProps) {
  // Track selected options
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Check if a specific option combination is available
  const isOptionAvailable = (optionName: string, optionValue: string): boolean => {
    if (!variants || variants.length === 0) return true;

    // Find the option index (option1, option2, option3)
    const optionIndex = options.findIndex(opt => opt.name === optionName);
    if (optionIndex === -1) return true;

    const optionKey = `option${optionIndex + 1}` as 'option1' | 'option2' | 'option3';

    // Check if any variant with this option value is available
    // Also consider currently selected options
    return variants.some(variant => {
      if (variant[optionKey] !== optionValue) return false;
      if (!variant.available) return false;

      // Check if this variant matches other selected options
      for (const [name, value] of Object.entries(selectedOptions)) {
        if (name === optionName) continue;
        const otherIndex = options.findIndex(opt => opt.name === name);
        if (otherIndex === -1) continue;
        const otherKey = `option${otherIndex + 1}` as 'option1' | 'option2' | 'option3';
        if (variant[otherKey] !== value) return false;
      }

      return true;
    });
  };

  // Count available variants for an option value
  const getAvailableCount = (optionName: string, optionValue: string): number => {
    if (!variants || variants.length === 0) return 0;

    const optionIndex = options.findIndex(opt => opt.name === optionName);
    if (optionIndex === -1) return 0;

    const optionKey = `option${optionIndex + 1}` as 'option1' | 'option2' | 'option3';

    return variants.filter(variant => {
      if (variant[optionKey] !== optionValue) return false;
      return variant.available;
    }).length;
  };

  // Check if ALL sizes are sold out (not just some)
  const isAllSoldOut = useMemo(() => {
    if (!variants || variants.length === 0) return false;
    return variants.every(v => !v.available);
  }, [variants]);

  // Don't render if no options
  if (options.length === 0 && colorVariants.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Color Swatches */}
      {(colorVariants.length > 1 || colorName) && (
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Color
            </h3>
            {colorName && (
              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                {colorName}
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {colorVariants.length > 1 ? (
              colorVariants.map((variant) => (
                <Link
                  key={variant._id}
                  href={`/product/${variant._id}`}
                  className={`relative h-10 w-10 rounded-full border-2 transition-all hover:scale-110 ${
                    variant._id === currentProductId
                      ? "border-zinc-900 dark:border-white ring-2 ring-zinc-900/20 dark:ring-white/20"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                  }`}
                  title={variant.colorName || "Color variant"}
                >
                  <span
                    className="absolute inset-1 rounded-full"
                    style={{
                      backgroundColor: variant.colorHex || "#808080",
                    }}
                  />
                </Link>
              ))
            ) : colorHex ? (
              <div
                className="h-10 w-10 rounded-full border-2 border-zinc-900 dark:border-white ring-2 ring-zinc-900/20 dark:ring-white/20"
                title={colorName}
              >
                <span
                  className="block h-full w-full rounded-full"
                  style={{ backgroundColor: colorHex }}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Size/Option Selectors */}
      {options.map((option) => (
        <div key={option.name}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {option.name}
            </h3>
            {isAllSoldOut && (
              <span className="text-sm text-red-600 dark:text-red-400">
                Sold out
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {option.values.map((value) => {
              const available = isOptionAvailable(option.name, value);
              const isSelected = selectedOptions[option.name] === value;

              return (
                <button
                  key={value}
                  onClick={() => {
                    if (available) {
                      setSelectedOptions((prev) => ({
                        ...prev,
                        [option.name]: isSelected ? "" : value,
                      }));
                    }
                  }}
                  disabled={!available}
                  className={`relative rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                    isSelected
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                      : available
                      ? "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:border-zinc-500"
                      : "border-zinc-100 bg-zinc-50 text-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600"
                  }`}
                >
                  {value}
                  {/* Strikethrough for sold out */}
                  {!available && (
                    <span
                      className="absolute inset-0 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <svg
                        className="h-full w-full text-zinc-200 dark:text-zinc-700"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        stroke="currentColor"
                      >
                        <line
                          x1="0"
                          y1="100"
                          x2="100"
                          y2="0"
                          strokeWidth="1"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
