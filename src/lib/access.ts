import { supabase } from "@/integrations/supabase/client";

export type AccessInfo =
  | { kind: "staff"; isAdmin: boolean; displayName: string | null }
  | { kind: "organizer"; isAdmin: false }
  | { kind: "none"; isAdmin: false };

/** Client-side access check for gating UI (server fns enforce for real). */
export async function getAccessInfo(userId: string): Promise<AccessInfo> {
  const { data: staff } = await supabase
    .from("mcf_card_staff")
    .select("active, role, display_name")
    .eq("user_id", userId)
    .maybeSingle<{ active: boolean; role: string; display_name: string | null }>();
  if (staff?.active) {
    return { kind: "staff", isAdmin: staff.role === "admin", displayName: staff.display_name };
  }
  const { data: orgs } = await supabase
    .from("event_organizers")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .limit(1);
  if (orgs && orgs.length > 0) return { kind: "organizer", isAdmin: false };
  return { kind: "none", isAdmin: false };
}
