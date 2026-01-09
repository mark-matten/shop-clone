"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface EditImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  clerkId: string;
  itemId: string;
  currentImageUrl?: string;
  onImageUpdated?: () => void;
}

export function EditImageModal({
  isOpen,
  onClose,
  clerkId,
  itemId,
  currentImageUrl,
  onImageUpdated,
}: EditImageModalProps) {
  const [mode, setMode] = useState<"url" | "upload" | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateClosetItem = useMutation(api.closet.updateClosetItem);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const resetState = () => {
    setMode(null);
    setImageUrl("");
    setPreviewUrl(null);
    setIsLoading(false);
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setImageUrl(url);
    setError(null);

    // Preview the image if it looks like a valid URL
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be less than 10MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  const handleSaveUrl = async () => {
    if (!imageUrl) {
      setError("Please enter an image URL");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateClosetItem({
        clerkId,
        itemId: itemId as Id<"closet_items">,
        imageUrl,
      });
      onImageUpdated?.();
      handleClose();
    } catch (err) {
      console.error("Failed to update image:", err);
      setError("Failed to update image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadFile = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Please select an image");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload the file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();

      // Update the closet item with the new storage ID
      await updateClosetItem({
        clerkId,
        itemId: itemId as Id<"closet_items">,
        generatedImageStorageId: storageId,
      });

      onImageUpdated?.();
      handleClose();
    } catch (err) {
      console.error("Failed to upload image:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {mode === null ? "Edit Image" : mode === "url" ? "Paste Image URL" : "Upload Image"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Image Preview */}
        {mode === null && currentImageUrl && (
          <div className="mb-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Current image:</p>
            <div className="relative aspect-square w-32 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
              <img
                src={currentImageUrl}
                alt="Current item"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Mode Selection */}
        {mode === null && (
          <div className="space-y-3">
            <button
              onClick={() => setMode("url")}
              className="w-full flex items-center gap-3 rounded-lg border border-zinc-200 p-4 text-left hover:border-moi-400 hover:bg-moi-50 dark:border-zinc-700 dark:hover:border-moi-400 dark:hover:bg-moi-900/20 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-moi-100 text-moi-600 dark:bg-moi-900/30 dark:text-moi-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">Paste URL</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Enter an image URL or product link</p>
              </div>
            </button>

            <button
              onClick={() => setMode("upload")}
              className="w-full flex items-center gap-3 rounded-lg border border-zinc-200 p-4 text-left hover:border-moi-400 hover:bg-moi-50 dark:border-zinc-700 dark:hover:border-moi-400 dark:hover:bg-moi-900/20 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-moi-100 text-moi-600 dark:bg-moi-900/30 dark:text-moi-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">Upload Image</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Choose from camera roll or files</p>
              </div>
            </button>
          </div>
        )}

        {/* URL Input Mode */}
        {mode === "url" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={handleUrlChange}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 focus:border-moi-400 focus:outline-none focus:ring-1 focus:ring-moi-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            {/* Preview */}
            {previewUrl && (
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Preview:</p>
                <div className="relative aspect-square w-full max-w-[200px] rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={() => setError("Could not load image from URL")}
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setMode(null)}
                className="flex-1 rounded-lg border border-zinc-300 py-2 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Back
              </button>
              <button
                onClick={handleSaveUrl}
                disabled={!imageUrl || isLoading}
                className="flex-1 rounded-lg bg-moi-400 py-2 font-medium text-white hover:bg-moi-500 disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Upload Mode */}
        {mode === "upload" && (
          <div className="space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 p-8 hover:border-moi-400 dark:border-zinc-600 dark:hover:border-moi-400 transition-colors"
              >
                <svg className="h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Tap to select image
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  JPG, PNG, WEBP up to 10MB
                </p>
              </button>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Preview:</p>
                <div className="relative aspect-square w-full max-w-[200px] rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 mx-auto">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMode(null);
                  setPreviewUrl(null);
                }}
                className="flex-1 rounded-lg border border-zinc-300 py-2 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Back
              </button>
              <button
                onClick={handleUploadFile}
                disabled={!previewUrl || isLoading}
                className="flex-1 rounded-lg bg-moi-400 py-2 font-medium text-white hover:bg-moi-500 disabled:opacity-50"
              >
                {isLoading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
