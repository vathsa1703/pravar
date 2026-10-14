// Mirrors the backend's Pydantic schemas (backend/app/schemas).
// All timestamps are UTC ISO strings; convert to local time only when displaying.

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "won",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
};

export interface Lead {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  last_note: string | null;
  last_discussion_at: string | null;
  follow_up_today: boolean;
  is_overdue: boolean;
}

export interface Discussion {
  id: number;
  lead_id: number;
  note: string;
  follow_up_at: string | null;
  created_at: string;
}

export interface LeadCreateInput {
  name: string;
  company?: string | null;
  phone?: string | null;
  status?: LeadStatus;
}

export interface LeadUpdateInput {
  name?: string;
  company?: string | null;
  phone?: string | null;
  status?: LeadStatus;
  next_follow_up_at?: string | null; // null clears the follow-up
}

export interface DiscussionCreateInput {
  note: string;
  follow_up_at?: string | null;
}

export interface DiscussionCreated {
  discussion: Discussion;
  lead: Lead;
}

export interface LeadFilters {
  status: LeadStatus | "all";
  q: string;
}
