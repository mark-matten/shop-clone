"use client";

import { useState, useMemo } from "react";
import {
  getSizeChart,
  findMatchingSizes,
  getLetterSize,
  type SizeSystem,
  type Gender,
  type ClothingType,
} from "@/lib/sizeConversions";

interface SizeConverterProps {
  defaultGender?: Gender;
  defaultClothingType?: ClothingType;
  compact?: boolean;
}

export function SizeConverter({
  defaultGender = "women",
  defaultClothingType = "shoes",
  compact = false,
}: SizeConverterProps) {
  const [gender, setGender] = useState<Gender>(defaultGender);
  const [clothingType, setClothingType] = useState<ClothingType>(defaultClothingType);
  const [selectedSystem, setSelectedSystem] = useState<SizeSystem>("US");
  const [selectedSize, setSelectedSize] = useState<string>("");

  const sizeChart = useMemo(
    () => getSizeChart(gender, clothingType),
    [gender, clothingType]
  );

  const availableSizes = useMemo(() => {
    return sizeChart.map((s) => s[selectedSystem]);
  }, [sizeChart, selectedSystem]);

  const convertedSizes = useMemo(() => {
    if (!selectedSize) return null;
    return findMatchingSizes(selectedSize, selectedSystem, gender, clothingType);
  }, [selectedSize, selectedSystem, gender, clothingType]);

  const letterSize = useMemo(() => {
    if (!convertedSizes || gender !== "women" || clothingType === "shoes") return null;
    return getLetterSize(convertedSizes.US);
  }, [convertedSizes, gender, clothingType]);

  // Reset size when chart changes
  const handleGenderChange = (newGender: Gender) => {
    setGender(newGender);
    setSelectedSize("");
    // Reset to valid clothing type for men
    if (newGender === "men" && clothingType === "dresses") {
      setClothingType("tops");
    }
  };

  const handleClothingTypeChange = (newType: ClothingType) => {
    setClothingType(newType);
    setSelectedSize("");
  };

  const handleSystemChange = (newSystem: SizeSystem) => {
    setSelectedSystem(newSystem);
    setSelectedSize("");
  };

  const clothingTypes: { value: ClothingType; label: string; icon: string }[] = [
    { value: "shoes", label: "Shoes", icon: "👟" },
    { value: "tops", label: "Tops", icon: "👕" },
    { value: "bottoms", label: "Bottoms", icon: "👖" },
    ...(gender === "women"
      ? [{ value: "dresses" as ClothingType, label: "Dresses", icon: "👗" }]
      : []),
  ];

  const systems: { value: SizeSystem; label: string; flag: string }[] = [
    { value: "US", label: "US", flag: "🇺🇸" },
    { value: "UK", label: "UK", flag: "🇬🇧" },
    { value: "EU", label: "EU", flag: "🇪🇺" },
  ];

  if (compact) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick selectors */}
          <select
            value={gender}
            onChange={(e) => handleGenderChange(e.target.value as Gender)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="women">Women&apos;s</option>
            <option value="men">Men&apos;s</option>
          </select>

          <select
            value={clothingType}
            onChange={(e) => handleClothingTypeChange(e.target.value as ClothingType)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            {clothingTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>

          <select
            value={selectedSystem}
            onChange={(e) => handleSystemChange(e.target.value as SizeSystem)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            {systems.map((sys) => (
              <option key={sys.value} value={sys.value}>
                {sys.flag} {sys.label}
              </option>
            ))}
          </select>

          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">Select size</option>
            {availableSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          {convertedSizes && (
            <div className="flex gap-2 text-sm">
              {systems
                .filter((s) => s.value !== selectedSystem)
                .map((sys) => (
                  <span
                    key={sys.value}
                    className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800"
                  >
                    {sys.flag} {convertedSizes[sys.value]}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
          <svg
            className="h-5 w-5 text-indigo-600 dark:text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Size Converter
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Convert between US, UK, and EU sizes
          </p>
        </div>
      </div>

      {/* Gender Selection */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Category
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => handleGenderChange("women")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              gender === "women"
                ? "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            Women&apos;s
          </button>
          <button
            onClick={() => handleGenderChange("men")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              gender === "men"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            Men&apos;s
          </button>
        </div>
      </div>

      {/* Clothing Type Selection */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Item Type
        </label>
        <div className="grid grid-cols-4 gap-2">
          {clothingTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => handleClothingTypeChange(type.value)}
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-3 text-sm transition-colors ${
                clothingType === type.value
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              <span className="text-xl">{type.icon}</span>
              <span className="text-xs font-medium">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Size System Selection */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          I know my size in
        </label>
        <div className="flex gap-2">
          {systems.map((sys) => (
            <button
              key={sys.value}
              onClick={() => handleSystemChange(sys.value)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedSystem === sys.value
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              {sys.flag} {sys.label}
            </button>
          ))}
        </div>
      </div>

      {/* Size Selection */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Select your {selectedSystem} size
        </label>
        <div className="flex flex-wrap gap-2">
          {availableSizes.map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={`min-w-[3rem] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                selectedSize === size
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Conversion Results */}
      {convertedSizes && (
        <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-4 dark:from-indigo-900/20 dark:to-purple-900/20">
          <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Your size equivalents:
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {systems.map((sys) => (
              <div
                key={sys.value}
                className={`rounded-lg p-3 text-center ${
                  sys.value === selectedSystem
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-zinc-800"
                }`}
              >
                <div className="text-lg">{sys.flag}</div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {sys.label}
                </div>
                <div
                  className={`mt-1 text-xl font-bold ${
                    sys.value === selectedSystem
                      ? "text-white"
                      : "text-zinc-900 dark:text-white"
                  }`}
                >
                  {convertedSizes[sys.value]}
                </div>
              </div>
            ))}
          </div>

          {letterSize && (
            <div className="mt-3 rounded-lg bg-white p-3 text-center dark:bg-zinc-800">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Letter size:{" "}
              </span>
              <span className="font-bold text-zinc-900 dark:text-white">
                {letterSize}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Size Chart */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
          View full size chart
        </summary>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  US
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  UK
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  EU
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sizeChart.map((row, idx) => (
                <tr
                  key={idx}
                  className={
                    selectedSize &&
                    row[selectedSystem] === selectedSize
                      ? "bg-indigo-50 dark:bg-indigo-900/20"
                      : ""
                  }
                >
                  <td className="whitespace-nowrap px-4 py-2 text-sm text-zinc-900 dark:text-white">
                    {row.US}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-sm text-zinc-900 dark:text-white">
                    {row.UK}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-sm text-zinc-900 dark:text-white">
                    {row.EU}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
