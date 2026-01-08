"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import Image from "next/image";

export default function PublicOutfitPage() {
  const params = useParams();
  const outfitId = params.id as string;

  const outfitData = useQuery(
    api.storage.getPublicOutfit,
    outfitId ? { outfitId: outfitId as Id<"outfit_images"> } : "skip"
  );

  if (outfitData === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (outfitData === null) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
          Outfit Not Found
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          This outfit doesn&apos;t exist or has been deleted.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-rose-400 px-6 py-3 font-medium text-white hover:bg-rose-500 transition-colors"
        >
          Go to armoi
        </Link>
      </div>
    );
  }

  if (outfitData.isPrivate) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
          Private Closet
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-center max-w-md">
          This user&apos;s closet is private. They need to make it public in their settings to share outfits.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-rose-400 px-6 py-3 font-medium text-white hover:bg-rose-500 transition-colors"
        >
          Create your own closet
        </Link>
      </div>
    );
  }

  const { outfit, user } = outfitData;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-[family-name:var(--font-pacifico)] text-2xl">
              <span style={{ color: '#C2311D' }}>ar</span>
              <span style={{ color: '#942010' }}>moi</span>
            </Link>
            <Link
              href="/sign-in"
              className="rounded-lg bg-rose-400 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 transition-colors"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Outfit Image */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden mb-8">
          {outfit.name && (
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
                {outfit.name}
              </h1>
            </div>
          )}
          <div className="relative aspect-[3/4] max-h-[600px] bg-zinc-100 dark:bg-zinc-800">
            {outfit.url ? (
              <Image
                src={outfit.url}
                alt={outfit.name || "Outfit"}
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-400">
                Image not available
              </div>
            )}
          </div>
        </div>

        {/* Items Used */}
        {outfit.items && outfit.items.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              Items in this outfit
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {outfit.items.map((item: any) => {
                const content = (
                  <>
                    <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-700">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                        {item.name}
                      </p>
                      {item.brand && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {item.brand}
                        </p>
                      )}
                      {item.price && (
                        <p className="text-sm font-semibold text-rose-500 mt-1">
                          ${item.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </>
                );

                return item.productId ? (
                  <Link
                    key={item._id}
                    href={`/product/${item.productId}`}
                    className="bg-zinc-50 dark:bg-zinc-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-rose-400 transition-all cursor-pointer block"
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={item._id}
                    className="bg-zinc-50 dark:bg-zinc-800 rounded-lg overflow-hidden"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Full Closet CTA */}
        <div className="bg-gradient-to-r from-rose-400 to-rose-500 rounded-2xl shadow-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">
            Like this style?
          </h2>
          <p className="text-rose-100 mb-4">
            View more outfits and items from this closet
          </p>
          <Link
            href={`/closet/${user.clerkId}`}
            className="inline-block rounded-lg bg-white px-6 py-3 font-medium text-rose-500 hover:bg-rose-50 transition-colors"
          >
            View Full Closet
          </Link>
        </div>

        {/* Sign Up CTA */}
        <div className="mt-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Create your own virtual closet and try on outfits
          </p>
          <Link
            href="/sign-in"
            className="inline-block rounded-lg border-2 border-rose-400 px-6 py-3 font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-16 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <Link href="/" className="font-[family-name:var(--font-pacifico)] text-xl">
            <span style={{ color: '#C2311D' }}>ar</span>
            <span style={{ color: '#942010' }}>moi</span>
          </Link>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Your virtual closet for tracking and trying on clothes
          </p>
        </div>
      </footer>
    </div>
  );
}
