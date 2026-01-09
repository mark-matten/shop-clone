"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface FollowersListProps {
  clerkId: string;
}

export function FollowersList({ clerkId }: FollowersListProps) {
  const followers = useQuery(api.social.getFollowers, { clerkId });
  const pendingRequests = useQuery(api.social.getPendingFollowRequests, { clerkId });
  const removeFollower = useMutation(api.social.removeFollower);
  const approveRequest = useMutation(api.social.approveFollowRequest);
  const rejectRequest = useMutation(api.social.rejectFollowRequest);

  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [showPendingRequests, setShowPendingRequests] = useState(true);

  const handleRemoveFollower = async (followerId: Id<"users">) => {
    if (!confirm("Remove this follower? They won't be notified.")) return;
    setActionInProgress(followerId);
    try {
      await removeFollower({ clerkId, followerId });
    } catch (error) {
      console.error("Failed to remove follower:", error);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleApproveRequest = async (requesterId: Id<"users">) => {
    setActionInProgress(requesterId);
    try {
      await approveRequest({ clerkId, requesterId });
    } catch (error) {
      console.error("Failed to approve request:", error);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectRequest = async (requesterId: Id<"users">) => {
    setActionInProgress(requesterId);
    try {
      await rejectRequest({ clerkId, requesterId });
    } catch (error) {
      console.error("Failed to reject request:", error);
    } finally {
      setActionInProgress(null);
    }
  };

  if (followers === undefined || pendingRequests === undefined) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  const hasPendingRequests = pendingRequests.length > 0;
  const hasFollowers = followers.length > 0;

  if (!hasPendingRequests && !hasFollowers) {
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
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <h3 className="mt-4 text-sm font-medium text-zinc-900 dark:text-white">
          No followers yet
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Share your closet to let friends follow you
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending Requests Section */}
      {hasPendingRequests && (
        <div className="rounded-lg border border-moi-200 bg-moi-50 dark:border-moi-800 dark:bg-moi-900/20">
          <button
            onClick={() => setShowPendingRequests(!showPendingRequests)}
            className="flex w-full items-center justify-between p-3"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-moi-400 text-xs font-bold text-white">
                {pendingRequests.length}
              </span>
              <span className="font-medium text-moi-700 dark:text-moi-300">
                Follow Requests
              </span>
            </div>
            <svg
              className={`h-5 w-5 text-moi-600 transition-transform dark:text-moi-400 ${
                showPendingRequests ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showPendingRequests && (
            <div className="border-t border-moi-200 dark:border-moi-800">
              {pendingRequests.map((request) => {
                const userName = request.user.firstName
                  ? `${request.user.firstName}${request.user.lastName ? ` ${request.user.lastName}` : ""}`
                  : "armoi User";

                return (
                  <div
                    key={request._id}
                    className="flex items-center gap-3 border-b border-moi-100 p-3 last:border-b-0 dark:border-moi-800/50"
                  >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moi-400 to-moi-300 text-sm font-semibold text-white">
                      {userName.charAt(0).toUpperCase()}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-zinc-900 dark:text-white">
                        {userName}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Wants to follow you
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveRequest(request.requesterId as Id<"users">)}
                        disabled={actionInProgress === request.requesterId}
                        className="rounded-lg bg-moi-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-moi-700 disabled:opacity-50"
                      >
                        {actionInProgress === request.requesterId ? "..." : "Accept"}
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.requesterId as Id<"users">)}
                        disabled={actionInProgress === request.requesterId}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Followers List */}
      {hasFollowers && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {followers.length} {followers.length === 1 ? "Follower" : "Followers"}
          </h3>
          <div className="space-y-2">
            {followers.map((follower) => {
              const userName = follower.user.firstName
                ? `${follower.user.firstName}${follower.user.lastName ? ` ${follower.user.lastName}` : ""}`
                : "armoi User";

              return (
                <div
                  key={follower._id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moi-400 to-moi-300 text-sm font-semibold text-white">
                    {userName.charAt(0).toUpperCase()}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-white">
                      {userName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Following since{" "}
                      {new Date(follower.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveFollower(follower.followerId as Id<"users">)}
                    disabled={actionInProgress === follower.followerId}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 disabled:opacity-50 dark:hover:bg-zinc-700"
                    title="Remove follower"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
