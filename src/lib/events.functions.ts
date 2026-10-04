import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStaffOrOrganizer } from "@/integrations/supabase/auth-middleware";
import type {
  EventRow,
  EventRegistrationRow,
  EventOrganizerRow,
} from "@/lib/db-types";

export type EventWithCounts = EventRow & {
  counts: Record<string, number>;
  total: number;
};

export const listMyEvents = createServerFn({ method: "POST" })
  .middleware([requireStaffOrOrganizer])
  .handler(async ({ context }) => {
    let query = context.supabase
      .from("events")
      .select("id, slug, name_en, name_mm, date, divisions, shirt_sizes, max_participants, published")
      .eq("published", true)
      .order("date", { ascending: false });

    if (context.access.kind === "organizer") {
      query = query.in("id", context.access.eventIds);
    }

    const { data: events, error } = await query;
    if (error) throw new Error(error.message);
    const list = (events ?? []) as unknown as EventRow[];
    if (list.length === 0) return [] as EventWithCounts[];

    const { data: regs, error: regErr } = await context.supabase
      .from("event_registrations")
      .select("event_id, status")
      .in(
        "event_id",
        list.map((e) => e.id),
      );
    if (regErr) throw new Error(regErr.message);

    const byEvent = new Map<string, Record<string, number>>();
    for (const r of regs ?? []) {
      const row = r as { event_id: string; status: string };
      const m = byEvent.get(row.event_id) ?? {};
      m[row.status] = (m[row.status] ?? 0) + 1;
      byEvent.set(row.event_id, m);
    }

    return list.map((e) => {
      const counts = byEvent.get(e.id) ?? {};
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return { ...e, counts, total };
    }) as EventWithCounts[];
  });

const ListRegsInput = z.object({
  slug: z.string().min(1),
  query: z.string().max(80).optional(),
  status: z.string().optional(),
  division: z.string().optional(),
});

export const listEventRegistrations = createServerFn({ method: "POST" })
  .middleware([requireStaffOrOrganizer])
  .inputValidator((input: z.input<typeof ListRegsInput>) => ListRegsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: ev, error: evErr } = await context.supabase
      .from("events")
      .select("id, slug, name_en, name_mm, date, divisions, shirt_sizes, max_participants, published")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (evErr) throw new Error(evErr.message);
    if (!ev) throw new Error("Event not found");
    const event = ev as unknown as EventRow;

    let q = context.supabase
      .from("event_registrations")
      .select(
        "id, event_id, reference_no, full_name, phone, division, team_club, status, bib_no, status_note, payment_proof_path, created_at, status_updated_at, blood_type, nrc_photo_path, nrc_photo_back_path, info_updated_at, shirt_size, emergency_contact_name, emergency_contact_phone",
      )
      .eq("event_id", event.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (data.status === "paid_no_bib") q = q.eq("status", "paid").is("bib_no", null);
    else if (data.status) q = q.eq("status", data.status);
    if (data.division) q = q.eq("division", data.division);
    const search = data.query?.trim();
    if (search) {
      const like = `%${search.replace(/[%_]/g, (m) => `\\${m}`)}%`;
      const parts = [`full_name.ilike.${like}`, `phone.ilike.${like}`, `reference_no.ilike.${like}`];
      if (/^\d{1,9}$/.test(search)) parts.push(`bib_no.eq.${Number(search)}`);
      q = q.or(parts.join(","));
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Whole-event summary, independent of filters.
    const { data: allRows, error: allErr } = await context.supabase
      .from("event_registrations")
      .select("id, full_name, status, division, bib_no, shirt_size, created_at")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true });
    if (allErr) throw new Error(allErr.message);
    type Lite = {
      id: string;
      full_name: string | null;
      status: string;
      division: string | null;
      bib_no: number | null;
      shirt_size: string | null;
    };
    const all = (allRows ?? []) as unknown as Lite[];

    const sizeCounts: Record<string, number> = {};
    const bibsByDivision: Record<string, number> = {};
    let paidConfirmed = 0;
    let registered = 0;
    const pendingBib: Array<{ id: string; full_name: string | null }> = [];
    for (const r of all) {
      if (r.status !== "cancelled" && r.shirt_size) {
        sizeCounts[r.shirt_size] = (sizeCounts[r.shirt_size] ?? 0) + 1;
      }
      if (r.status === "paid" || r.status === "confirmed") paidConfirmed++;
      if (r.status === "registered") registered++;
      if (r.bib_no != null && r.division && r.status !== "cancelled") {
        bibsByDivision[r.division] = (bibsByDivision[r.division] ?? 0) + 1;
      }
      if (r.status === "paid" && r.bib_no == null) pendingBib.push({ id: r.id, full_name: r.full_name });
    }

    return {
      event,
      registrations: (rows ?? []) as unknown as EventRegistrationRow[],
      sizeCounts,
      capacity: { paidConfirmed, registered, bibsByDivision },
      pendingBib,
    };
  });

