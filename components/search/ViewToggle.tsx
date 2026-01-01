"use client";

type ViewMode = "grid" | "list";

interface ViewToggleProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
      <button
        onClick={() => onViewChange("grid")}
        className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
          view === "grid"
            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-white"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        }`}
        title="Grid view"
        aria-label="Grid view"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
      <button
        onClick={() => onViewChange("list")}
        className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
          view === "list"
            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-white"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        }`}
        title="List view"
        aria-label="List view"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </button>
    </div>
  );
}

// Product list item for list view
interface ProductListItemProps {
  product: {
    _id: string;
    name: string;
    description: string;
    brand: string;
    price: number;
    size?: string;
    gender?: "men" | "women" | "unisex";
    condition: string;
    sourcePlatform: string;
    imageUrl?: string;
  };
  isFavorited?: boolean;
  onFavoriteClick?: () => void;
}

const genderLabels = {
  men: "M",
  women: "F",
  unisex: "M/F",
};

export function ProductListItem({ product, isFavorited, onFavoriteClick }: ProductListItemProps) {
  return (
    <div className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              {product.brand}
            </p>
            <h3 className="mt-0.5 font-medium text-zinc-900 dark:text-white">
              {product.name}
            </h3>
          </div>
          <p className="text-lg font-bold text-zinc-900 dark:text-white">
            ${product.price.toFixed(2)}
          </p>
        </div>

        <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
          {product.description}
        </p>

        <div className="mt-auto flex items-center gap-2 pt-2">
          {product.gender && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              {genderLabels[product.gender]}
            </span>
          )}
          {product.size && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {product.size}
            </span>
          )}
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {product.condition.replace("_", " ")}
          </span>
          <span className="text-xs text-zinc-400">
            {product.sourcePlatform}
          </span>

          <div className="ml-auto flex gap-2">
            {onFavoriteClick && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onFavoriteClick();
                }}
                className={`rounded-lg p-1.5 transition-colors ${
                  isFavorited
                    ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                    : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                }`}
              >
                <svg
                  className="h-5 w-5"
                  fill={isFavorited ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
            )}
            <a
              href={`/product/${product._id}`}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              View
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
