"use client";

import { useRouter } from "next/navigation";

interface SignInPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: string; // e.g., "add to wishlist", "add to closet", "track prices"
}

export function SignInPromptModal({ isOpen, onClose, action }: SignInPromptModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleSignIn = () => {
    onClose();
    router.push("/sign-in");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-moi-100 dark:bg-moi-900/30">
            <svg
              className="h-6 w-6 text-moi-600 dark:text-moi-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Sign in required
          </h3>

          {/* Message */}
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            You need to be signed in to {action}.
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSignIn}
            className="flex-1 rounded-lg bg-moi-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-moi-600"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
