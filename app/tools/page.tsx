"use client";

import Link from "next/link";
import { SizeConverter } from "@/components/tools/SizeConverter";

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>Back</span>
            </Link>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Shopping Tools
          </h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Tools Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="#size-converter"
            className="group rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-indigo-600"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-2xl dark:bg-indigo-900">
              📐
            </div>
            <h3 className="font-semibold text-zinc-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
              Size Converter
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Convert between US, UK, and EU sizes for shoes and clothing
            </p>
          </Link>

          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-200 text-2xl dark:bg-zinc-700">
              🔄
            </div>
            <h3 className="font-semibold text-zinc-400 dark:text-zinc-500">
              Currency Converter
            </h3>
            <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
              Coming soon
            </p>
          </div>

          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-200 text-2xl dark:bg-zinc-700">
              📊
            </div>
            <h3 className="font-semibold text-zinc-400 dark:text-zinc-500">
              Price Per Wear Calculator
            </h3>
            <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
              Coming soon
            </p>
          </div>
        </div>

        {/* Size Converter Section */}
        <section id="size-converter" className="scroll-mt-8">
          <SizeConverter />
        </section>

        {/* Tips Section */}
        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Size Guide Tips
          </h3>
          <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
            <li className="flex gap-3">
              <span className="text-indigo-600 dark:text-indigo-400">•</span>
              <span>
                Sizes can vary between brands. When in doubt, check the brand&apos;s
                specific size guide.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-600 dark:text-indigo-400">•</span>
              <span>
                European sizes are often labeled as IT (Italy), FR (France), or DE
                (Germany) - these generally follow the same EU sizing.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-600 dark:text-indigo-400">•</span>
              <span>
                For shoes, it&apos;s often recommended to measure your feet in the
                afternoon when they&apos;re slightly larger.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-600 dark:text-indigo-400">•</span>
              <span>
                If you&apos;re between sizes, most people find it more comfortable to
                size up.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-600 dark:text-indigo-400">•</span>
              <span>
                Vintage and designer items may use different sizing standards than
                contemporary fast fashion.
              </span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
