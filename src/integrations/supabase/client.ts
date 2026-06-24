import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db-types";

// Public anon/publishable key — safe to ship to browser.
export const SUPABASE_URL = "https://iqhplmlwxwrkggvzvovf.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxaHBsbWx3eHdya2dndnp2b3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NzkyNzAsImV4cCI6MjA5NjU1NTI3MH0.wWjsmHY-Lg1DXth-rRI8KesV2rS8bPQuIKHZOoNsffo";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});