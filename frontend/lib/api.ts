// Small typed wrapper around fetch for the LeadFlow API.
import { todayWindow } from "./time";
import type {
  Discussion,
  DiscussionCreated,
  DiscussionCreateInput,
  Lead,
  LeadCreateInput,
  LeadFilters,
  LeadUpdateInput,
} from "./types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export interface FieldError {
  field: string;
  message: string;
}

/** Error thrown for any non-2xx response. Carries the backend's {detail, code, errors}. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public fieldErrors: FieldError[] = [],
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0, "network_error");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      typeof body.detail === "string" ? body.detail : `Request failed (${response.status})`,
      response.status,
      body.code ?? "unknown_error",
      body.errors ?? [],
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

/** Every lead response includes today/overdue flags, so always send the browser's "today". */
function withDayWindow(params: Record<string, string> = {}): string {
  const { dayStart, dayEnd } = todayWindow();
  return new URLSearchParams({ ...params, day_start: dayStart, day_end: dayEnd }).toString();
}

export const api = {
  listLeads(filters: LeadFilters): Promise<Lead[]> {
    const params: Record<string, string> = {};
    if (filters.status !== "all") params.status = filters.status;
    if (filters.q.trim()) params.q = filters.q.trim();
    return request(`/leads?${withDayWindow(params)}`);
  },

  getLead(id: number): Promise<Lead> {
    return request(`/leads/${id}?${withDayWindow()}`);
  },

  createLead(input: LeadCreateInput): Promise<Lead> {
    return request(`/leads?${withDayWindow()}`, { method: "POST", body: JSON.stringify(input) });
  },

  updateLead(id: number, input: LeadUpdateInput): Promise<Lead> {
    return request(`/leads/${id}?${withDayWindow()}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  listDiscussions(leadId: number): Promise<Discussion[]> {
    return request(`/leads/${leadId}/discussions`);
  },

  addDiscussion(leadId: number, input: DiscussionCreateInput): Promise<DiscussionCreated> {
    return request(`/leads/${leadId}/discussions?${withDayWindow()}`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
