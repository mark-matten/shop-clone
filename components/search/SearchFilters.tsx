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
}

export function SearchFilters({ filter }: SearchFiltersProps) {
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
          className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {formatLabel(key, value)}
        </span>
      ))}
    </div>
  );
}
