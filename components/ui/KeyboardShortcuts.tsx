"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

interface KeyboardShortcutsProps {
  children: React.ReactNode;
}

export function KeyboardShortcuts({ children }: KeyboardShortcutsProps) {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape to blur inputs
        if (e.key === "Escape") {
          target.blur();
        }
        return;
      }

      // Cmd/Ctrl + K - Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Navigate to home and focus search
        if (window.location.pathname !== "/") {
          router.push("/");
        }
        // Focus the search input after a small delay
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="Search"], input[placeholder*="Describe"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }, 100);
      }

      // Keyboard navigation shortcuts
      switch (e.key) {
        case "g":
          // Wait for second key
          handleGotoShortcut();
          break;
        case "/":
          // Focus search
          e.preventDefault();
          const searchInput = document.querySelector('input[placeholder*="Search"], input[placeholder*="Describe"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          } else {
            router.push("/");
          }
          break;
        case "Escape":
          // Close any open modals/dropdowns
          document.body.click();
          break;
      }
    },
    [router]
  );

  const handleGotoShortcut = () => {
    let secondKeyTimeout: NodeJS.Timeout;

    const handleSecondKey = (e: KeyboardEvent) => {
      clearTimeout(secondKeyTimeout);
      window.removeEventListener("keydown", handleSecondKey);

      switch (e.key) {
        case "h":
          router.push("/");
          break;
        case "f":
          router.push("/favorites");
          break;
        case "d":
          router.push("/dashboard");
          break;
        case "c":
          router.push("/compare");
          break;
        case "p":
          router.push("/profile");
          break;
        case "t":
          router.push("/tools");
          break;
      }
    };

    window.addEventListener("keydown", handleSecondKey);
    secondKeyTimeout = setTimeout(() => {
      window.removeEventListener("keydown", handleSecondKey);
    }, 1000);
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return <>{children}</>;
}

// Keyboard shortcut hint component
export function ShortcutHint({ keys, className = "" }: { keys: string[]; className?: string }) {
  return (
    <span className={`hidden sm:inline-flex items-center gap-0.5 ${className}`}>
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
