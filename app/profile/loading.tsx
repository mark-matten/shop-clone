import { Header } from "@/components/layout";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-8 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-1 h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />

        {/* Size Preferences skeleton */}
        <section className="mt-8">
          <div className="h-6 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="mt-1 h-4 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="mt-1 h-10 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
              </div>
            ))}
          </div>

          <div className="mt-4 h-10 w-36 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        </section>

        {/* Tracked Items skeleton */}
        <section className="mt-12">
          <div className="h-6 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="mt-1 h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />

          <div className="mt-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="h-20 w-20 flex-shrink-0 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
                <div className="flex-1">
                  <div className="h-3 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="mt-1 h-5 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="mt-1 h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                </div>
                <div className="text-right">
                  <div className="h-6 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="mt-1 h-4 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                </div>
                <div className="flex gap-2">
                  <div className="h-10 w-16 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-10 w-20 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
