import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Optimal Content to post jobs or claim optimizer work.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen flex-col items-center justify-center bg-black px-6"
          aria-busy="true"
          aria-label="Loading sign-in"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-400" />
          <div className="mt-6 h-3 w-32 animate-pulse rounded bg-white/10" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
