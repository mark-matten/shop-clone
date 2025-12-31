import { Header } from "@/components/layout";

export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link skeleton */}
        <div className="h-5 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {/* Image skeleton */}
          <div className="aspect-square animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />

          {/* Product info skeleton */}
          <div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <span className="text-zinc-300 dark:text-zinc-600">•</span>
              <div className="h-4 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>

            <div className="mt-2 h-8 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />

            <div className="mt-4 flex items-baseline gap-4">
              <div className="h-9 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-7 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
            </div>

            <div className="mt-4 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-4 w-4/6 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="h-4 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="mt-1 h-5 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              <div className="h-12 flex-1 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-12 w-36 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
            </div>
          </div>
        </div>

        {/* Price history skeleton */}
        <section className="mt-12">
          <div className="h-6 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="mt-1 h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />

          <div className="mt-4 grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="h-4 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="mt-2 h-6 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
            ))}
          </div>

          <div className="mt-6 h-64 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800" />
        </section>
      </main>
    </div>
  );
}
