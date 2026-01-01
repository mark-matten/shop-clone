"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OnboardingModal } from "@/components/onboarding";

export function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const { user: clerkUser, isLoaded } = useUser();

  // Get user from Convex
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  useEffect(() => {
    // Only check once when user data is loaded
    if (!isLoaded || hasChecked) return;

    // If user is signed in but hasn't set preferences, show onboarding
    if (clerkUser && convexUser !== undefined) {
      setHasChecked(true);

      // Check if user has completed onboarding (has set gender preferences)
      const hasPreferences = convexUser?.preferences?.shopsWomen || convexUser?.preferences?.shopsMen;

      // Check localStorage for dismissed state
      const dismissed = localStorage.getItem(`onboarding_dismissed_${clerkUser.id}`);

      if (!hasPreferences && !dismissed) {
        // Small delay to let the page render first
        setTimeout(() => setShowOnboarding(true), 500);
      }
    }
  }, [clerkUser, convexUser, isLoaded, hasChecked]);

  const handleComplete = () => {
    setShowOnboarding(false);
    if (clerkUser?.id) {
      localStorage.setItem(`onboarding_dismissed_${clerkUser.id}`, "true");
    }
  };

  return (
    <>
      {children}
      {showOnboarding && <OnboardingModal onComplete={handleComplete} />}
    </>
  );
}
