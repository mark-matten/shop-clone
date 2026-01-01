"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface ReferralCardProps {
  userId: Id<"users">;
}

export function ReferralCard({ userId }: ReferralCardProps) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const stats = useQuery(api.referrals.getReferralStats, { userId });
  const getOrCreateCode = useMutation(api.referrals.getOrCreateReferralCode);
  const [isGenerating, setIsGenerating] = useState(false);

  // Get origin on client only to avoid hydration mismatch
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      await getOrCreateCode({ userId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!stats?.referralCode || !origin) return;

    const referralLink = `${origin}/sign-up?ref=${stats.referralCode}`;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!stats?.referralCode || !origin) return;

    const referralLink = `${origin}/sign-up?ref=${stats.referralCode}`;
    const shareData = {
      title: "Join ShopWatch",
      text: "I've been using ShopWatch to track prices and find great deals. Join me!",
      url: referralLink,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
        console.debug("Share cancelled", err);
      }
    } else {
      // Fallback to copy
      handleCopyLink();
    }
  };

  if (!stats) {
    return (
      <div className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="h-6 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-4 h-16 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
          <svg
            className="h-5 w-5 text-purple-600 dark:text-purple-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Invite Friends
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Share ShopWatch and earn rewards
          </p>
        </div>
      </div>

      {stats.referralCode ? (
        <>
          {/* Referral Code Display */}
          <div className="mb-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 p-4 dark:from-purple-900/20 dark:to-indigo-900/20">
            <p className="mb-1 text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              Your referral code
            </p>
            <div className="flex items-center gap-3">
              <code className="text-2xl font-bold tracking-wider text-purple-700 dark:text-purple-400">
                {stats.referralCode}
              </code>
              <button
                onClick={handleCopyLink}
                className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-purple-600 shadow-sm transition-colors hover:bg-purple-50 dark:bg-zinc-800 dark:text-purple-400 dark:hover:bg-zinc-700"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share
            </button>
            <a
              href={origin ? `https://twitter.com/intent/tweet?text=I've been using ShopWatch to track prices and find great deals. Join me!&url=${encodeURIComponent(`${origin}/sign-up?ref=${stats.referralCode}`)}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-lg bg-zinc-100 p-2.5 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href={origin ? `mailto:?subject=Join me on ShopWatch&body=I've been using ShopWatch to track prices and find great deals. Join me using my referral link: ${origin}/sign-up?ref=${stats.referralCode}` : "#"}
              className="flex items-center justify-center rounded-lg bg-zinc-100 p-2.5 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-zinc-800">
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {stats.completedReferrals}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Friends Joined
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-zinc-800">
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {stats.pendingReferrals}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Pending Invites
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center">
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Get your unique referral code to start inviting friends
          </p>
          <button
            onClick={handleGenerateCode}
            disabled={isGenerating}
            className="rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Get Referral Code"}
          </button>
        </div>
      )}
    </div>
  );
}
