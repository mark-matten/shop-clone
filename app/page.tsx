"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout";
import { ProductSearch } from "@/components/search";
import { ProductGridSkeleton } from "@/components/search/ProductCardSkeleton";

function SearchFallback() {
  return (
    <div className="w-full">
      <div className="mx-auto max-w-2xl">
        <div className="h-14 w-full animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
      </div>
      <div className="mt-8">
        <ProductGridSkeleton count={6} />
      </div>
    </div>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const hasSearchQuery = !!searchParams.get("q");

  return (
    <main id="main-content" className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${hasSearchQuery ? 'pt-6 pb-4' : 'py-6'}`}>
      {!hasSearchQuery && (
        <div className="mb-6 text-center animate-fade-in-down">
          <h1 className="text-5xl sm:text-6xl" style={{ fontFamily: 'var(--font-pacifico)' }}>
            <span className="text-black dark:text-white">ar</span><span className="text-rose-400">moi</span>
          </h1>
          <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
            Find the best deals for new and used clothing across thousands of brands and marketplaces.
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
            Search using everyday language. Describe the style, size, price range, or any other details you&apos;re looking for.
          </p>
        </div>
      )}

      <div className={hasSearchQuery ? '' : 'animate-fade-in-up'}>
        <ProductSearch />
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <Suspense fallback={<SearchFallback />}>
        <HomeContent />
      </Suspense>
    </div>
  );
}
