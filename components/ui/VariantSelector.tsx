"use client";

import { useState, useMemo, useEffect } from "react";
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
  onOptionsChange?: (options: Record<string, string>) => void;
  initialSelectedOptions?: Record<string, string>;
}

export function VariantSelector({
  variants = [],
  options = [],
  colorName,
  colorHex,
  colorVariants = [],
  currentProductId,
  onOptionsChange,
  initialSelectedOptions = {},
}: VariantSelectorProps) {
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
      {/* Color Swatches - from colorVariants (separate products) or options array (same product variants) */}
      {(() => {
        // Get color option from options array
        const colorOption = options.find(opt =>
          ['color', 'colour'].includes(opt.name.toLowerCase())
        );
        const colorValues = colorOption?.values || [];

        // Determine selected color (from selectedOptions or current colorName)
        const selectedColor = selectedOptions['Color'] || selectedOptions['Colour'] || colorName;

        // Show color section if we have colorVariants, color option values, or a single colorName
        const hasColors = colorVariants.length > 1 || colorValues.length > 0 || colorName;

        if (!hasColors) return null;

        return (
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Color
              </h3>
              {selectedColor && (
                <span className="text-sm font-medium text-zinc-900 dark:text-white">
                  {selectedColor}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {colorVariants.length > 1 ? (
                // Multiple separate products for each color
                colorVariants.map((variant) => (
                  <Link
                    key={variant._id}
                    href={`/product/${variant._id}?fromVariant=true`}
                    replace
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
              ) : colorValues.length > 0 ? (
                // Color options within the same product (Shopify-style variants)
                colorValues.map((color) => {
                  const isSelected = selectedColor === color;
                  const available = isOptionAvailable(colorOption!.name, color);

                  // Try to get a hex color for common color names
                  const colorHexMap: Record<string, string> = {
                    'black': '#000000', 'white': '#ffffff', 'grey': '#808080', 'gray': '#808080',
                    'navy': '#1a237e', 'blue': '#0066cc', 'red': '#cc0000', 'green': '#228b22',
                    'brown': '#8b4513', 'tan': '#d2b48c', 'beige': '#f5f5dc', 'cream': '#fffdd0',
                    'pink': '#ffc0cb', 'purple': '#800080', 'orange': '#ff8c00', 'yellow': '#ffd700',
                    'olive': '#808000', 'burgundy': '#800020', 'charcoal': '#36454f', 'khaki': '#c3b091',
                    'coral': '#ff7f50', 'teal': '#008080', 'maroon': '#800000', 'mint': '#98ff98',
                  };
                  const lowerColor = color.toLowerCase();
                  let bgColor = '#808080';
                  for (const [key, hex] of Object.entries(colorHexMap)) {
                    if (lowerColor.includes(key)) {
                      bgColor = hex;
                      break;
                    }
                  }

                  return (
                    <button
                      key={color}
                      onClick={() => {
                        if (available) {
                          const newOptions = {
                            ...selectedOptions,
                            [colorOption!.name]: isSelected ? "" : color,
                          };
                          updateSelectedOptions(newOptions);
                        }
                      }}
                      disabled={!available}
                      className={`relative h-10 w-10 rounded-full border-2 transition-all ${
                        !available ? 'opacity-40' : 'hover:scale-110'
                      } ${
                        isSelected
                          ? "border-zinc-900 dark:border-white ring-2 ring-zinc-900/20 dark:ring-white/20"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                      }`}
                      title={color + (available ? '' : ' (Sold out)')}
                    >
                      <span
                        className="absolute inset-1 rounded-full"
                        style={{ backgroundColor: bgColor }}
                      />
                      {!available && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <svg className="h-full w-full text-zinc-400" viewBox="0 0 100 100" preserveAspectRatio="none" stroke="currentColor">
                            <line x1="0" y1="100" x2="100" y2="0" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })
              ) : colorHex ? (
                // Just a single color swatch
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
        );
      })()}

      {/* Size/Option Selectors - filter out Color since it's handled above */}
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
