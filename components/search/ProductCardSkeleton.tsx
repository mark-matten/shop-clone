"use client";

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Image skeleton */}
      <div className="aspect-square animate-pulse bg-zinc-200 dark:bg-zinc-800" />

      {/* Content skeleton */}
      <div className="flex flex-col p-4">
        <div className="mb-1 flex items-center justify-between">
          <div className="h-3 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>

        <div className="mb-2 space-y-1">
          <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>

        <div className="mb-3 flex gap-1">
          <div className="h-5 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-5 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>

        <div className="mt-auto">
          <div className="h-6 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
