"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/layout";

const sizeOptions = {
  women: {
    shoe: ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11"],
    top: ["XXS", "XS", "S", "M", "L", "XL", "XXL"],
    bottom: ["00", "0", "2", "4", "6", "8", "10", "12", "14", "16"],
    dress: ["00", "0", "2", "4", "6", "8", "10", "12", "14", "16"],
  },
  men: {
    shoe: ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "12.5", "13", "14"],
    top: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
    bottom: ["28", "29", "30", "31", "32", "33", "34", "36", "38", "40", "42"],
  },
};

interface Preferences {
  shopsMen: boolean;
  shopsWomen: boolean;
  // Women's size ranges
  womenShoeSizeMin: string;
  womenShoeSizeMax: string;
  womenTopSizeMin: string;
  womenTopSizeMax: string;
  womenBottomSizeMin: string;
  womenBottomSizeMax: string;
  womenDressSizeMin: string;
  womenDressSizeMax: string;
  // Men's size ranges
  menShoeSizeMin: string;
  menShoeSizeMax: string;
  menTopSizeMin: string;
  menTopSizeMax: string;
  menBottomSizeMin: string;
  menBottomSizeMax: string;
}

const defaultPreferences: Preferences = {
  shopsMen: false,
  shopsWomen: false,
  womenShoeSizeMin: "",
  womenShoeSizeMax: "",
  womenTopSizeMin: "",
  womenTopSizeMax: "",
  womenBottomSizeMin: "",
  womenBottomSizeMax: "",
  womenDressSizeMin: "",
  womenDressSizeMax: "",
  menShoeSizeMin: "",
  menShoeSizeMax: "",
  menTopSizeMin: "",
  menTopSizeMax: "",
  menBottomSizeMin: "",
  menBottomSizeMax: "",
};

interface SizeRangeSelectProps {
  label: string;
  options: string[];
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}

