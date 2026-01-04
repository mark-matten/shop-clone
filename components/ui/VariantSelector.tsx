"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  colorName: string;
  colorHex?: string;
  imageUrl?: string;
  price?: number;
  sizes?: Array<{ size: string; available: boolean }>;
}

interface VariantSelectorProps {
  variants?: Variant[];
  options?: ProductOption[];
  colorName?: string;
  colorHex?: string;
  colorVariants?: ColorVariant[];
  currentProductId: string;
  onOptionsChange?: (options: Record<string, string>) => void;
  onColorChange?: (colorName: string) => void;
  initialSelectedOptions?: Record<string, string>;
  selectedColorName?: string;
}

export function VariantSelector({
  variants = [],
  options = [],
  colorName,
  colorHex,
  colorVariants = [],
  currentProductId,
  onOptionsChange,
  onColorChange,
  initialSelectedOptions = {},
  selectedColorName,
}: VariantSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Track selected options
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(initialSelectedOptions);

  // Sync with initial options when they change (e.g., from URL params)
  useEffect(() => {
    if (Object.keys(initialSelectedOptions).length > 0) {
      setSelectedOptions(initialSelectedOptions);
    }
  }, [initialSelectedOptions]);

  // Notify parent when options change
  const updateSelectedOptions = (newOptions: Record<string, string>) => {
    setSelectedOptions(newOptions);
    onOptionsChange?.(newOptions);
  };

  // Handle color selection - update URL query param
  const handleColorSelect = (newColorName: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("color", newColorName);
    params.set("fromVariant", "true");
    router.replace(`/product/${currentProductId}?${params.toString()}`, { scroll: false });
    onColorChange?.(newColorName);
  };

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
      {/* Size/Option Selectors - filter out Color since it's shown as text in Product Details */}
      {options
        .filter((option) => !['color', 'colour'].includes(option.name.toLowerCase()))
        .map((option) => (
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
                      const newOptions = {
                        ...selectedOptions,
                        [option.name]: isSelected ? "" : value,
                      };
                      updateSelectedOptions(newOptions);
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
