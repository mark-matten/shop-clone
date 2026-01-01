"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { AnalyticsProvider } from "@/lib/analytics";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";
import { OnboardingWrapper } from "@/components/ui/OnboardingWrapper";
import { KeyboardShortcuts } from "@/components/ui/KeyboardShortcuts";
import { PWAInstallPrompt } from "@/components/ui/PWAInstallPrompt";

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
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ClerkProvider>
          <ConvexProviderWithClerk client={convex!} useAuth={useAuth}>
            <ToastProvider>
              <KeyboardShortcuts>
                <AnalyticsProvider>
                  <OnboardingWrapper>
                    {children}
                    <PWAInstallPrompt />
                  </OnboardingWrapper>
                </AnalyticsProvider>
              </KeyboardShortcuts>
            </ToastProvider>
          </ConvexProviderWithClerk>
        </ClerkProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function MockModeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="fixed left-0 right-0 top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
        Mock Mode - Configure .env.local for full functionality
      </div>
      <div className="pt-10">{children}</div>
    </ThemeProvider>
  );
}

export { isMockMode };
