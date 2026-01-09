"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface FindFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clerkId: string;
}

export function FindFriendsModal({ isOpen, onClose, clerkId }: FindFriendsModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchedPhone, setSearchedPhone] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Search for user by phone number
  const searchResult = useQuery(
    api.social.searchUserByPhone,
    searchedPhone ? { phoneNumber: searchedPhone, clerkId } : "skip"
  );

  // Get follow status if user found
  const followStatus = useQuery(
    api.social.getFollowStatus,
    searchResult?._id ? { clerkId, targetUserId: searchResult._id } : "skip"
  );

  const followUser = useMutation(api.social.followUser);
  const unfollowUser = useMutation(api.social.unfollowUser);
  const cancelFollowRequest = useMutation(api.social.cancelFollowRequest);

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");

    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length <= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else {
      // For international, just show with + prefix
      return `+${digits}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    // Clear search result when phone changes
    if (searchedPhone) {
      setSearchedPhone(null);
    }
  };

  const handleSearch = () => {
    if (!phoneNumber.trim()) return;
    setIsSearching(true);
    setSearchedPhone(phoneNumber);
    // The query will automatically run when searchedPhone is set
    setTimeout(() => setIsSearching(false), 500);
  };

  const handleFollow = async () => {
    if (!searchResult?._id) return;
    setActionInProgress(true);
    try {
      await followUser({ clerkId, targetUserId: searchResult._id });
    } catch (error) {
      console.error("Failed to follow:", error);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleUnfollow = async () => {
    if (!searchResult?._id) return;
    setActionInProgress(true);
    try {
      await unfollowUser({ clerkId, targetUserId: searchResult._id });
    } catch (error) {
      console.error("Failed to unfollow:", error);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!searchResult?._id) return;
    setActionInProgress(true);
    try {
      await cancelFollowRequest({ clerkId, targetUserId: searchResult._id });
    } catch (error) {
      console.error("Failed to cancel request:", error);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleClose = () => {
    setPhoneNumber("");
    setSearchedPhone(null);
    onClose();
  };

  if (!isOpen) return null;

  const userName = searchResult
    ? searchResult.firstName
      ? `${searchResult.firstName}${searchResult.lastName ? ` ${searchResult.lastName}` : ""}`
      : "armoi User"
    : null;

  const isPublic = searchResult?.isPublicCloset ?? true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Find Friends
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

        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Enter a phone number to find friends on armoi
        </p>

        {/* Phone Number Input */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Phone Number
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={!phoneNumber.trim() || isSearching}
              className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSearching ? "..." : "Search"}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchedPhone && (
          <div className="mt-6">
            {searchResult === undefined ? (
              // Loading
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
              </div>
            ) : searchResult === null ? (
              // Not found
              <div className="rounded-lg bg-zinc-100 p-4 text-center dark:bg-zinc-800">
                <p className="text-zinc-600 dark:text-zinc-400">
                  No user found with this phone number
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                  They may not have an account yet
                </p>
              </div>
            ) : (
              // User found
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="flex items-center gap-4">
                  {/* Avatar placeholder */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400 text-lg font-semibold text-white">
                    {userName?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {userName}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {isPublic ? "Public profile" : "Private profile"}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-4">
                  {followStatus?.isFollowing ? (
                    <button
                      onClick={handleUnfollow}
                      disabled={actionInProgress}
                      className="w-full rounded-lg border border-zinc-300 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {actionInProgress ? "..." : "Unfollow"}
                    </button>
                  ) : followStatus?.hasPendingRequest ? (
                    <button
                      onClick={handleCancelRequest}
                      disabled={actionInProgress}
                      className="w-full rounded-lg border border-moi-300 bg-moi-50 py-2 font-medium text-moi-700 transition-colors hover:bg-moi-100 disabled:opacity-50 dark:border-moi-600 dark:bg-moi-900/30 dark:text-moi-400"
                    >
                      {actionInProgress ? "..." : "Cancel Request"}
                    </button>
                  ) : (
                    <button
                      onClick={handleFollow}
                      disabled={actionInProgress}
                      className="w-full rounded-lg bg-purple-600 py-2 font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                    >
                      {actionInProgress
                        ? "..."
                        : isPublic
                        ? "Follow"
                        : "Request to Follow"}
                    </button>
                  )}
                </div>

                {/* Link to their closet if following */}
                {followStatus?.isFollowing && isPublic && (
                  <a
                    href={`/closet/${searchResult._id}`}
                    className="mt-2 block w-full rounded-lg border border-zinc-200 py-2 text-center text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    View Closet
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Close Button */}
        <div className="mt-6">
          <button
            onClick={handleClose}
            className="w-full rounded-lg border border-zinc-300 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