function SizeRangeSelect({ label, options, minValue, maxValue, onMinChange, onMaxChange }: SizeRangeSelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <select
          value={minValue}
          onChange={(e) => onMinChange(e.target.value)}
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
        >
          <option value="">Min</option>
          {options.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-zinc-400 text-sm">to</span>
        <select
          value={maxValue}
          onChange={(e) => onMaxChange(e.target.value)}
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
        >
          <option value="">Max</option>
          {options.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );
  const trackedItems = useQuery(
    api.tracking.getTrackedItems,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  const updatePreferences = useMutation(api.users.updateUserPreferences);
  const untrackProduct = useMutation(api.tracking.untrackProduct);
  const updateEmailSettings = useMutation(api.users.updateEmailSettings);

  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Email notification settings
  const [email, setEmail] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [emailPriceDrops, setEmailPriceDrops] = useState(true);
  const [emailTargetReached, setEmailTargetReached] = useState(true);
  const [emailWeeklyDigest, setEmailWeeklyDigest] = useState(false);
  const [isEmailSaving, setIsEmailSaving] = useState(false);
  const [emailSaveMessage, setEmailSaveMessage] = useState<string | null>(null);

  // Update preferences when user data loads
  useEffect(() => {
    if (convexUser?.preferences) {
      const prefs = convexUser.preferences;
      setPreferences({
        shopsMen: prefs.shopsMen ?? false,
        shopsWomen: prefs.shopsWomen ?? false,
        womenShoeSizeMin: prefs.womenShoeSizeMin ?? "",
        womenShoeSizeMax: prefs.womenShoeSizeMax ?? "",
        womenTopSizeMin: prefs.womenTopSizeMin ?? "",
        womenTopSizeMax: prefs.womenTopSizeMax ?? "",
        womenBottomSizeMin: prefs.womenBottomSizeMin ?? "",
        womenBottomSizeMax: prefs.womenBottomSizeMax ?? "",
        womenDressSizeMin: prefs.womenDressSizeMin ?? "",
        womenDressSizeMax: prefs.womenDressSizeMax ?? "",
        menShoeSizeMin: prefs.menShoeSizeMin ?? "",
        menShoeSizeMax: prefs.menShoeSizeMax ?? "",
        menTopSizeMin: prefs.menTopSizeMin ?? "",
        menTopSizeMax: prefs.menTopSizeMax ?? "",
        menBottomSizeMin: prefs.menBottomSizeMin ?? "",
        menBottomSizeMax: prefs.menBottomSizeMax ?? "",
      });
      // Load email notification settings
      setEmailNotifications(prefs.emailNotifications ?? false);
      setEmailPriceDrops(prefs.emailPriceDrops ?? true);
      setEmailTargetReached(prefs.emailTargetReached ?? true);
      setEmailWeeklyDigest(prefs.emailWeeklyDigest ?? false);
    }
    if (convexUser?.email) {
      setEmail(convexUser.email);
    }
  }, [convexUser]);

  const handleGenderToggle = (gender: "shopsMen" | "shopsWomen") => {
    setPreferences((prev) => ({ ...prev, [gender]: !prev[gender] }));
    setValidationError(null);
  };

  const updatePreference = (key: keyof Preferences, value: string | boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!clerkUser?.id) return;

    // Validate at least one gender is selected
    if (!preferences.shopsMen && !preferences.shopsWomen) {
      setValidationError("Please select at least one: Men's or Women's clothing");
      return;
    }

    setValidationError(null);
    setIsSaving(true);
    try {
      await updatePreferences({
        clerkId: clerkUser.id,
        preferences,
      });
      setSaveMessage("Preferences saved!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save preferences:", error);
      setSaveMessage("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUntrack = async (productId: Id<"products">) => {
    if (!convexUser?._id) return;
    await untrackProduct({ userId: convexUser._id, productId });
  };

  const handleEmailSettingsSave = async () => {
    if (!clerkUser?.id) return;

    setIsEmailSaving(true);
    try {
      await updateEmailSettings({
        clerkId: clerkUser.id,
        email: email || undefined,
        emailNotifications,
        emailPriceDrops,
        emailTargetReached,
        emailWeeklyDigest,
      });
      setEmailSaveMessage("Email settings saved!");
      setTimeout(() => setEmailSaveMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save email settings:", error);
      setEmailSaveMessage("Failed to save");
    } finally {
      setIsEmailSaving(false);
    }
  };

  // Loading state
  if (!isLoaded || (clerkUser && convexUser === undefined)) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-8 space-y-4">
              <div className="h-40 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-40 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Not signed in
  if (!clerkUser) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">Sign in to view your profile</p>
            <Link
              href="/sign-in"
              className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Sign in
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const items = trackedItems || [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Your Profile
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          {convexUser?.phoneNumber || clerkUser.primaryPhoneNumber?.phoneNumber || "No phone number"}
        </p>

        {/* Shopping Preferences */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Shopping Preferences
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Select which clothing you shop for and set your size ranges
          </p>

          {/* Gender Selection */}
          <div className="mt-4">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              I shop for: <span className="text-red-500">*</span>
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.shopsWomen}
                  onChange={() => handleGenderToggle("shopsWomen")}
                  className="h-5 w-5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800"
                />
                <span className="text-zinc-900 dark:text-white font-medium">Women&apos;s Clothing</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.shopsMen}
                  onChange={() => handleGenderToggle("shopsMen")}
                  className="h-5 w-5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800"
                />
                <span className="text-zinc-900 dark:text-white font-medium">Men&apos;s Clothing</span>
              </label>
            </div>
            {validationError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{validationError}</p>
            )}
          </div>

          {/* Women's Sizes */}
          {preferences.shopsWomen && (
            <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">
                Women&apos;s Size Ranges
              </h3>
              <div className="grid gap-6 sm:grid-cols-2">
                <SizeRangeSelect
                  label="Shoe Size"
                  options={sizeOptions.women.shoe}
                  minValue={preferences.womenShoeSizeMin}
                  maxValue={preferences.womenShoeSizeMax}
                  onMinChange={(v) => updatePreference("womenShoeSizeMin", v)}
                  onMaxChange={(v) => updatePreference("womenShoeSizeMax", v)}
                />
                <SizeRangeSelect
                  label="Top Size"
                  options={sizeOptions.women.top}
                  minValue={preferences.womenTopSizeMin}
                  maxValue={preferences.womenTopSizeMax}
                  onMinChange={(v) => updatePreference("womenTopSizeMin", v)}
                  onMaxChange={(v) => updatePreference("womenTopSizeMax", v)}
                />
                <SizeRangeSelect
                  label="Bottom Size"
                  options={sizeOptions.women.bottom}
                  minValue={preferences.womenBottomSizeMin}
                  maxValue={preferences.womenBottomSizeMax}
                  onMinChange={(v) => updatePreference("womenBottomSizeMin", v)}
                  onMaxChange={(v) => updatePreference("womenBottomSizeMax", v)}
                />
                <SizeRangeSelect
                  label="Dress Size"
                  options={sizeOptions.women.dress}
                  minValue={preferences.womenDressSizeMin}
                  maxValue={preferences.womenDressSizeMax}
                  onMinChange={(v) => updatePreference("womenDressSizeMin", v)}
                  onMaxChange={(v) => updatePreference("womenDressSizeMax", v)}
                />
              </div>
            </div>
          )}

          {/* Men's Sizes */}
          {preferences.shopsMen && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">
                Men&apos;s Size Ranges
              </h3>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <SizeRangeSelect
                  label="Shoe Size"
                  options={sizeOptions.men.shoe}
                  minValue={preferences.menShoeSizeMin}
                  maxValue={preferences.menShoeSizeMax}
                  onMinChange={(v) => updatePreference("menShoeSizeMin", v)}
                  onMaxChange={(v) => updatePreference("menShoeSizeMax", v)}
                />
                <SizeRangeSelect
                  label="Top Size"
                  options={sizeOptions.men.top}
                  minValue={preferences.menTopSizeMin}
                  maxValue={preferences.menTopSizeMax}
                  onMinChange={(v) => updatePreference("menTopSizeMin", v)}
                  onMaxChange={(v) => updatePreference("menTopSizeMax", v)}
                />
                <SizeRangeSelect
                  label="Bottom/Waist Size"
                  options={sizeOptions.men.bottom}
                  minValue={preferences.menBottomSizeMin}
                  maxValue={preferences.menBottomSizeMax}
                  onMinChange={(v) => updatePreference("menBottomSizeMin", v)}
                  onMaxChange={(v) => updatePreference("menBottomSizeMax", v)}
                />
              </div>
            </div>
          )}

          {/* No selection message */}
          {!preferences.shopsMen && !preferences.shopsWomen && (
            <div className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
              <p className="text-zinc-500 dark:text-zinc-400">
                Select Men&apos;s or Women&apos;s clothing above to set your size ranges
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSaving ? "Saving..." : "Save Preferences"}
            </button>
            {saveMessage && (
              <span className={`text-sm ${saveMessage.includes("Failed") ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                {saveMessage}
              </span>
            )}
          </div>
        </section>

        {/* Tracked Items */}
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Tracked Items
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {items.length} items being tracked
              </p>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-zinc-500 dark:text-zinc-400">No tracked items yet</p>
              <p className="mt-1 text-sm text-zinc-400">Click &quot;Track Price&quot; on products to start tracking</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {items.map((item) => item.product && (
                <div
                  key={item._id}
                  className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                          {item.product.brand}
                        </p>
                        <h3 className="font-medium text-zinc-900 dark:text-white truncate">
                          {item.product.name}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {item.product.sourcePlatform}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                          ${item.product.price.toFixed(2)}
                        </p>
                        {item.targetPrice && (
                          <p className="text-xs text-zinc-400">
                            Target: ${item.targetPrice.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 gap-2">
                    <Link
                      href={`/product/${item.productId}`}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleUntrack(item.productId)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Untrack
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Notification Settings */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Notification Settings
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Choose how you want to be notified about price changes
          </p>

          {/* SMS Alerts */}
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  SMS Alerts Enabled
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  You&apos;ll receive a text when tracked items hit your target price
                </p>
              </div>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    Email Notifications
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Receive email alerts for price drops and updates
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-zinc-900 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-zinc-500 dark:bg-zinc-700 dark:peer-checked:bg-white"></div>
              </label>
            </div>

            {emailNotifications && (
              <div className="mt-6 space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-700">
                {/* Email Address */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                  />
                </div>

                {/* Notification Types */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Notify me about:
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailPriceDrops}
                      onChange={(e) => setEmailPriceDrops(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Price drops on tracked items</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailTargetReached}
                      onChange={(e) => setEmailTargetReached(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Target price reached</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailWeeklyDigest}
                      onChange={(e) => setEmailWeeklyDigest(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Weekly price digest</span>
                  </label>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={handleEmailSettingsSave}
                    disabled={isEmailSaving || !email}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {isEmailSaving ? "Saving..." : "Save Email Settings"}
                  </button>
                  {emailSaveMessage && (
                    <span className={`text-sm ${emailSaveMessage.includes("Failed") ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                      {emailSaveMessage}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
