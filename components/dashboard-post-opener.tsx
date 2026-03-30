"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { usePostJobModal } from "@/contexts/post-job-modal-context";

export function DashboardPostOpener() {
  const searchParams = useSearchParams();
  const { openPostJob } = usePostJobModal();
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    if (searchParams.get("post") === "1") {
      opened.current = true;
      openPostJob();
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams, openPostJob]);

  return null;
}
