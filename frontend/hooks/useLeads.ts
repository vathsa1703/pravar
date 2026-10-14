"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Discussion,
  DiscussionCreateInput,
  Lead,
  LeadCreateInput,
  LeadFilters,
  LeadUpdateInput,
} from "@/lib/types";

// Query keys in one place:
//   ["leads", filters]          -> the list, one cache entry per filter combination
//   ["lead", id]                -> a single lead (used by the timeline dialog)
//   ["discussions", leadId]     -> a lead's discussion history
export const leadKeys = {
  lists: ["leads"] as const,
  list: (filters: LeadFilters) => ["leads", filters] as const,
  detail: (id: number) => ["lead", id] as const,
  discussions: (leadId: number) => ["discussions", leadId] as const,
};

export function useLeads(filters: LeadFilters) {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: () => api.listLeads(filters),
    // Keep showing the previous results while a new search/filter loads (no flicker).
    placeholderData: (previous) => previous,
    // Refresh every minute so "time ago", "due earlier today" and the day rollover stay current.
    refetchInterval: 60_000,
  });
}

export function useLead(id: number | null, initialLead?: Lead) {
  return useQuery({
    queryKey: leadKeys.detail(id ?? 0),
    queryFn: () => api.getLead(id!),
    enabled: id !== null,
    initialData: initialLead,
  });
}

export function useDiscussions(leadId: number | null) {
  return useQuery({
    queryKey: leadKeys.discussions(leadId ?? 0),
    queryFn: () => api.listDiscussions(leadId!),
    enabled: leadId !== null,
  });
}

/**
 * Write a fresh lead (from an API response) into every cache that shows it, so the
 * UI updates instantly with no refetch. Then re-fetch the lists in the background so
 * the server can re-apply sorting (today's follow-ups first) and filters.
 */
function applyLeadToCache(queryClient: QueryClient, lead: Lead) {
  queryClient.setQueryData(leadKeys.detail(lead.id), lead);
  queryClient.setQueriesData<Lead[]>({ queryKey: leadKeys.lists }, (leads) =>
    leads?.map((existing) => (existing.id === lead.id ? lead : existing)),
  );
  queryClient.invalidateQueries({ queryKey: leadKeys.lists });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadCreateInput) => api.createLead(input),
    onSuccess: async (lead) => {
      queryClient.setQueryData(leadKeys.detail(lead.id), lead);
      // A new lead's position depends on the active filter/search, so let the
      // server decide: wait for the refetch, then the dialog closes on a list
      // that already contains the new lead.
      await queryClient.invalidateQueries({ queryKey: leadKeys.lists });
    },
  });
}

export function useUpdateLead(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadUpdateInput) => api.updateLead(id, input),
    onSuccess: (lead) => applyLeadToCache(queryClient, lead),
  });
}

export function useAddDiscussion(leadId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DiscussionCreateInput) => api.addDiscussion(leadId, input),
    onSuccess: ({ discussion, lead }) => {
      // Newest first, so the new discussion goes on top of the history.
      queryClient.setQueryData<Discussion[]>(leadKeys.discussions(leadId), (old) => [
        discussion,
        ...(old ?? []),
      ]);
      applyLeadToCache(queryClient, lead);
    },
  });
}
