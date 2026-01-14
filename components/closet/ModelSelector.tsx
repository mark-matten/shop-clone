"use client";

import { Id } from "@/convex/_generated/dataModel";
import { PhotoManager } from "./PhotoManager";

type ModelMode = "generic" | "custom" | "user";

interface ModelSelectorProps {
  clerkId: string;
  modelMode: ModelMode;
  setModelMode: (mode: ModelMode) => void;
  modelGender: "male" | "female";
  setModelGender: (gender: "male" | "female") => void;
  modelHeight: number;
  setModelHeight: (height: number) => void;
  modelWeight: number;
  setModelWeight: (weight: number) => void;
  modelSkinTone: number;
  setModelSkinTone: (tone: number) => void;
  otherDetails: string;
  setOtherDetails: (details: string) => void;
  isPaidUser: boolean;
  genericUsedToday: number;
  freeLimit: number;
  showPhotoManager: boolean;
  setShowPhotoManager: (show: boolean) => void;
  selectedPhotoId: Id<"user_photos"> | null;
  setSelectedPhotoId: (id: Id<"user_photos"> | null) => void;
  setSelectedPhotoStorageId: (id: Id<"_storage"> | null) => void;
  saveModelPrefs: (height: number, weight: number, skinTone: number) => void;
  variant?: "mobile" | "desktop";
}

