"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

interface FollowingListProps {
  clerkId: string;
  onFindFriends: () => void;
}

export function FollowingList({ clerkId, onFindFriends }: FollowingListProps) {
  const following = useQuery(api.social.getFollowing, { clerkId });
  const unfollowUser = useMutation(api.social.unfollowUser);
  const updateAlertSettings = useMutation(api.social.updateFollowAlertSettings);

  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleUnfollow = async (targetUserId: Id<"users">) => {
    setActionInProgress(targetUserId);
    try {
      await unfollowUser({ clerkId, targetUserId });
    } catch (error) {
      console.error("Failed to unfollow:", error);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleAlert = async (
    followingId: Id<"users">,
    field: "notifyNewOwnedItems" | "notifyNewWishlistItems" | "notifyNewOutfits" | "alertsEnabled",
    currentValue: boolean
  ) => {
    try {
      await updateAlertSettings({
        clerkId,
        followingId,
        [field]: !currentValue,
      });
    } catch (error) {
      console.error("Failed to update alert settings:", error);
    }
  };

  if (following === undefined) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (following.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
        <svg
          className="mx-auto h-12 w-12 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="mt-4 text-sm font-medium text-zinc-900 dark:text-white">
          Not following anyone yet
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Find friends to see their closets and outfits
        </p>
        <button
          onClick={onFindFriends}
          className="mt-4 rounded-lg bg-moi-400 px-4 py-2 text-sm font-medium text-white hover:bg-moi-500"
        >
          Find Friends
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {following.map((follow) => {
        const userName = follow.user.firstName
          ? `${follow.user.firstName}${follow.user.lastName ? ` ${follow.user.lastName}` : ""}`
          : "armoi User";
        const isExpanded = expandedUserId === follow.followingId;
        const isPublic = follow.user.isPublicCloset;

        return (
          <div
            key={follow._id}
            className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
          >
            {/* Main row */}
            <div className="flex items-center gap-3 p-3">
              {/* Avatar */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moi-400 to-moi-300 text-sm font-semibold text-white">
                {userName.charAt(0).toUpperCase()}
              </div>

              {/* Name and status */}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-zinc-900 dark:text-white">
                  {userName}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {isPublic ? "Public" : "Private"} profile
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* View closet link (only for public) */}
                {isPublic && (
                  <Link
                    href={`/closet/${follow.followingId}`}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    title="View closet"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </Link>
                )}

                {/* Settings toggle */}
                <button
                  onClick={() => setExpandedUserId(isExpanded ? null : follow.followingId)}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  title="Alert settings"
                >
                  <svg
                    className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Expanded settings */}
            {isExpanded && (
              <div className="border-t border-zinc-200 p-3 dark:border-zinc-700">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Notification Settings
                </p>

                {/* Master toggle */}
                <label className="flex items-center justify-between py-2">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    Enable notifications
                  </span>
                  <button
                    onClick={() =>
                      handleToggleAlert(
                        follow.followingId as Id<"users">,
                        "alertsEnabled",
                        follow.alertSettings.alertsEnabled
                      )
                    }
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      follow.alertSettings.alertsEnabled
                        ? "bg-moi-600"
                        : "bg-zinc-300 dark:bg-zinc-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        follow.alertSettings.alertsEnabled
                          ? "left-[22px]"
                          : "left-0.5"
                      }`}
                    />
                  </button>
                </label>

                {/* Individual toggles (only if master is enabled) */}
                {follow.alertSettings.alertsEnabled && (
                  <div className="mt-2 space-y-2 border-t border-zinc-100 pt-2 dark:border-zinc-700">
                    <label className="flex items-center justify-between py-1">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        New closet items
                      </span>
                      <button
                        onClick={() =>
                          handleToggleAlert(
                            follow.followingId as Id<"users">,
                            "notifyNewOwnedItems",
                            follow.alertSettings.notifyNewOwnedItems
                          )
                        }
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          follow.alertSettings.notifyNewOwnedItems
                            ? "bg-moi-500"
                            : "bg-zinc-300 dark:bg-zinc-600"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            follow.alertSettings.notifyNewOwnedItems
                              ? "left-[18px]"
                              : "left-0.5"
                          }`}
                        />
                      </button>
                    </label>

                    <label className="flex items-center justify-between py-1">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        New wishlist items
                      </span>
                      <button
                        onClick={() =>
                          handleToggleAlert(
                            follow.followingId as Id<"users">,
                            "notifyNewWishlistItems",
                            follow.alertSettings.notifyNewWishlistItems
                          )
                        }
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          follow.alertSettings.notifyNewWishlistItems
                            ? "bg-moi-500"
                            : "bg-zinc-300 dark:bg-zinc-600"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            follow.alertSettings.notifyNewWishlistItems
                              ? "left-[18px]"
                              : "left-0.5"
                          }`}
                        />
                      </button>
                    </label>

                    <label className="flex items-center justify-between py-1">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        New saved outfits
                      </span>
                      <button
                        onClick={() =>
                          handleToggleAlert(
                            follow.followingId as Id<"users">,
                            "notifyNewOutfits",
                            follow.alertSettings.notifyNewOutfits
                          )
                        }
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          follow.alertSettings.notifyNewOutfits
                            ? "bg-moi-500"
                            : "bg-zinc-300 dark:bg-zinc-600"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            follow.alertSettings.notifyNewOutfits
                              ? "left-[18px]"
                              : "left-0.5"
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                )}

                {/* Unfollow button */}
                <button
                  onClick={() => handleUnfollow(follow.followingId as Id<"users">)}
                  disabled={actionInProgress === follow.followingId}
                  className="mt-3 w-full rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  {actionInProgress === follow.followingId ? "..." : "Unfollow"}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Find more friends button */}
      <button
        onClick={onFindFriends}
        className="w-full rounded-lg border border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
      >
        + Find more friends
      </button>
    </div>
  );
}
