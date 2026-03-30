"use client";

import { useEffect, useState } from "react";

const QUERY = "(min-width: 1024px)";

/** Matches Tailwind `lg` breakpoint. */
export function useMinLg(): boolean {
  const [lg, setLg] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const apply = () => setLg(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return lg;
}
