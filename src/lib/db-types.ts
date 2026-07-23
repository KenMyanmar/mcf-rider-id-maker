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
}

export interface Database {
  public: {
    Tables: {
      registration_master: {
        Row: RegistrationMasterRow;
        Insert: Partial<RegistrationMasterRow> & { registration_no: string };
        Update: Partial<RegistrationMasterRow>;
      };
      mcf_rider_cards: {
        Row: McfRiderCardRow;
        Insert: Partial<McfRiderCardRow> & { registration_no: string };
        Update: Partial<McfRiderCardRow>;
      };
      mcf_card_staff: {
        Row: McfCardStaffRow;
        Insert: Partial<McfCardStaffRow> & { user_id: string };
        Update: Partial<McfCardStaffRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}