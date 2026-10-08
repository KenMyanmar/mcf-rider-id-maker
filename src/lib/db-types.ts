// Hand-maintained DB types for the existing NC2026 Supabase project.
// The platform's auto-generated types.ts is reserved by the migration system,
// so we keep our types here.

export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];

export type VerificationStatus =
  | "verified"
  | "pending_mcf_verification"
  | "withdrawn"
  | string;

export type CardStatus = "draft" | "issued" | string;

export interface RegistrationMasterRow {
  registration_no: string;
  name_en: string | null;
  name_my: string | null;
  nrc_or_passport: string | null;
  dob: string | null;
  uci_id: string | null;
  team_club: string | null;
  final_category: string | null;
  gender: string | null;
  verification_status: VerificationStatus | null;
  father_name: string | null;
  phone: string | null;
  address: string | null;
  mcf_id: string | null;
}

export interface McfRiderCardRow {
  registration_no: string;
  member_no: string | null;
  bib_no: string | null;
  rfid_tag: string | null;
  nrc: string | null;
  dob: string | null;
  uci_id: string | null;
  team_club: string | null;
  category: string | null;
  valid_until: string | null;
  photo_path: string | null;
  front_card_path: string | null;
  back_card_path: string | null;
  status: CardStatus;
  issued_by: string | null;
  issued_at: string | null;
  updated_at: string | null;
}

export interface McfCardStaffRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  active: boolean;
  role: "staff" | "admin" | string;
}

export type EventRegistrationStatus =
  | "registered"
  | "paid"
  | "confirmed"
  | "cancelled"
  | string;

export interface EventDivision {
  id: string;
  en: string;
  mm: string;
  age_rule_en?: string | null;
  age_rule_mm?: string | null;
  bib_start?: number | null;
  bib_end?: number | null;
  bib_start_2?: number | null;
  bib_end_2?: number | null;
}

export interface EventRow {
  id: string;
  slug: string;
  name_en: string | null;
  name_mm: string | null;
  date: string | null;
  divisions: EventDivision[] | null;
  shirt_sizes: string[] | null;
  shirt_stock?: Record<string, number> | null;
  max_participants: number | null;
  published: boolean;
}

export interface EventRegistrationRow {
  id: string;
  event_id: string;
  reference_no: string | null;
  full_name: string | null;
  phone: string | null;
  division: string | null;
  team_club: string | null;
  status: EventRegistrationStatus;
  bib_no: number | null;
  status_note: string | null;
  payment_proof_path: string | null;
  created_at: string | null;
  status_updated_by: string | null;
  status_updated_at: string | null;
  blood_type?: string | null;
  nrc_photo_path?: string | null;
  nrc_photo_uploaded_at?: string | null;
  nrc_photo_uploaded_by?: string | null;
  nrc_photo_back_uploaded_by?: string | null;
  payment_proof_uploaded_at?: string | null;
  payment_proof_uploaded_by?: string | null;
  uploader_names?: Record<string, string>;
  nrc_photo_back_path?: string | null;
  nrc_photo_back_uploaded_at?: string | null;
  info_updated_at?: string | null;
  info_updated_by?: string | null;
  nrc?: string | null;
  father_name?: string | null;
  dob?: string | null;
  address?: string | null;
  note?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  shirt_size?: string | null;
  waiver_accepted_at?: string | null;
  entry_source?: string | null;
  added_by?: string | null;
}

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"] as const;

export interface EventOrganizerRow {
  id: string;
  user_id: string | null;
  event_id: string;
  display_name: string | null;
  email: string | null;
  active: boolean;
  created_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      registration_master: {
        Row: RegistrationMasterRow;
        Insert: Partial<RegistrationMasterRow> & { registration_no: string };
        Update: Partial<RegistrationMasterRow>;
        Relationships: [];
      };
      mcf_rider_cards: {
        Row: McfRiderCardRow;
        Insert: Partial<McfRiderCardRow> & { registration_no: string };
        Update: Partial<McfRiderCardRow>;
        Relationships: [];
      };
      mcf_card_staff: {
        Row: McfCardStaffRow;
        Insert: Partial<McfCardStaffRow> & { user_id: string };
        Update: Partial<McfCardStaffRow>;
        Relationships: [];
      };
      events: {
        Row: EventRow;
        Insert: Partial<EventRow> & { slug: string };
        Update: Partial<EventRow>;
        Relationships: [];
      };
      event_registrations: {
        Row: EventRegistrationRow;
        Insert: Partial<EventRegistrationRow> & { event_id: string };
        Update: Partial<EventRegistrationRow>;
        Relationships: [];
      };
      event_organizers: {
        Row: EventOrganizerRow;
        Insert: Partial<EventOrganizerRow> & { event_id: string };
        Update: Partial<EventOrganizerRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}