"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface Coupon {
  _id: Id<"coupons">;
  code: string;
  description: string;
  platform: string;
  discountType: "percentage" | "fixed" | "free_shipping";
  discountValue?: number;
  minPurchase?: number;
  expiresAt?: number;
  isVerified: boolean;
  usageCount: number;
  successRate?: number;
}

interface CouponCardProps {
  coupon: Coupon;
  userId?: Id<"users">;
  isSaved?: boolean;
  onSaveToggle?: () => void;
}

export function CouponCard({ coupon, userId, isSaved, onSaveToggle }: CouponCardProps) {
  const [copied, setCopied] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const reportCoupon = useMutation(api.coupons.reportCoupon);
  const saveCoupon = useMutation(api.coupons.saveCoupon);
  const unsaveCoupon = useMutation(api.coupons.unsaveCoupon);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowFeedback(true);
    }, 1500);
  };

  const handleReport = async (worked: boolean) => {
    if (!userId) return;
    await reportCoupon({
      couponId: coupon._id,
      userId,
      worked,
    });
    setShowFeedback(false);
  };

  const handleSaveToggle = async () => {
    if (!userId) return;

    if (isSaved) {
      await unsaveCoupon({ couponId: coupon._id, userId });
    } else {
      await saveCoupon({ couponId: coupon._id, userId });
    }
    onSaveToggle?.();
  };

  const getDiscountDisplay = () => {
    switch (coupon.discountType) {
      case "percentage":
        return `${coupon.discountValue}% OFF`;
      case "fixed":
        return `$${coupon.discountValue} OFF`;
      case "free_shipping":
        return "FREE SHIPPING";
    }
  };

  const getExpiryDisplay = () => {
    if (!coupon.expiresAt) return null;

    const daysLeft = Math.ceil((coupon.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return "Expired";
    if (daysLeft === 0) return "Expires today";
    if (daysLeft === 1) return "Expires tomorrow";
    if (daysLeft <= 7) return `${daysLeft} days left`;
    return null;
  };

  const expiryDisplay = getExpiryDisplay();
  const isExpiringSoon = expiryDisplay && !expiryDisplay.includes("Expired");

  return (
    <div className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900">
      {/* Verified Badge */}
      {coupon.isVerified && (
        <div className="absolute right-3 top-3">
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Verified
          </span>
        </div>
      )}

      {/* Save Button */}
      {userId && (
        <button
          onClick={handleSaveToggle}
          className="absolute left-3 top-3 rounded-full bg-white/80 p-1.5 text-zinc-400 backdrop-blur-sm transition-colors hover:text-red-500 dark:bg-zinc-800/80"
        >
          <svg
            className="h-4 w-4"
            fill={isSaved ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      )}

      <div className="p-4">
        {/* Platform & Discount */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <span className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              {coupon.platform}
            </span>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {getDiscountDisplay()}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          {coupon.description}
        </p>

        {/* Min Purchase */}
        {coupon.minPurchase && (
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-500">
            Min. purchase: ${coupon.minPurchase}
          </p>
        )}

        {/* Coupon Code */}
        <div className="mb-3">
          <button
            onClick={handleCopyCode}
            className="group/code flex w-full items-center justify-between rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-2.5 transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20"
          >
            <code className="font-mono text-lg font-bold text-zinc-900 dark:text-white">
              {coupon.code}
            </code>
            <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {copied ? (
                <>
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  Copy
                </>
              )}
            </span>
          </button>
        </div>

        {/* Feedback Prompt */}
        {showFeedback && userId && (
          <div className="mb-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <p className="mb-2 text-sm text-blue-700 dark:text-blue-300">
              Did this code work for you?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleReport(true)}
                className="flex-1 rounded-lg bg-green-100 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
              >
                Yes, it worked!
              </button>
              <button
                onClick={() => handleReport(false)}
                className="flex-1 rounded-lg bg-red-100 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
              >
                No, didn&apos;t work
              </button>
            </div>
          </div>
        )}

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-3">
            {coupon.successRate !== undefined && coupon.successRate > 0 && (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {coupon.successRate}% success
              </span>
            )}
            {coupon.usageCount > 0 && (
              <span>{coupon.usageCount} uses</span>
            )}
          </div>
          {isExpiringSoon && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {expiryDisplay}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
