"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Check if we're in mock mode (missing env vars)
const isMockMode = !convexUrl || !clerkKey;

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function Providers({ children }: { children: React.ReactNode }) {
  // Mock mode - render children without providers
  if (isMockMode) {
    return <MockModeProvider>{children}</MockModeProvider>;
  }

  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex!} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

function MockModeProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
        Mock Mode - Configure .env.local for full functionality
      </div>
      <div className="pt-10">{children}</div>
    </>
  );
}

export { isMockMode };