export const getEventRegistration = createServerFn({ method: "POST" })
  .middleware([requireStaffOrOrganizer])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("event_registrations")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Registration not found");
    return row as unknown as EventRegistrationRow;
  });

export const getProofSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireStaffOrOrganizer])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("event_registrations")
      .select("payment_proof_path")
      .eq("id", data.id)
      .maybeSingle<{ payment_proof_path: string | null }>();
    if (error) throw new Error(error.message);
    const path = row?.payment_proof_path;
    if (!path) throw new Error("No payment proof on file");

    const { data: signed, error: signErr } = await context.supabase.storage
      .from("event-payment-proofs")
      .createSignedUrl(path, 60);
    if (signErr) throw new Error(signErr.message);
    return { url: signed.signedUrl };
  });

export const getNrcPhotoSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireStaffOrOrganizer])
  .inputValidator((input: { id: string; side: "front" | "back" }) =>
    z.object({ id: z.string().min(1), side: z.enum(["front", "back"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const col = data.side === "front" ? "nrc_photo_path" : "nrc_photo_back_path";
    const { data: row, error } = await context.supabase
      .from("event_registrations")
      .select(col)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const path = (row as Record<string, string | null> | null)?.[col];
    if (!path) throw new Error(`No NRC ${data.side} photo on file`);
    const { data: signed, error: signErr } = await context.supabase.storage
      .from("event-nrc-photos")
      .createSignedUrl(path, 60);
    if (signErr) throw new Error(signErr.message);
    return { url: signed.signedUrl };
  });

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

const UpdateInfoInput = z.object({
  id: z.string().min(1),
  full_name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\- ]{5,30}$/, "Phone may contain only digits, + and -"),
  nrc: opt(80),
  father_name: opt(120),
  dob: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => {
      if (!v) return true;
      const d = new Date(v);
      return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(d.getTime()) && d < new Date();
    }, "Date of birth must be a valid past date"),
  address: opt(300),
  division: z.string().min(1),
  team_club: opt(120),
  note: opt(500),
  blood_type: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown", ""])
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  emergency_contact_name: opt(120),
  emergency_contact_phone: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => !v || /^[0-9+\- ]{5,30}$/.test(v), "Emergency phone may contain only digits, + and -"),
  shirt_size: opt(20),
});

export const updateRegistrationInfo = createServerFn({ method: "POST" })
  .middleware([requireStaffOrOrganizer])
  .inputValidator((input: z.input<typeof UpdateInfoInput>) => UpdateInfoInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: cur, error: curErr } = await context.supabase
      .from("event_registrations")
      .select("id, event_id, status")
      .eq("id", data.id)
      .maybeSingle<{ id: string; event_id: string; status: string }>();
    if (curErr) throw new Error(curErr.message);
    if (!cur) throw new Error("Registration not found");
    if (cur.status === "cancelled") throw new Error("Cancelled registrations cannot be edited");

    const { data: ev, error: evErr } = await context.supabase
      .from("events")
      .select("divisions, shirt_sizes")
      .eq("id", cur.event_id)
      .maybeSingle<{ divisions: { id: string }[] | null; shirt_sizes: string[] | null }>();
    if (evErr) throw new Error(evErr.message);
    if (!(ev?.divisions ?? []).some((d) => d.id === data.division)) {
      throw new Error("Division is not valid for this event");
    }
    if (data.shirt_size && !(ev?.shirt_sizes ?? []).includes(data.shirt_size)) {
      throw new Error("Shirt size is not valid for this event");
    }

    const patch = {
      full_name: data.full_name,
      phone: data.phone,
      nrc: data.nrc,
      father_name: data.father_name,
      dob: data.dob,
      address: data.address,
      division: data.division,
      team_club: data.team_club,
      note: data.note,
      blood_type: data.blood_type,
      emergency_contact_name: data.emergency_contact_name,
      emergency_contact_phone: data.emergency_contact_phone,
      shirt_size: data.shirt_size,
    };
    const { data: row, error } = await (context.supabase
      .from("event_registrations") as unknown as {
      update: (p: typeof patch) => {
        eq: (c: string, v: string) => {
          select: (cols: string) => {
            single: () => Promise<{ data: unknown; error: { message: string } | null }>;
          };
        };
      };
    })
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as EventRegistrationRow;
  });

