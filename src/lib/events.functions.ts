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
      .select("id, slug, name_en, name_mm, date, divisions, published")
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
      .select("id, slug, name_en, name_mm, date, divisions, published")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (evErr) throw new Error(evErr.message);
    if (!ev) throw new Error("Event not found");
    const event = ev as unknown as EventRow;

    let q = context.supabase
      .from("event_registrations")
      .select(
        "id, event_id, reference_no, full_name, phone, division, team_club, status, status_note, payment_proof_path, created_at, status_updated_at",
      )
      .eq("event_id", event.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (data.status) q = q.eq("status", data.status);
    if (data.division) q = q.eq("division", data.division);
    const search = data.query?.trim();
    if (search) {
      const like = `%${search.replace(/[%_]/g, (m) => `\\${m}`)}%`;
      q = q.or(
        [`full_name.ilike.${like}`, `phone.ilike.${like}`, `reference_no.ilike.${like}`].join(","),
      );
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return {
      event,
      registrations: (rows ?? []) as unknown as EventRegistrationRow[],
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
        "id, event_id, reference_no, full_name, phone, division, team_club, status, status_note, payment_proof_path, created_at, status_updated_at",
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
