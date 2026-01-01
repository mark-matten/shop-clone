import { Header } from "@/components/layout";
import { ProductSearch } from "@/components/search";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
            ShopWatch
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Find the best deals across eBay, Poshmark, TheRealReal, and more
          </p>
        </div>

        <ProductSearch />
      </main>
    </div>
  );
}
