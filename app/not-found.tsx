import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-zinc-200 dark:text-zinc-800">
          404
        </h1>
        <h2 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-white">
          Page not found
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-xl bg-zinc-900 px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Go to Home
          </Link>
          <Link
            href="/compare"
            className="rounded-xl border border-zinc-300 px-6 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Compare Products
          </Link>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="mt-16 flex gap-4">
        {["boots", "jacket", "bag"].map((item) => (
          <div
            key={item}
            className="h-16 w-16 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
    </div>
  );
}
