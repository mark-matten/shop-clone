import { Suspense } from "react";
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

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center animate-fade-in-down">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-zinc-700 dark:text-zinc-300">Shop</span><span className="text-[#D4AF37] dark:text-[#E5C158]">Watch</span>
          </h1>
          <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
            Find the best deals for new and used clothing across thousands of brands and marketplaces.
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
            Search using everyday language. Describe the style, size, price range, or any other details you&apos;re looking for.
          </p>
        </div>

        <div className="animate-fade-in-up">
          <Suspense fallback={<SearchFallback />}>
            <ProductSearch />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
