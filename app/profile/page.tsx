"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { api } from "@/convex/_generated/api";
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
    bottomWaist: ["28", "29", "30", "31", "32", "33", "34", "36", "38", "40", "42"],
    bottomLength: ["28", "29", "30", "31", "32", "33", "34", "36"],
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
  menBottomWaistMin: string;
  menBottomWaistMax: string;
  menBottomLengthMin: string;
  menBottomLengthMax: string;
}

// Format phone number as (XXX) XXX-XXXX
function formatPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return "No phone number";
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");
  // Handle US numbers (10 or 11 digits)
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  // Return original if not a standard format
  return phone;
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
  menBottomWaistMin: "",
  menBottomWaistMax: "",
  menBottomLengthMin: "",
  menBottomLengthMax: "",
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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch for theme
  useEffect(() => {
    setMounted(true);
  }, []);

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  const updatePreferences = useMutation(api.users.updateUserPreferences);
  const updateEmailSettings = useMutation(api.users.updateEmailSettings);

  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Notification settings
  const [smsNotifications, setSmsNotifications] = useState(true);
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
        menBottomWaistMin: prefs.menBottomWaistMin ?? prefs.menBottomSizeMin ?? "",
        menBottomWaistMax: prefs.menBottomWaistMax ?? prefs.menBottomSizeMax ?? "",
        menBottomLengthMin: prefs.menBottomLengthMin ?? "",
        menBottomLengthMax: prefs.menBottomLengthMax ?? "",
      });
      // Load notification settings
      setSmsNotifications(prefs.smsNotifications ?? true);
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
        smsNotifications,
      });
      setEmailSaveMessage("Notification settings saved!");
      setTimeout(() => setEmailSaveMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save notification settings:", error);
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {clerkUser.firstName ? `${clerkUser.firstName}'s Profile` : "Your Profile"}
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          {formatPhoneNumber(convexUser?.phoneNumber || clerkUser.primaryPhoneNumber?.phoneNumber)}
        </p>

        {/* Shopping Preferences */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Shopping Preferences
          </h2>

          {/* Gender Selection */}
          <div className="mt-4">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              I'm shopping for: <span className="text-red-500">*</span>
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
                  label="Shoe Size (US)"
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
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <SizeRangeSelect
                  label="Shoe Size (US)"
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
                  label="Bottom Waist"
                  options={sizeOptions.men.bottomWaist}
                  minValue={preferences.menBottomWaistMin}
                  maxValue={preferences.menBottomWaistMax}
                  onMinChange={(v) => updatePreference("menBottomWaistMin", v)}
                  onMaxChange={(v) => updatePreference("menBottomWaistMax", v)}
                />
                <SizeRangeSelect
                  label="Bottom Length"
                  options={sizeOptions.men.bottomLength}
                  minValue={preferences.menBottomLengthMin}
                  maxValue={preferences.menBottomLengthMax}
                  onMinChange={(v) => updatePreference("menBottomLengthMin", v)}
                  onMaxChange={(v) => updatePreference("menBottomLengthMax", v)}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${smsNotifications ? 'bg-green-100 dark:bg-green-900/30' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                  <svg className={`h-5 w-5 ${smsNotifications ? 'text-green-600 dark:text-green-400' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    SMS Alerts
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {smsNotifications
                      ? "You'll receive a text when tracked items hit your target price"
                      : "SMS notifications are disabled"}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={smsNotifications}
                  onChange={(e) => setSmsNotifications(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-zinc-900 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-zinc-500 dark:bg-zinc-700 dark:peer-checked:bg-white"></div>
              </label>
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

          {/* Save Notification Settings Button - visible when email is disabled */}
          {!emailNotifications && (
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={handleEmailSettingsSave}
                disabled={isEmailSaving}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {isEmailSaving ? "Saving..." : "Save Notification Settings"}
              </button>
              {emailSaveMessage && (
                <span className={`text-sm ${emailSaveMessage.includes("Failed") ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                  {emailSaveMessage}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Settings Section */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Settings
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Customize your app experience
          </p>

          <div className="mt-4 space-y-4">
            {/* Dark Mode Toggle */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    {mounted && resolvedTheme === "dark" ? (
                      <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">
                      Dark Mode
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {mounted && resolvedTheme === "dark" ? "Currently using dark theme" : "Currently using light theme"}
                    </p>
                  </div>
                </div>
                {mounted && (
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={resolvedTheme === "dark"}
                      onChange={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-zinc-900 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-zinc-500 dark:bg-zinc-700 dark:peer-checked:bg-white"></div>
                  </label>
                )}
              </div>
            </div>

            {/* Sign Out */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">
                      Sign Out
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Sign out of your account
                    </p>
                  </div>
                </div>
                <SignOutButton redirectUrl="/">
                  <button className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30">
                    Sign Out
                  </button>
                </SignOutButton>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
