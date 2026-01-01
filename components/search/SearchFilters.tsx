"use client";

interface SearchFilter {
  query: string;
  gender?: "men" | "women" | "unisex";
  category?: string;
  brand?: string;
  material?: string;
  size?: string;
  condition?: "new" | "used" | "like_new";
  minPrice?: number;
  maxPrice?: number;
}

interface SearchFiltersProps {
  filter: SearchFilter;
  onRemoveFilter?: (key: keyof SearchFilter) => void;
}

export function SearchFilters({ filter, onRemoveFilter }: SearchFiltersProps) {
  const activeFilters = Object.entries(filter).filter(
    ([key, value]) => key !== "query" && value !== undefined
  );

  if (activeFilters.length === 0) {
    return null;
  }

  const formatLabel = (key: string, value: unknown): string => {
    switch (key) {
      case "minPrice":
        return `Over $${value}`;
      case "maxPrice":
        return `Under $${value}`;
      case "condition":
        return value === "like_new" ? "Like New" : String(value);
      case "size":
        return `Size ${value}`;
      default:
        return String(value);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">
        Filters:
      </span>
      {activeFilters.map(([key, value]) => (
        <span
          key={key}
          className="group inline-flex items-center gap-1 rounded-full bg-zinc-100 py-1 pl-3 pr-2 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {formatLabel(key, value)}
          {onRemoveFilter && (
            <button
              onClick={() => onRemoveFilter(key as keyof SearchFilter)}
              className="ml-0.5 rounded-full p-0.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              aria-label={`Remove ${formatLabel(key, value)} filter`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
