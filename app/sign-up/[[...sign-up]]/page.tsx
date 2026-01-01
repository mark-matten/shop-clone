"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-white dark:bg-zinc-900 shadow-lg",
            headerTitle: "text-zinc-900 dark:text-white",
            headerSubtitle: "text-zinc-600 dark:text-zinc-400",
            formFieldLabel: "text-zinc-700 dark:text-zinc-300",
            formFieldInput: "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white",
            formButtonPrimary: "bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",
            footerActionLink: "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
          },
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/"
      />
    </div>
  );
}
