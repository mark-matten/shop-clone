"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/layout";

type Product = {
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
} | null;

export default function ComparePage() {
  const allProducts = useQuery(api.products.getAllProducts);
  const [selectedProducts, setSelectedProducts] = useState<[Product, Product, Product]>([
    null,
    null,
    null,
  ]);
  const [showSelector, setShowSelector] = useState<number | null>(null);

  const handleSelectProduct = (index: number, product: NonNullable<Product>) => {
    const newSelected = [...selectedProducts] as [Product, Product, Product];
    newSelected[index] = product;
    setSelectedProducts(newSelected);
    setShowSelector(null);
  };

  const handleRemoveProduct = (index: number) => {
    const newSelected = [...selectedProducts] as [Product, Product, Product];
    newSelected[index] = null;
    setSelectedProducts(newSelected);
  };

  const conditionLabels: Record<string, string> = {
    new: "New",
    used: "Used",
    like_new: "Like New",
  };

  const comparisonRows = [
    { label: "Brand", key: "brand" as const },
    { label: "Price", key: "price" as const },
    { label: "Material", key: "material" as const },
    { label: "Size", key: "size" as const },
    { label: "Condition", key: "condition" as const },
    { label: "Category", key: "category" as const },
    { label: "Platform", key: "sourcePlatform" as const },
  ];

  const validProducts = selectedProducts.filter((p): p is NonNullable<typeof p> => p !== null);
  const prices = validProducts.map((p) => p.price);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;

  // Loading state
  if (allProducts === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-8 h-96 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </main>
      </div>
    );
  }

  const products = allProducts || [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Compare Products
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Select up to 3 products to compare side by side
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {/* Header with product selection */}
          <div className="grid grid-cols-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Compare
              </span>
            </div>
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="relative border-l border-zinc-200 p-4 dark:border-zinc-800"
              >
                {selectedProducts[index] ? (
                  <div className="flex flex-col items-center text-center">
                    <button
                      onClick={() => handleRemoveProduct(index)}
                      className="absolute right-2 top-2 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="mb-3 h-24 w-24 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      {selectedProducts[index]!.imageUrl ? (
                        <img
                          src={selectedProducts[index]!.imageUrl}
                          alt={selectedProducts[index]!.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-400">
                          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h3 className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-white">
                      {selectedProducts[index]!.name}
                    </h3>
                    <button
                      onClick={() => setShowSelector(index)}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSelector(index)}
                    className="flex h-40 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-600"
                  >
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="mt-2 text-sm">Add product</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Comparison rows */}
          {comparisonRows.map((row, rowIndex) => (
            <div
              key={row.key}
              className={`grid grid-cols-4 ${
                rowIndex < comparisonRows.length - 1
                  ? "border-b border-zinc-200 dark:border-zinc-800"
                  : ""
              }`}
            >
              <div className="bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {row.label}
                </span>
              </div>
              {selectedProducts.map((product, index) => {
                if (!product) {
                  return (
                    <div
                      key={index}
                      className="border-l border-zinc-200 p-4 dark:border-zinc-800"
                    >
                      <span className="text-sm text-zinc-400">—</span>
                    </div>
                  );
                }

                const value = product[row.key];
                const isLowestPrice = row.key === "price" && value === lowestPrice;

                let displayValue: string;
                if (value === undefined || value === null) {
                  displayValue = "—";
                } else if (row.key === "price") {
                  displayValue = `$${(value as number).toFixed(2)}`;
                } else if (row.key === "condition") {
                  displayValue = conditionLabels[value as keyof typeof conditionLabels];
                } else {
                  displayValue = String(value);
                }

                return (
                  <div
                    key={index}
                    className={`border-l border-zinc-200 p-4 dark:border-zinc-800 ${
                      isLowestPrice ? "bg-green-50 dark:bg-green-900/20" : ""
                    }`}
                  >
                    <span
                      className={`text-sm ${
                        isLowestPrice
                          ? "font-semibold text-green-700 dark:text-green-400"
                          : "text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {displayValue}
                      {isLowestPrice && (
                        <span className="ml-2 text-xs">Best Price</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Action buttons */}
          <div className="grid grid-cols-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="bg-zinc-50 p-4 dark:bg-zinc-800/50" />
            {selectedProducts.map((product, index) => (
              <div
                key={index}
                className="border-l border-zinc-200 p-4 dark:border-zinc-800"
              >
                {product && (
                  <a
                    href={product.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-lg bg-zinc-900 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    View on {product.sourcePlatform}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Product Selector Modal */}
        {showSelector !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Select a product
                </h3>
                <button
                  onClick={() => setShowSelector(null)}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto p-4">
                <div className="grid gap-3">
                  {products.map((product) => (
                    <button
                      key={product._id}
                      onClick={() => handleSelectProduct(showSelector, product as NonNullable<Product>)}
                      className="flex items-center gap-4 rounded-lg border border-zinc-200 p-3 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                    >
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-400">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                          {product.brand}
                        </p>
                        <p className="font-medium text-zinc-900 dark:text-white truncate">
                          {product.name}
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          ${product.price.toFixed(2)} · {product.sourcePlatform}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
