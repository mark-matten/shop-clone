"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 ${className}`}
    />
  );
}

// Product card skeleton for grid displays
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}

// Grid of product skeletons
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Search bar skeleton
export function SearchBarSkeleton() {
  return (
    <div className="w-full">
      <Skeleton className="h-14 w-full rounded-full" />
      <Skeleton className="mx-auto mt-3 h-4 w-64" />
    </div>
  );
}

// Stat card skeleton for dashboard
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
      </div>
    </div>
  );
}

// List item skeleton
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="space-y-2 text-right">
        <Skeleton className="h-5 w-16 ml-auto" />
        <Skeleton className="h-3 w-20 ml-auto" />
      </div>
    </div>
  );
}

// Coupon card skeleton
export function CouponCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
    </div>
  );
}

// Chips/tags skeleton
export function ChipsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-full" />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-2">
      {/* Image skeleton */}
      <div className="aspect-square animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />

      {/* Product info skeleton */}
      <div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <span className="text-zinc-300 dark:text-zinc-600">•</span>
          <Skeleton className="h-4 w-16" />
        </div>

        <Skeleton className="mt-2 h-8 w-3/4" />

        <div className="mt-4 flex items-baseline gap-4">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>

        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
        <Skeleton className="mt-2 h-4 w-4/6" />

        <div className="mt-6 grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-12" />
              <Skeleton className="mt-1 h-5 w-16" />
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-4">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 w-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function TrackedItemSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <Skeleton className="h-20 w-20 flex-shrink-0 rounded-lg" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-1 h-5 w-3/4" />
        <Skeleton className="mt-1 h-4 w-20" />
      </div>
      <div className="text-right flex-shrink-0">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="mt-1 h-4 w-16" />
      </div>
      <div className="flex flex-shrink-0 gap-2">
        <Skeleton className="h-10 w-16 rounded-lg" />
        <Skeleton className="h-10 w-20 rounded-lg" />
      </div>
    </div>
  );
}
