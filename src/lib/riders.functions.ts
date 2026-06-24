import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStaff } from "@/integrations/supabase/auth-middleware";
import type { McfRiderCardRow, RegistrationMasterRow } from "@/lib/db-types";

const RIDER_SAFE_COLS =
  "registration_no, name_en, name_my, nrc_or_passport, dob, uci_id, team_club, final_category, gender, verification_status";

export type RiderSearchHit = Pick<
  RegistrationMasterRow,
  | "registration_no"
  | "name_en"
  | "name_my"
  | "team_club"
  | "final_category"
  | "verification_status"
>;

export const searchRiders = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((input: { query: string; limit?: number }) =>
    z.object({ query: z.string().min(1).max(80), limit: z.number().int().min(1).max(50).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const limit = data.limit ?? 20;
    const q = data.query.trim();
    // Search by registration_no, name_en, name_my, team_club, uci_id.
    // bib_no lives on mcf_rider_cards (handled separately later).
    const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const { data: rows, error } = await context.supabase
      .from("registration_master")
      .select(
        "registration_no, name_en, name_my, team_club, final_category, verification_status",
      )
      .or(
        [
          `registration_no.ilike.${like}`,
          `name_en.ilike.${like}`,
          `name_my.ilike.${like}`,
          `team_club.ilike.${like}`,
          `uci_id.ilike.${like}`,
        ].join(","),
      )
      .limit(limit);
    if (error) throw new Error(error.message);
    return (rows ?? []) as RiderSearchHit[];
  });

export const getRider = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((input: { registration_no: string }) =>
    z.object({ registration_no: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("registration_master")
      .select(RIDER_SAFE_COLS)
      .eq("registration_no", data.registration_no)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row as RegistrationMasterRow | null;
  });

export const getExistingCard = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((input: { registration_no: string }) =>
    z.object({ registration_no: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("mcf_rider_cards")
      .select("*")
      .eq("registration_no", data.registration_no)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row as McfRiderCardRow | null;
  });

const IssueInput = z.object({
  registration_no: z.string().min(1),
  member_no: z.string().min(1).nullable(),
  bib_no: z.string().nullable(),
  rfid_tag: z.string().nullable(),
  nrc: z.string().nullable(),
  dob: z.string().nullable(),
  uci_id: z.string().nullable(),
  team_club: z.string().nullable(),
  category: z.string().nullable(),
  valid_until: z.string().nullable(),
  photo_path: z.string().nullable(),
  status: z.enum(["draft", "issued"]),
});

export const issueRiderCard = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((input: z.input<typeof IssueInput>) => IssueInput.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      ...data,
      issued_by: context.userId,
      issued_at: data.status === "issued" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { data: row, error } = await (context.supabase
      .from("mcf_rider_cards") as unknown as {
        upsert: (
          v: typeof payload,
          opts: { onConflict: string },
        ) => { select: (cols: string) => { single: () => Promise<{ data: McfRiderCardRow; error: { message: string } | null }> } };
      })
      .upsert(payload, { onConflict: "registration_no" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as McfRiderCardRow;
  });

export const uploadRiderPhoto = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((input: { registration_no: string; fileBase64: string; contentType?: string }) =>
    z
      .object({
        registration_no: z.string().min(1),
        fileBase64: z.string().min(20),
        contentType: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${data.registration_no}/photo.jpg`;
    const bytes = base64ToUint8(data.fileBase64);
    const { error } = await supabaseAdmin.storage
      .from("mcf-rider-card-assets")
      .upload(path, bytes, {
        contentType: data.contentType ?? "image/jpeg",
        upsert: true,
      });
    if (error) throw new Error(error.message);
    return { path };
  });

export const getSignedPhotoUrl = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((input: { path: string }) =>
    z.object({ path: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("mcf-rider-card-assets")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

function base64ToUint8(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}