"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const err = searchParams.get("error");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("creator");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(err ? "Authentication failed." : null);

  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            data: {
              role,
              display_name: displayName.trim() || email.split("@")[0],
            },
          },
        });
        if (error) throw error;
        setMessage("Check your email to confirm, or sign in if confirmations are disabled.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const safeNext =
          next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
        router.push(safeNext);
        router.refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-white">
      <Link href="/" className="mb-8 text-xs font-medium text-zinc-500 hover:text-[#2e5bff]">
        ← Optimal Content
      </Link>
      <div className="w-full max-w-md rounded-xl border border-zinc-800/50 bg-white/5 p-8 backdrop-blur-xl">
        <h1 className="text-xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Creators post retention tasks · Optimizers deliver outcomes
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" ? (
            <>
              <div>
                <label className="text-xs text-zinc-500">Display name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800/50 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[#2e5bff]/50"
                  placeholder="Alex"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Role</label>
                <div className="mt-2 flex gap-2">
                  {(["creator", "optimizer"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium capitalize ${
                        role === r
                          ? "border-[#2e5bff] bg-[#2e5bff]/15 text-white"
                          : "border-zinc-800/50 text-zinc-400"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}
          <div>
            <label className="text-xs text-zinc-500">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800/50 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[#2e5bff]/50"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800/50 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[#2e5bff]/50"
            />
          </div>
          {message ? <p className="text-xs text-amber-400">{message}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-[#2e5bff] bg-[#2e5bff] py-2.5 text-sm font-medium text-white hover:bg-[#2547d4] disabled:opacity-50"
          >
            {loading ? "…" : mode === "signin" ? "Continue" : "Sign up"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMessage(null);
          }}
          className="mt-4 w-full text-center text-xs text-zinc-500 hover:text-[#2e5bff]"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
