"use client";

import { useState } from "react";
import { LeadTimelineDialog } from "@/components/lead-dialog/LeadTimelineDialog";
import { AddLeadDialog } from "@/components/lead-form/AddLeadDialog";
import { LeadFilters } from "@/components/lead-list/LeadFilters";
import { LeadList } from "@/components/lead-list/LeadList";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useLeads } from "@/hooks/useLeads";
import type { Lead, LeadFilters as Filters } from "@/lib/types";

export default function Home() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Filters["status"]>("all");
  const q = useDebouncedValue(search, 300);

  const leadsQuery = useLeads({ status, q: q.trim() });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">LeadFlow</h1>
          <p className="text-sm text-muted-foreground">Your leads, discussions and follow-ups.</p>
        </div>
        <AddLeadDialog />
      </header>

      <LeadFilters search={search} onSearchChange={setSearch} status={status} onStatusChange={setStatus} />

      <LeadList
        leads={leadsQuery.data}
        isLoading={leadsQuery.isPending}
        error={leadsQuery.error}
        onRetry={() => leadsQuery.refetch()}
        isFiltered={status !== "all" || q.trim() !== ""}
        onOpen={setSelectedLead}
      />

      <LeadTimelineDialog lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </main>
  );
}
