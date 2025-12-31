"use client";

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

interface ProductComparisonProps {
  products: (Product | null)[];
}

const conditionLabels = {
  new: "New",
  used: "Used",
  like_new: "Like New",
};

export function ProductComparison({ products }: ProductComparisonProps) {
  const validProducts = products.filter((p): p is Product => p !== null);

  if (validProducts.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-600 dark:text-zinc-400">
          No products found for comparison.
        </p>
      </div>
    );
  }

  // Find lowest price for highlighting
  const prices = validProducts.map((p) => p.price);
  const lowestPrice = Math.min(...prices);

  const comparisonRows = [
    { label: "Brand", key: "brand" as const },
    { label: "Material", key: "material" as const },
    { label: "Price", key: "price" as const },
    { label: "Size", key: "size" as const },
    { label: "Condition", key: "condition" as const },
    { label: "Category", key: "category" as const },
    { label: "Platform", key: "sourcePlatform" as const },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header with product images and names */}
      <div
        className="grid border-b border-zinc-200 dark:border-zinc-800"
        style={{ gridTemplateColumns: `1fr repeat(${products.length}, 1fr)` }}
      >
        <div className="bg-zinc-50 p-4 dark:bg-zinc-800/50">
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Compare
          </span>
        </div>
        {products.map((product, index) => (
          <div
            key={product?._id || index}
            className="border-l border-zinc-200 p-4 dark:border-zinc-800"
          >
            {product ? (
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 h-24 w-24 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                      <svg
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-white">
                  {product.name}
                </h3>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-zinc-400">
                Not found
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Comparison rows */}
      {comparisonRows.map((row, rowIndex) => (
        <div
          key={row.key}
          className={`grid ${
            rowIndex < comparisonRows.length - 1
              ? "border-b border-zinc-200 dark:border-zinc-800"
              : ""
          }`}
          style={{ gridTemplateColumns: `1fr repeat(${products.length}, 1fr)` }}
        >
          <div className="bg-zinc-50 p-4 dark:bg-zinc-800/50">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {row.label}
            </span>
          </div>
          {products.map((product, index) => {
            const value = product?.[row.key];
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
                key={product?._id || index}
                className={`border-l border-zinc-200 p-4 dark:border-zinc-800 ${
                  isLowestPrice
                    ? "bg-green-50 dark:bg-green-900/20"
                    : ""
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
      <div
        className="grid border-t border-zinc-200 dark:border-zinc-800"
        style={{ gridTemplateColumns: `1fr repeat(${products.length}, 1fr)` }}
      >
        <div className="bg-zinc-50 p-4 dark:bg-zinc-800/50" />
        {products.map((product, index) => (
          <div
            key={product?._id || index}
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
  );
}
