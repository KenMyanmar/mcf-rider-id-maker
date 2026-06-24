import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db-types";
import { SUPABASE_URL } from "./client";

// Service-role client. NEVER import this from a client-reachable module at
// top level. Only import it inside a createServerFn `.handler()` body with
// `await import("@/integrations/supabase/client.server")`.
export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL,
  process.env.MCF_SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);