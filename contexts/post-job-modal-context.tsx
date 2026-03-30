"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PostJobModal } from "@/components/post-job-modal";

type Ctx = {
  openPostJob: () => void;
  closePostJob: () => void;
  isOpen: boolean;
};

const PostJobModalContext = createContext<Ctx | null>(null);

export function PostJobModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openPostJob = useCallback(() => setOpen(true), []);
  const closePostJob = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({
      openPostJob,
      closePostJob,
      isOpen: open,
    }),
    [open, openPostJob, closePostJob]
  );

  return (
    <PostJobModalContext.Provider value={value}>
      {children}
      <PostJobModal open={open} onClose={closePostJob} />
    </PostJobModalContext.Provider>
  );
}

export function usePostJobModal() {
  const ctx = useContext(PostJobModalContext);
  if (!ctx) throw new Error("usePostJobModal must be used within PostJobModalProvider");
  return ctx;
}
