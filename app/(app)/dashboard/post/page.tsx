"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

/** Legacy route: opens the post-job modal on the dashboard. */
export default function PostTaskRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard?post=1");
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-sm text-slate-400"
      >
        Opening post job…
      </motion.div>
    </div>
  );
}