export function ModelSelector({
  clerkId,
  modelMode,
  setModelMode,
  modelGender,
  setModelGender,
  modelHeight,
  setModelHeight,
  modelWeight,
  setModelWeight,
  modelSkinTone,
  setModelSkinTone,
  otherDetails,
  setOtherDetails,
  isPaidUser,
  genericUsedToday,
  freeLimit,
  showPhotoManager,
  setShowPhotoManager,
  selectedPhotoId,
  setSelectedPhotoId,
  setSelectedPhotoStorageId,
  saveModelPrefs,
  variant = "mobile",
}: ModelSelectorProps) {
  const handleSelectPhoto = (photoId: Id<"user_photos"> | null, storageId: Id<"_storage"> | null) => {
    setSelectedPhotoId(photoId);
    setSelectedPhotoStorageId(storageId);
  };

  const isMobile = variant === "mobile";
  const buttonPadding = isMobile ? "px-2 py-2" : "px-3 py-2";
  const labelWidth = isMobile ? "w-16" : "w-20";
  const valueWidth = isMobile ? "w-10" : "w-12";

  const getSkinToneLabel = (value: number) => {
    if (value < 20) return "Fair";
    if (value < 40) return "Light";
    if (value < 60) return "Med";
    if (value < 80) return "Tan";
    return "Deep";
  };

  return (
    <div className="space-y-2">
      {/* Model Type Toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => {
            setModelMode("generic");
            setSelectedPhotoId(null);
            setSelectedPhotoStorageId(null);
            setShowPhotoManager(false);
          }}
          className={`flex-1 rounded-lg ${buttonPadding} text-xs font-medium transition-colors ${
            modelMode === "generic"
              ? "bg-moi-400 text-white"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          Generic
        </button>
        <button
          onClick={() => {
            setModelMode("custom");
            setSelectedPhotoId(null);
            setSelectedPhotoStorageId(null);
            setShowPhotoManager(false);
          }}
          className={`flex-1 rounded-lg ${buttonPadding} text-xs font-medium transition-colors ${
            modelMode === "custom"
              ? "bg-moi-400 text-white"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          Custom
        </button>
        <button
          onClick={() => {
            setModelMode("user");
            setShowPhotoManager(true);
          }}
          className={`flex-1 rounded-lg ${buttonPadding} text-xs font-medium transition-colors ${
            modelMode === "user"
              ? "bg-moi-400 text-white"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          My Photo
        </button>
      </div>

      {/* Usage counter for free users - only on Generic tab */}
      {!isPaidUser && modelMode === "generic" && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
          {freeLimit - genericUsedToday} of {freeLimit} free try-ons remaining today
        </p>
      )}

      {/* Generic Model Options - Gender only */}
      {modelMode === "generic" && (
        <div className="space-y-2">
          <GenderSelector
            modelGender={modelGender}
            setModelGender={setModelGender}
            labelWidth={labelWidth}
          />
        </div>
      )}

      {/* Custom Model Options - Full customization */}
      {modelMode === "custom" && (
        <div className="space-y-2">
          <GenderSelector
            modelGender={modelGender}
            setModelGender={setModelGender}
            labelWidth={labelWidth}
          />

          {/* Height */}
          <div className="flex items-center gap-3">
            <span className={`text-xs text-zinc-600 dark:text-zinc-400 ${labelWidth}`}>Height</span>
            <span className={`text-xs text-zinc-900 dark:text-white ${valueWidth}`}>
              {Math.floor(modelHeight / 12)}'{modelHeight % 12}"
            </span>
            <input
              type="range"
              min="54"
              max="78"
              value={modelHeight}
              onChange={(e) => setModelHeight(Number(e.target.value))}
              onTouchEnd={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
              onMouseUp={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
              className="flex-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700 accent-moi-400"
            />
          </div>

          {/* Weight */}
          <div className="flex items-center gap-3">
            <span className={`text-xs text-zinc-600 dark:text-zinc-400 ${labelWidth}`}>Weight</span>
            <span className={`text-xs text-zinc-900 dark:text-white ${valueWidth}`}>{modelWeight} lbs</span>
            <input
              type="range"
              min="90"
              max="280"
              step="5"
              value={modelWeight}
              onChange={(e) => setModelWeight(Number(e.target.value))}
              onTouchEnd={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
              onMouseUp={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
              className="flex-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700 accent-moi-400"
            />
          </div>

          {/* Skin Tone */}
          <div className="flex items-center gap-3">
            <span className={`text-xs text-zinc-600 dark:text-zinc-400 ${labelWidth}`}>Skin Tone</span>
            <span className={`text-xs text-zinc-900 dark:text-white ${valueWidth}`}>
              {getSkinToneLabel(modelSkinTone)}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={modelSkinTone}
              onChange={(e) => setModelSkinTone(Number(e.target.value))}
              onTouchEnd={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
              onMouseUp={() => saveModelPrefs(modelHeight, modelWeight, modelSkinTone)}
              className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-moi-400"
              style={{ background: "linear-gradient(to right, #fde8dc, #c68642, #5c3d2e)" }}
            />
          </div>

          {/* Other Details */}
          <OtherDetailsInput value={otherDetails} onChange={setOtherDetails} />
        </div>
      )}

      {/* Photo Manager for User Mode */}
      {modelMode === "user" && showPhotoManager && (
        <div className="space-y-2">
          <PhotoManager
            clerkId={clerkId}
            onSelectPhoto={handleSelectPhoto}
            selectedPhotoId={selectedPhotoId}
          />
          <OtherDetailsInput value={otherDetails} onChange={setOtherDetails} />
        </div>
      )}
    </div>
  );
}

// Sub-components for cleaner code
function GenderSelector({
  modelGender,
  setModelGender,
  labelWidth,
}: {
  modelGender: "male" | "female";
  setModelGender: (gender: "male" | "female") => void;
  labelWidth: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs text-zinc-600 dark:text-zinc-400 ${labelWidth}`}>Gender</span>
      <div className="flex-1 flex gap-2">
        <button
          onClick={() => setModelGender("male")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
            modelGender === "male"
              ? "bg-moi-400 text-white"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
          }`}
        >
          Male
        </button>
        <button
          onClick={() => setModelGender("female")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
            modelGender === "female"
              ? "bg-moi-400 text-white"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
          }`}
        >
          Female
        </button>
      </div>
    </div>
  );
}

function OtherDetailsInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Other details (e.g., cuffed pants, tucked shirt)"
      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-moi-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
    />
  );
}
