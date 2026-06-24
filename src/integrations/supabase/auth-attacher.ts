import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

/**
 * Client-side: attach the current Supabase access token as a Bearer header
 * to every server-function call. Server middleware then validates it.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return next({ headers });
  },
);