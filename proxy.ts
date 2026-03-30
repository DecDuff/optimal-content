import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/feed/:path*",
    "/tasks/:path*",
    "/profile/:path*",
    "/leaderboard/:path*",
    "/optimizers/:path*",
    "/admin/:path*",
    "/login",
    "/auth/callback",
  ],
};
