"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface UserPhoto {
  _id: Id<"user_photos">;
  clerkId: string;
  storageId: Id<"_storage">;
  fileName: string;
  uploadedAt: number;
  isDefault: boolean;
  url: string | null;
}

interface PhotoManagerProps {
  clerkId: string;
  onSelectPhoto?: (photoId: Id<"user_photos"> | null, storageId: Id<"_storage"> | null) => void;
  selectedPhotoId?: Id<"user_photos"> | null;
}

export function PhotoManager({ clerkId, onSelectPhoto, selectedPhotoId }: PhotoManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photos = useQuery(api.storage.getUserPhotos, { clerkId });
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const saveUserPhoto = useMutation(api.storage.saveUserPhoto);
  const setDefaultPhoto = useMutation(api.storage.setDefaultPhoto);
  const deleteUserPhoto = useMutation(api.storage.deleteUserPhoto);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be less than 10MB");
      return;
    }

    setIsUploading(true);

    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload the file
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await response.json();

      // Save photo metadata
      await saveUserPhoto({
        clerkId,
        storageId,
        fileName: file.name,
        setAsDefault: !photos || photos.length === 0,
      });
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  }, [clerkId, generateUploadUrl, saveUserPhoto, photos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSetDefault = async (photoId: Id<"user_photos">) => {
    await setDefaultPhoto({ clerkId, photoId });
  };

  const handleDelete = async (photoId: Id<"user_photos">) => {
    if (confirm("Are you sure you want to delete this photo?")) {
      await deleteUserPhoto({ clerkId, photoId });
      if (selectedPhotoId === photoId && onSelectPhoto) {
        onSelectPhoto(null, null);
      }
    }
  };

  const handleSelect = (photo: { _id: Id<"user_photos">; storageId: Id<"_storage"> }) => {
    if (onSelectPhoto) {
      if (selectedPhotoId === photo._id) {
        onSelectPhoto(null, null); // Deselect
      } else {
        onSelectPhoto(photo._id, photo.storageId);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          isDragging
            ? "border-[#D4AF37] bg-[#D4AF37]/10"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <svg
              className="h-8 w-8 animate-spin text-[#D4AF37]"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Uploading...</p>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-10 w-10 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Drag and drop a photo, or{" "}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="font-medium text-[#D4AF37] hover:underline"
              >
                browse
              </button>
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              PNG, JPG up to 10MB
            </p>
          </>
        )}
      </div>

      {/* Privacy Notice */}
      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Your photos are stored securely and only used for virtual try-on.
      </p>

      {/* Photo Grid */}
      {photos && photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(photos as UserPhoto[]).map((photo) => (
            <div
              key={photo._id}
              className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                selectedPhotoId === photo._id
                  ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/20"
                  : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-600"
              }`}
            >
              {photo.url ? (
                <img
                  src={photo.url}
                  alt="User photo"
                  className="h-full w-full cursor-pointer object-cover"
                  onClick={() => handleSelect(photo)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                  <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Default Badge */}
              {photo.isDefault && (
                <div className="absolute left-1 top-1 rounded-full bg-[#D4AF37] px-2 py-0.5 text-xs font-medium text-white">
                  Default
                </div>
              )}

              {/* Selected Check */}
              {selectedPhotoId === photo._id && (
                <div className="absolute right-1 top-1 rounded-full bg-[#D4AF37] p-1">
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              {/* Action Buttons */}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                {!photo.isDefault && (
                  <button
                    onClick={() => handleSetDefault(photo._id)}
                    className="rounded-full bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                    title="Set as default"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => handleDelete(photo._id)}
                  className="rounded-full bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-red-500/80"
                  title="Delete"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Photos Message */}
      {photos && photos.length === 0 && (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          No photos uploaded yet. Upload a photo to use for virtual try-on.
        </p>
      )}
    </div>
  );
}
