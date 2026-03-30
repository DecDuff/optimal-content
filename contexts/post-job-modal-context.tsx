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
import type { DirectRequestTarget } from "@/types/direct-request";

export type { DirectRequestTarget };

type Ctx = {
  openPostJob: () => void;
  openDirectRequest: (target: DirectRequestTarget) => void;
  closePostJob: () => void;
  isOpen: boolean;
};

const PostJobModalContext = createContext<Ctx | null>(null);

export function PostJobModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [directRequest, setDirectRequest] = useState<DirectRequestTarget | null>(null);

  const openPostJob = useCallback(() => {
    setDirectRequest(null);
    setOpen(true);
  }, []);
  const openDirectRequest = useCallback((target: DirectRequestTarget) => {
    setDirectRequest(target);
    setOpen(true);
  }, []);
  const closePostJob = useCallback(() => {
    setOpen(false);
    setDirectRequest(null);
  }, []);

  const value = useMemo(
    () => ({
      openPostJob,
      openDirectRequest,
      closePostJob,
      isOpen: open,
    }),
    [open, openPostJob, openDirectRequest, closePostJob]
  );

  return (
    <PostJobModalContext.Provider value={value}>
      {children}
      <PostJobModal open={open} onClose={closePostJob} directRequest={directRequest} />
    </PostJobModalContext.Provider>
  );
}

export function usePostJobModal() {
  const ctx = useContext(PostJobModalContext);
  if (!ctx) throw new Error("usePostJobModal must be used within PostJobModalProvider");
  return ctx;
}
