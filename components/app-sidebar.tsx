"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutList,
  LogOut,
  Menu,
  PlusCircle,
  Rss,
  Trophy,
  User,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { usePostJobModal } from "@/contexts/post-job-modal-context";
import { useSessionProfile } from "@/hooks/use-session-profile";
import { useUnreadTaskMessages } from "@/hooks/use-unread-task-messages";

const STROKE = 1.25;

const secondaryNav = [
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "My Profile", icon: User },
] as const;

function IconWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      className="inline-flex shrink-0"
      whileHover={{
        scale: 1.08,
        rotate: [0, -4, 4, -2, 2, 0],
        transition: { duration: 0.32, ease: "easeOut" },
      }}
      whileTap={{ scale: 0.94 }}
    >
      {children}
    </motion.span>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { openPostJob } = usePostJobModal();
  const { profile, loading } = useSessionProfile();
  const { unreadTaskIds } = useUnreadTaskMessages();
  const [mobileOpen, setMobileOpen] = useState(false);
  const hasUnreadChats = unreadTaskIds.size > 0;
  const isCreator = profile?.role === "creator";
  const isOptimizer = profile?.role === "optimizer";

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.push("/login");
    router.refresh();
  }

  const NavBody = (
    <>
      <div className="border-b border-zinc-800/50 px-4 py-4">
        <Link href="/dashboard" className="text-sm font-semibold tracking-[-0.02em] text-white">
          Optimal Content
        </Link>
        <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-zinc-500">Marketplace</p>
        {!loading && profile ? (
          <p className="mt-2 text-[10px] capitalize text-zinc-600">
            Signed in as <span className="text-zinc-400">{profile.role}</span>
          </p>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className={`relative flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition ${
            pathname === "/dashboard"
              ? "border border-zinc-800/40 bg-white/[0.06] text-white shadow-[0_0_24px_-8px_rgba(46,91,255,0.25)]"
              : "border border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
          }`}
        >
          <IconWrap>
            <LayoutList className="h-4 w-4 text-zinc-500" strokeWidth={STROKE} aria-hidden />
          </IconWrap>
          Dashboard
          {hasUnreadChats ? (
            <span
              className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.95)] ring-2 ring-[#09090b]"
              title="Unread task messages"
              aria-hidden
            />
          ) : null}
        </Link>

        {isOptimizer ? (
          <Link
            href="/feed"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition ${
              pathname === "/feed" || pathname.startsWith("/feed/")
                ? "border border-zinc-800/40 bg-white/[0.06] text-white"
                : "border border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
            }`}
          >
            <IconWrap>
              <Rss className="h-4 w-4 text-zinc-500" strokeWidth={STROKE} aria-hidden />
            </IconWrap>
            Job feed
          </Link>
        ) : null}

        {isCreator ? (
          <motion.button
            type="button"
            onClick={() => {
              openPostJob();
              setMobileOpen(false);
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-shimmer flex w-full items-center gap-2 rounded-md border border-indigo-500/70 bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-left text-xs font-medium text-white shadow-[0_0_24px_-6px_rgba(99,102,241,0.5)] transition"
          >
            <IconWrap>
              <PlusCircle className="h-4 w-4 text-white" strokeWidth={STROKE} aria-hidden />
            </IconWrap>
            Post a job
          </motion.button>
        ) : null}

        {secondaryNav.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition ${
                isActive
                  ? "border border-zinc-800/40 bg-white/[0.06] text-white"
                  : "border border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <IconWrap>
                <Icon className="h-4 w-4 text-zinc-500" strokeWidth={STROKE} aria-hidden />
              </IconWrap>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800/50 p-2">
        <motion.button
          type="button"
          onClick={handleLogout}
          whileTap={{ scale: 0.98 }}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-300"
        >
          <IconWrap>
            <LogOut className="h-4 w-4" strokeWidth={STROKE} aria-hidden />
          </IconWrap>
          Log out
        </motion.button>
      </div>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-800/50 bg-[#09090b]/80 px-4 backdrop-blur-xl md:hidden">
        <span className="text-xs font-semibold tracking-tight">Optimal Content</span>
        <motion.button
          type="button"
          aria-label="Open menu"
          whileTap={{ scale: 0.92 }}
          onClick={() => setMobileOpen(true)}
          className="rounded-md border border-zinc-800/50 p-2 text-zinc-300"
        >
          <Menu className="h-4 w-4" strokeWidth={STROKE} />
        </motion.button>
      </header>

      <aside className="relative z-[45] hidden h-screen w-[260px] shrink-0 flex-col border-r border-zinc-800/50 bg-white/5 backdrop-blur-xl md:flex">
        {NavBody}
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[48] bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed left-0 top-0 z-[49] flex h-full w-[min(280px,88vw)] flex-col border-r border-zinc-800/50 bg-white/5 shadow-[8px_0_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl md:hidden"
            >
              <div className="flex items-center justify-end border-b border-zinc-800/50 p-2">
                <motion.button
                  type="button"
                  aria-label="Close"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-2 text-zinc-400"
                >
                  <X className="h-4 w-4" strokeWidth={STROKE} />
                </motion.button>
              </div>
              {NavBody}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
