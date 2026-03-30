"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { ProfilePrefsProvider } from "@/app/context/profile-prefs-context";
import { PostJobModalProvider } from "@/contexts/post-job-modal-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ProfilePrefsProvider>
      <PostJobModalProvider>
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "border border-white/10 bg-slate-950/90 backdrop-blur-xl text-slate-200",
            },
          }}
        />
      </PostJobModalProvider>
    </ProfilePrefsProvider>
  );
}
