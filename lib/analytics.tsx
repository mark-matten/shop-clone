"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  ReactNode,
} from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";

// Generate or retrieve session ID (only call on client)
function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
}

// Event types
export type AnalyticsEventType =
  | "page_view"
  | "search"
  | "product_view"
  | "add_to_favorites"
  | "remove_from_favorites"
  | "track_price"
  | "external_click"
  | "share"
  | "filter_applied"
  | "sort_applied"
  | "compare_add"
  | "compare_remove"
  | "collection_create"
  | "collection_add"
  | "size_convert"
  | "signup"
  | "signin"
  | "signout";

interface AnalyticsContextValue {
  trackEvent: (eventType: AnalyticsEventType, eventData?: Record<string, unknown>) => void;
  trackPageView: () => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const { user } = useUser();
  const pathname = usePathname();
  const trackEventMutation = useMutation(api.analytics.trackEvent);
  const lastPageRef = useRef<string>("");
  const [isMounted, setIsMounted] = useState(false);

  // Only run analytics on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const trackEvent = useCallback(
    async (eventType: AnalyticsEventType, eventData?: Record<string, unknown>) => {
      if (!isMounted) return;

      try {
        const sessionId = getSessionId();
        if (!sessionId) return;

        await trackEventMutation({
          clerkId: user?.id,
          sessionId,
          eventType,
          eventData,
          page: window.location.pathname,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
        });
      } catch (error) {
        // Silently fail for analytics
        console.debug("Analytics tracking error:", error);
      }
    },
    [user?.id, trackEventMutation, isMounted]
  );

  const trackPageView = useCallback(() => {
    if (!isMounted) return;
    const currentPage = window.location.pathname;

    // Avoid duplicate page views
    if (currentPage === lastPageRef.current) return;
    lastPageRef.current = currentPage;

    trackEvent("page_view", {
      path: currentPage,
      title: document.title,
    });
  }, [trackEvent, isMounted]);

  // Track page views on route change
  useEffect(() => {
    if (isMounted) {
      trackPageView();
    }
  }, [pathname, trackPageView, isMounted]);

  return (
    <AnalyticsContext.Provider value={{ trackEvent, trackPageView }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    // Return no-op functions if outside provider
    return {
      trackEvent: () => {},
      trackPageView: () => {},
    };
  }
  return context;
}

// Convenience hooks for common events
export function useTrackProductView() {
  const { trackEvent } = useAnalytics();

  return useCallback(
    (productId: string, productName: string, brand: string) => {
      trackEvent("product_view", { productId, productName, brand });
    },
    [trackEvent]
  );
}

export function useTrackSearch() {
  const { trackEvent } = useAnalytics();

  return useCallback(
    (query: string, resultCount: number, filters?: Record<string, unknown>) => {
      trackEvent("search", { query, resultCount, filters });
    },
    [trackEvent]
  );
}

export function useTrackExternalClick() {
  const { trackEvent } = useAnalytics();

  return useCallback(
    (productId: string, platform: string, url: string) => {
      trackEvent("external_click", { productId, platform, url });
    },
    [trackEvent]
  );
}

export function useTrackShare() {
  const { trackEvent } = useAnalytics();

  return useCallback(
    (contentType: string, contentId: string, method: string) => {
      trackEvent("share", { contentType, contentId, method });
    },
    [trackEvent]
  );
}
