import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db-types";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./client";

/**
 * Validates the request bearer token using a Supabase publishable-key client,
 * then exposes a per-request `supabase` client scoped to that user (RLS as the
 * signed-in user), plus `userId` and `email`.
 */
export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const authHeader = getRequestHeader("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Response("Unauthorized: No authorization header provided", { status: 401 });
    }
    const token = authHeader.slice("Bearer ".length).trim();

    const verifier = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await verifier.auth.getUser(token);
    if (error || !data.user) {
      throw new Response("Unauthorized: invalid session", { status: 401 });
    }

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    return next({
      context: {
        supabase,
        userId: data.user.id,
        email: data.user.email ?? null,
      },
    });
  },
);

/**
 * Gates a server fn to active MCF card staff. Reads the user's own row from
 * public.mcf_card_staff (RLS scoped to auth.uid()). NOTE: do not use the
 * app_private schema — it is not exposed to PostgREST.
 */
export const requireStaff = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase
      .from("mcf_card_staff")
      .select("user_id, active, display_name, email")
      .eq("user_id", context.userId)
      .maybeSingle<{
        user_id: string;
        active: boolean;
        display_name: string | null;
        email: string | null;
      }>();

    if (error) {
      throw new Response(`Staff lookup failed: ${error.message}`, { status: 500 });
    }
    if (!data || !data.active) {
      throw new Response("Forbidden: not an active MCF card staff member", { status: 403 });
    }

    return next({
      context: {
        staff: {
          userId: data.user_id,
          displayName: data.display_name,
          email: data.email,
        },
      },
    });
  });