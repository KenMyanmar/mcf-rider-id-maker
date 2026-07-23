import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStaff } from "@/integrations/supabase/auth-middleware";
import type { McfRiderCardRow, RegistrationMasterRow } from "@/lib/db-types";

const RIDER_SAFE_COLS =
  "registration_no, name_en, name_my, nrc_or_passport, dob, uci_id, team_club, final_category, gender, verification_status, father_name, phone, address, mcf_id";

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

const CreateRiderInput = z.object({
  name_en: z.string().trim().min(1).max(120),
  name_my: z.string().trim().max(120).nullable().optional(),
  father_name: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().min(1).max(40),
  nrc_or_passport: z.string().trim().max(60).nullable().optional(),
  dob: z.string().trim().nullable().optional(),
  gender: z.string().trim().nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  team_club: z.string().trim().max(120).nullable().optional(),
  final_category: z.string().trim().max(60).nullable().optional(),
  uci_id: z.string().trim().max(40).nullable().optional(),
  mcf_id: z.string().trim().max(40).nullable().optional(),
  confirm_duplicate: z.boolean().optional(),
});

function nextRegNo(current: string | null): string {
  const n = current ? parseInt(current.slice("NC26-".length), 10) : 0;
  const next = (Number.isFinite(n) ? n : 0) + 1;
  return `NC26-${String(next).padStart(4, "0")}`;
}

export const findPossibleDuplicates = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((input: { name_en?: string; phone?: string }) =>
    z
      .object({
        name_en: z.string().trim().optional(),
        phone: z.string().trim().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const name = data.name_en?.trim() ?? "";
    const phone = data.phone?.trim() ?? "";
    if (!name && !phone) return [];
    const parts: string[] = [];
    if (phone) parts.push(`phone.eq.${phone}`);
    if (name) {
      const like = `%${name.replace(/[%_]/g, (m) => `\\${m}`)}%`;
      parts.push(`name_en.ilike.${like}`);
    }
    const { data: rows, error } = await context.supabase
      .from("registration_master")
      .select("registration_no, name_en, phone, team_club, verification_status")
      .or(parts.join(","))
      .limit(10);
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<
      Pick<
        RegistrationMasterRow,
        "registration_no" | "name_en" | "phone" | "team_club" | "verification_status"
      >
    >;
  });

export const createRider = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((input: z.input<typeof CreateRiderInput>) => CreateRiderInput.parse(input))
  .handler(async ({ data, context }) => {
    const trimOrNull = (v: string | null | undefined) => {
      const t = (v ?? "").trim();
      return t === "" ? null : t;
    };
    const base = {
      name_en: data.name_en.trim(),
      name_my: trimOrNull(data.name_my),
      father_name: trimOrNull(data.father_name),
      phone: data.phone.trim(),
      nrc_or_passport: trimOrNull(data.nrc_or_passport),
      dob: trimOrNull(data.dob),
      gender: trimOrNull(data.gender),
      address: trimOrNull(data.address),
      team_club: trimOrNull(data.team_club),
      final_category: trimOrNull(data.final_category),
      uci_id: trimOrNull(data.uci_id),
      mcf_id: trimOrNull(data.mcf_id),
      uci_status: trimOrNull(data.uci_id) ? "yes" : null,
      source_origin: "card_desk",
      verification_status: "verified",
      submitted_at: new Date().toISOString(),
    };

    async function attemptInsert(): Promise<RegistrationMasterRow> {
      const { data: maxRow, error: maxErr } = await context.supabase
        .from("registration_master")
        .select("registration_no")
        .like("registration_no", "NC26-%")
        .order("registration_no", { ascending: false })
        .limit(1)
        .maybeSingle<{ registration_no: string }>();
      if (maxErr) throw new Error(maxErr.message);
      const registration_no = nextRegNo(maxRow?.registration_no ?? null);

      const payload = { registration_no, ...base };
      const { data: row, error } = await (context.supabase
        .from("registration_master") as unknown as {
          insert: (v: typeof payload) => {
            select: (cols: string) => { single: () => Promise<{ data: RegistrationMasterRow; error: { message: string; code?: string } | null }> };
          };
        })
        .insert(payload)
        .select(RIDER_SAFE_COLS)
        .single();
      if (error) {
        const err = error as { message: string; code?: string };
        if (err.code === "23505") throw new Error("__reg_conflict__");
        throw new Error(err.message);
      }
      return row as unknown as RegistrationMasterRow;
    }

    try {
      return await attemptInsert();
    } catch (e) {
      if ((e as Error).message === "__reg_conflict__") {
        return await attemptInsert();
      }
      throw e;
    }
  });