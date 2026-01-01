"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";

const sizeOptions = {
  women: {
    shoe: ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11"],
    top: ["XXS", "XS", "S", "M", "L", "XL", "XXL"],
    bottom: ["00", "0", "2", "4", "6", "8", "10", "12", "14", "16"],
  },
  men: {
    shoe: ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "12.5", "13", "14"],
    top: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
    bottom: ["28", "29", "30", "31", "32", "33", "34", "36", "38", "40", "42"],
  },
};

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [shopsWomen, setShopsWomen] = useState(false);
  const [shopsMen, setShopsMen] = useState(false);
  const [womenSizes, setWomenSizes] = useState({ shoe: "", top: "", bottom: "" });
  const [menSizes, setMenSizes] = useState({ shoe: "", top: "", bottom: "" });
  const [isSaving, setIsSaving] = useState(false);

  const { user: clerkUser } = useUser();
  const updatePreferences = useMutation(api.users.updateUserPreferences);

  const steps = [
    { title: "Welcome!", subtitle: "Let's personalize your experience" },
    { title: "What do you shop for?", subtitle: "Select all that apply" },
    { title: "Your sizes", subtitle: "We'll filter results to match your size" },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (!clerkUser?.id) return;

    setIsSaving(true);
    try {
      await updatePreferences({
        clerkId: clerkUser.id,
        preferences: {
          shopsWomen,
          shopsMen,
          womenShoeSizeMin: womenSizes.shoe,
          womenShoeSizeMax: womenSizes.shoe,
          womenTopSizeMin: womenSizes.top,
          womenTopSizeMax: womenSizes.top,
          womenBottomSizeMin: womenSizes.bottom,
          womenBottomSizeMax: womenSizes.bottom,
          womenDressSizeMin: womenSizes.bottom,
          womenDressSizeMax: womenSizes.bottom,
          menShoeSizeMin: menSizes.shoe,
          menShoeSizeMax: menSizes.shoe,
          menTopSizeMin: menSizes.top,
          menTopSizeMax: menSizes.top,
          menBottomSizeMin: menSizes.bottom,
          menBottomSizeMax: menSizes.bottom,
        },
      });
      onComplete();
    } catch (error) {
      console.error("Failed to save preferences:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
        {/* Progress bar */}
        <div className="h-1 bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <span className="text-4xl">👋</span>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                Welcome to ShopWatch!
              </h2>
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                Find the best deals on clothing across thousands of brands and
                marketplaces. Let's set up your preferences to personalize your
                experience.
              </p>
              <div className="mt-8 space-y-3 text-left">
                <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    Search with natural language
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    Track prices and get alerts
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    Save favorites and create collections
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Gender selection */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                {steps[step].title}
              </h2>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                {steps[step].subtitle}
              </p>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => setShopsWomen(!shopsWomen)}
                  className={`flex w-full items-center justify-between rounded-xl border-2 p-4 transition-all ${
                    shopsWomen
                      ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/20"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👗</span>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      Women's Clothing
                    </span>
                  </div>
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                      shopsWomen
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    {shopsWomen && (
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setShopsMen(!shopsMen)}
                  className={`flex w-full items-center justify-between rounded-xl border-2 p-4 transition-all ${
                    shopsMen
                      ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/20"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👔</span>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      Men's Clothing
                    </span>
                  </div>
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                      shopsMen
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    {shopsMen && (
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Size selection */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                {steps[step].title}
              </h2>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                {steps[step].subtitle}
              </p>

              <div className="mt-6 max-h-[400px] space-y-6 overflow-y-auto">
                {shopsWomen && (
                  <div>
                    <h3 className="mb-3 font-medium text-zinc-900 dark:text-white">
                      Women's Sizes
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                          Shoe Size
                        </label>
                        <select
                          value={womenSizes.shoe}
                          onChange={(e) => setWomenSizes({ ...womenSizes, shoe: e.target.value })}
                          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        >
                          <option value="">Select size</option>
                          {sizeOptions.women.shoe.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                          Top Size
                        </label>
                        <select
                          value={womenSizes.top}
                          onChange={(e) => setWomenSizes({ ...womenSizes, top: e.target.value })}
                          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        >
                          <option value="">Select size</option>
                          {sizeOptions.women.top.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                          Bottom/Dress Size
                        </label>
                        <select
                          value={womenSizes.bottom}
                          onChange={(e) => setWomenSizes({ ...womenSizes, bottom: e.target.value })}
                          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        >
                          <option value="">Select size</option>
                          {sizeOptions.women.bottom.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {shopsMen && (
                  <div>
                    <h3 className="mb-3 font-medium text-zinc-900 dark:text-white">
                      Men's Sizes
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                          Shoe Size
                        </label>
                        <select
                          value={menSizes.shoe}
                          onChange={(e) => setMenSizes({ ...menSizes, shoe: e.target.value })}
                          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        >
                          <option value="">Select size</option>
                          {sizeOptions.men.shoe.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                          Top Size
                        </label>
                        <select
                          value={menSizes.top}
                          onChange={(e) => setMenSizes({ ...menSizes, top: e.target.value })}
                          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        >
                          <option value="">Select size</option>
                          {sizeOptions.men.top.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                          Waist/Bottom Size
                        </label>
                        <select
                          value={menSizes.bottom}
                          onChange={(e) => setMenSizes({ ...menSizes, bottom: e.target.value })}
                          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        >
                          <option value="">Select size</option>
                          {sizeOptions.men.bottom.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {!shopsWomen && !shopsMen && (
                  <div className="rounded-lg bg-zinc-50 p-4 text-center text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    Go back and select what you shop for to set your sizes
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex gap-3">
            {step > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 rounded-lg border border-zinc-300 py-2.5 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={step === 1 && !shopsWomen && !shopsMen}
                className="flex-1 rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isSaving}
                className="flex-1 rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Get Started"}
              </button>
            )}
          </div>

          {/* Skip button */}
          <button
            onClick={onComplete}
            className="mt-4 w-full text-center text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
