"use client";

interface SkipLinkProps {
  href?: string;
  children?: React.ReactNode;
}

export function SkipLink({
  href = "#main-content",
  children = "Skip to main content"
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-zinc-900 focus:shadow-lg focus:ring-2 focus:ring-emerald-500 dark:focus:bg-zinc-900 dark:focus:text-white"
    >
      {children}
    </a>
  );
}

// Visually hidden component for screen reader text
export function VisuallyHidden({
  children,
  as: Component = "span"
}: {
  children: React.ReactNode;
  as?: React.ElementType;
}) {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
}

// Focus trap for modals and dialogs
export function useFocusTrap(isActive: boolean) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element when trap activates
    firstElement?.focus();

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [isActive]);

  return containerRef;
}

import React from "react";

// Announce changes to screen readers
export function useAnnounce() {
  const [announcement, setAnnouncement] = React.useState("");

  const announce = React.useCallback((message: string, politeness: "polite" | "assertive" = "polite") => {
    // Clear first to ensure the announcement is read even if it's the same text
    setAnnouncement("");
    requestAnimationFrame(() => {
      setAnnouncement(message);
    });
  }, []);

  const Announcer = React.useMemo(() => {
    return function AnnouncerComponent() {
      return (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </div>
      );
    };
  }, [announcement]);

  return { announce, Announcer };
}

// Keyboard navigation hook
export function useKeyboardNavigation<T>(
  items: T[],
  onSelect: (item: T) => void,
  options?: {
    wrap?: boolean;
    orientation?: "horizontal" | "vertical" | "both";
  }
) {
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const { wrap = true, orientation = "vertical" } = options || {};

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const prevKeys = orientation === "horizontal" ? ["ArrowLeft"] : ["ArrowUp"];
      const nextKeys = orientation === "horizontal" ? ["ArrowRight"] : ["ArrowDown"];

      if (orientation === "both") {
        prevKeys.push("ArrowUp", "ArrowLeft");
        nextKeys.push("ArrowDown", "ArrowRight");
      }

      if (prevKeys.includes(e.key)) {
        e.preventDefault();
        setActiveIndex((prev) => {
          if (prev <= 0) return wrap ? items.length - 1 : 0;
          return prev - 1;
        });
      } else if (nextKeys.includes(e.key)) {
        e.preventDefault();
        setActiveIndex((prev) => {
          if (prev >= items.length - 1) return wrap ? 0 : items.length - 1;
          return prev + 1;
        });
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < items.length) {
          onSelect(items[activeIndex]);
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveIndex(items.length - 1);
      }
    },
    [items, onSelect, wrap, orientation, activeIndex]
  );

  return { activeIndex, setActiveIndex, handleKeyDown };
}