const UpdateStatusInput = z.object({
  id: z.string().min(1),
  status: z.enum(["registered", "paid", "confirmed", "cancelled"]),
  note: z.string().max(500).nullable().optional(),
});

export const updateRegistrationStatus = createServerFn({ method: "POST" })
  .middleware([requireStaffOrOrganizer])
  .inputValidator((input: z.input<typeof UpdateStatusInput>) => UpdateStatusInput.parse(input))
  .handler(async ({ data, context }) => {
    const patch = {
      status: data.status,
      status_note: (data.note ?? "").trim() || null,
    };
    const { data: row, error } = await (context.supabase
      .from("event_registrations") as unknown as {
      update: (p: typeof patch) => {
        eq: (
          col: string,
          val: string,
        ) => {
          select: (cols: string) => {
            single: () => Promise<{ data: unknown; error: { message: string } | null }>;
          };
        };
      };
    })
      .update(patch)
      .eq("id", data.id)
      .select(
        "id, event_id, reference_no, full_name, phone, division, team_club, status, bib_no, status_note, payment_proof_path, created_at, status_updated_at",
      )
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as EventRegistrationRow;
  });

function requireAdmin(access: { kind: string; isAdmin: boolean }) {
  if (access.kind !== "staff" || !access.isAdmin) {
    throw new Response("Forbidden: admin staff only", { status: 403 });
  }
}

export const listEventOrganizers = createServerFn({ method: "POST" })
  .middleware([requireStaffOrOrganizer])
  .inputValidator((input: { event_id: string }) =>
    z.object({ event_id: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    requireAdmin(context.access);
    const { data: rows, error } = await context.supabase
      .from("event_organizers")
      .select("id, user_id, event_id, display_name, email, active, created_at")
      .eq("event_id", data.event_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as EventOrganizerRow[];
  });

const AddOrganizerInput = z.object({
  event_id: z.string().min(1),
  display_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
});

export const addEventOrganizer = createServerFn({ method: "POST" })
  .middleware([requireStaffOrOrganizer])
  .inputValidator((input: z.input<typeof AddOrganizerInput>) => AddOrganizerInput.parse(input))
  .handler(async ({ data, context }) => {
    requireAdmin(context.access);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find or invite the auth user.
    let userId: string | null = null;
    const { data: invited, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
    );
    if (invErr) {
      // User may already exist — look them up.
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) throw new Error(listErr.message);
      const existing = list.users.find(
        (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
      );
      if (!existing) throw new Error(invErr.message);
      userId = existing.id;
    } else {
      userId = invited.user?.id ?? null;
    }

    const payload = {
      event_id: data.event_id,
      user_id: userId,
      display_name: data.display_name,
      email: data.email,
      active: true,
    };
    const { data: row, error } = await (supabaseAdmin
      .from("event_organizers") as unknown as {
      insert: (p: typeof payload) => {
        select: (cols: string) => {
          single: () => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    })
      .insert(payload)
      .select("id, user_id, event_id, display_name, email, active, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as EventOrganizerRow;
  });

export const toggleOrganizerActive = createServerFn({ method: "POST" })
  .middleware([requireStaffOrOrganizer])
  .inputValidator((input: { id: string; active: boolean }) =>
    z.object({ id: z.string().min(1), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    requireAdmin(context.access);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (supabaseAdmin
      .from("event_organizers") as unknown as {
      update: (p: { active: boolean }) => {
        eq: (
          col: string,
          val: string,
        ) => {
          select: (cols: string) => {
            single: () => Promise<{ data: unknown; error: { message: string } | null }>;
          };
        };
      };
    })
      .update({ active: data.active })
      .eq("id", data.id)
      .select("id, user_id, event_id, display_name, email, active, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as EventOrganizerRow;
  });
