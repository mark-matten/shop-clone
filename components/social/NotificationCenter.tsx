"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

interface NotificationCenterProps {
  clerkId: string;
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = "all" | "social" | "closet" | "alerts";

export function NotificationCenter({ clerkId, isOpen, onClose }: NotificationCenterProps) {
  const notifications = useQuery(api.notifications.getNotifications, { clerkId, limit: 30 });
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const deleteNotification = useMutation(api.notifications.deleteNotification);

  // Social mutations for inline actions
  const approveRequest = useMutation(api.social.approveFollowRequest);
  const rejectRequest = useMutation(api.social.rejectFollowRequest);

  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const toast = useToast();

  // Filter notifications based on selected tab
  const filteredNotifications = notifications?.filter((n) => {
    if (filter === "all") return true;
    if (filter === "social") {
      return ["new_follower", "follow_request", "follow_request_approved"].includes(n.type);
    }
    if (filter === "closet") {
      return ["new_closet_item", "new_wishlist_item", "new_outfit"].includes(n.type);
    }
    if (filter === "alerts") {
      return ["price_drop", "target_reached"].includes(n.type);
    }
    return true;
  });

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead({ clerkId });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
    try {
      await markAsRead({ notificationId });
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleDelete = async (notificationId: Id<"notifications">) => {
    try {
      await deleteNotification({ clerkId, notificationId });
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete notification");
    }
  };

  const handleApproveRequest = async (requesterId: Id<"users">, notificationId: Id<"notifications">) => {
    setActionInProgress(notificationId);
    try {
      await approveRequest({ clerkId, requesterId });
      await markAsRead({ notificationId });
      toast.success("Follow request accepted");
    } catch (error) {
      console.error("Failed to approve:", error);
      toast.error("Failed to accept request");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectRequest = async (requesterId: Id<"users">, notificationId: Id<"notifications">) => {
    setActionInProgress(notificationId);
    try {
      await rejectRequest({ clerkId, requesterId });
      await markAsRead({ notificationId });
      toast.success("Follow request declined");
    } catch (error) {
      console.error("Failed to reject:", error);
      toast.error("Failed to decline request");
    } finally {
      setActionInProgress(null);
    }
  };

  if (!isOpen) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_follower":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-moi-100 text-moi-600 dark:bg-moi-900/30 dark:text-moi-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      case "follow_request":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-moi-100 text-moi-600 dark:bg-moi-900/30 dark:text-moi-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        );
      case "follow_request_approved":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "new_closet_item":
      case "new_wishlist_item":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
        );
      case "new_outfit":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case "price_drop":
      case "target_reached":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl dark:bg-zinc-900 sm:right-4 sm:top-4 sm:h-[calc(100vh-2rem)] sm:rounded-2xl">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between p-4 pb-2">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {unreadCount} unread
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-sm font-medium text-moi-600 hover:text-moi-700 dark:text-moi-400"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Close notifications"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 px-4 pb-3">
            {(["all", "social", "closet", "alerts"] as FilterType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === tab
                    ? "bg-moi-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                {tab === "all" && "All"}
                {tab === "social" && "Social"}
                {tab === "closet" && "Closet"}
                {tab === "alerts" && "Alerts"}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="h-[calc(100%-7rem)] overflow-y-auto">
          {notifications === undefined ? (
            <div className="animate-pulse space-y-3 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              ))}
            </div>
          ) : filteredNotifications?.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <svg
                className="h-16 w-16 text-zinc-300 dark:text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <p className="mt-4 text-zinc-500 dark:text-zinc-400">
                {filter === "all"
                  ? "No notifications yet"
                  : `No ${filter} notifications`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredNotifications?.map((notification) => (
                <div
                  key={notification._id}
                  className={`relative p-4 ${
                    !notification.read
                      ? "bg-moi-50/50 dark:bg-moi-900/10"
                      : ""
                  }`}
                  onClick={() => !notification.read && handleMarkAsRead(notification._id)}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    {getNotificationIcon(notification.type)}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-900 dark:text-white">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatTime(notification.createdAt)}
                      </p>

                      {/* Follow request actions */}
                      {notification.type === "follow_request" && notification.fromUserId && (
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveRequest(
                                notification.fromUserId as Id<"users">,
                                notification._id
                              );
                            }}
                            disabled={actionInProgress === notification._id}
                            className="rounded-lg bg-moi-600 px-3 py-1 text-xs font-medium text-white hover:bg-moi-700 disabled:opacity-50"
                          >
                            Accept
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectRequest(
                                notification.fromUserId as Id<"users">,
                                notification._id
                              );
                            }}
                            disabled={actionInProgress === notification._id}
                            className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {/* View closet link for closet/outfit notifications */}
                      {(notification.type === "new_closet_item" ||
                        notification.type === "new_wishlist_item" ||
                        notification.type === "new_outfit") &&
                        notification.fromUserId && (
                          <Link
                            href={`/closet/${notification.fromUserId}`}
                            className="mt-2 inline-block text-xs font-medium text-moi-600 hover:text-moi-700 dark:text-moi-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View their closet
                          </Link>
                        )}
                    </div>

                    {/* Unread indicator */}
                    {!notification.read && (
                      <div className="h-2 w-2 flex-shrink-0 rounded-full bg-moi-600" />
                    )}

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification._id);
                      }}
                      className="flex-shrink-0 rounded p-2 -m-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                      aria-label="Delete notification"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Notification badge component for the header
export function NotificationBadge({ clerkId }: { clerkId: string }) {
  const unreadCount = useQuery(api.notifications.getUnreadCount, { clerkId });

  if (!unreadCount || unreadCount === 0) return null;

  return (
    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}
