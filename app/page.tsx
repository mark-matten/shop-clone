import { Header } from "@/components/layout";
import { ProductSearch } from "@/components/search";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center animate-fade-in-down">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
            Shop<span className="text-emerald-800 dark:text-emerald-400">Watch</span>
          </h1>
          <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
            Find the best deals for new and used clothing across thousands of brands and marketplaces.
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
            Search using everyday language. Describe the style, size, price range, or any other details you&apos;re looking for.
          </p>
        </div>

        <div className="animate-fade-in-up">
          <ProductSearch />
        </div>
      </main>
    </div>
  );
}
