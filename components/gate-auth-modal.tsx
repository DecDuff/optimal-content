"use client";

import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, Lock, User, X } from "lucide-react";

const STROKE = 1.25;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthMode = "signin" | "signup";

type Props = {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
  onSwitchMode: (mode: AuthMode) => void;
  onSubmitSuccess: (payload: { displayName: string; mode: AuthMode }) => void;
};

export function GateAuthModal({
  open,
  mode,
  onClose,
  onSwitchMode,
  onSubmitSuccess,
}: Props) {
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!open) setErrors({});
  }, [open, mode]);

  useEffect(() => {
    if (!shake) return;
    const id = window.setTimeout(() => setShake(false), 460);
    return () => window.clearTimeout(id);
  }, [shake]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const name = String(fd.get("name") ?? "").trim();
    const next: typeof errors = {};

    if (!emailRe.test(email)) {
      next.email = "Please enter a valid email.";
    }
    if (mode === "signup") {
      if (name.length < 2) next.name = "Please enter your name (2+ characters).";
      if (password.length < 8) {
        next.password = "Password must be at least 8 characters.";
      }
    } else {
      if (password.length < 1) next.password = "Please enter your password.";
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      setShake(true);
      return;
    }

    setErrors({});
    let displayName = name;
    if (mode === "signin") {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem("optimal-content-auth-display-name-v1")
          : null;
      if (stored?.trim()) {
        displayName = stored.trim();
      } else {
        displayName = email.split("@")[0] ?? "there";
      }
    }
    onSubmitSuccess({ displayName: displayName || "there", mode });
  };

  const title = mode === "signin" ? "Sign in" : "Create account";
  const subtitle =
    mode === "signin" ? "Welcome back to Optimal Content." : "Join the Rapid marketplace.";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="auth-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-xl"
          role="presentation"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative w-full max-w-[400px] overflow-hidden rounded-lg border border-zinc-800/50 bg-white/5 shadow-[0_0_0_1px_rgba(46,91,255,0.08),0_24px_80px_-24px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(46,91,255,0.12),transparent_55%)]" />

            <div className="relative border-b border-zinc-800/50 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Optimal Content
                  </p>
                  <h2 id="auth-modal-title" className="mt-1 text-lg font-semibold tracking-[-0.03em]">
                    {title}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
                </div>
                <motion.button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-md border border-zinc-800/50 p-1.5 text-zinc-500 transition hover:border-zinc-700/50 hover:text-white"
                >
                  <X className="h-4 w-4" strokeWidth={STROKE} />
                </motion.button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className={`relative space-y-3 px-5 py-5 ${shake ? "animate-error-shake" : ""}`}
            >
              {mode === "signup" ? (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-zinc-500"
                  >
                    <User className="h-3 w-3" strokeWidth={STROKE} aria-hidden />
                    Name
                  </label>
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Alex Chen"
                    className="w-full rounded-md border border-zinc-800/50 bg-black/30 px-3 py-2.5 text-xs text-white outline-none backdrop-blur-sm placeholder:text-zinc-600 focus:border-[#2E5BFF]/60 focus:ring-1 focus:ring-[#2E5BFF]/30"
                  />
                  {errors.name ? (
                    <motion.p
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 text-[11px] font-medium text-red-400"
                    >
                      {errors.name}
                    </motion.p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-zinc-500"
                >
                  <Mail className="h-3 w-3" strokeWidth={STROKE} aria-hidden />
                  Email
                </label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full rounded-md border border-zinc-800/50 bg-black/30 px-3 py-2.5 text-xs text-white outline-none backdrop-blur-sm placeholder:text-zinc-600 focus:border-[#2E5BFF]/60 focus:ring-1 focus:ring-[#2E5BFF]/30"
                />
                {errors.email ? (
                  <motion.p
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-[11px] font-medium text-red-400"
                  >
                    {errors.email}
                  </motion.p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-zinc-500"
                >
                  <Lock className="h-3 w-3" strokeWidth={STROKE} aria-hidden />
                  Password
                </label>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-zinc-800/50 bg-black/30 px-3 py-2.5 text-xs text-white outline-none backdrop-blur-sm placeholder:text-zinc-600 focus:border-[#2E5BFF]/60 focus:ring-1 focus:ring-[#2E5BFF]/30"
                />
                {errors.password ? (
                  <motion.p
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-[11px] font-medium text-red-400"
                  >
                    {errors.password}
                  </motion.p>
                ) : null}
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="mt-2 flex w-full items-center justify-center rounded-md border border-[#2E5BFF] bg-[#2E5BFF] px-4 py-2.5 text-xs font-medium text-white shadow-[0_0_28px_-8px_rgba(46,91,255,0.45)] hover:bg-[#2547d4]"
              >
                {mode === "signin" ? "Continue" : "Create account"}
              </motion.button>

              <p className="text-center text-[11px] text-zinc-500">
                {mode === "signin" ? (
                  <>
                    New here?{" "}
                    <button
                      type="button"
                      className="font-medium text-[#2E5BFF] hover:underline"
                      onClick={() => onSwitchMode("signup")}
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="font-medium text-[#2E5BFF] hover:underline"
                      onClick={() => onSwitchMode("signin")}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
