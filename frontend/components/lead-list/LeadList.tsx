import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Lead } from "@/lib/types";
import { LeadRow } from "./LeadRow";

interface LeadListProps {
  leads: Lead[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  isFiltered: boolean;
  onOpen: (lead: Lead) => void;
}

export function LeadList({ leads, isLoading, error, onRetry, isFiltered, onOpen }: LeadListProps) {
  if (isLoading) return <LeadListSkeleton />;

  if (error && !leads) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border bg-card p-10 text-center">
        <AlertCircle className="size-6 text-destructive" aria-hidden />
        <p className="text-sm">Could not load leads: {error.message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="font-medium">{isFiltered ? "No matches" : "No leads yet"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {isFiltered ? "Try a different search or status." : "Add your first lead to get started."}
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Leads" className="overflow-hidden rounded-xl border bg-card">
      <ul className="divide-y">
        {leads.map((lead) => (
          <LeadRow key={lead.id} lead={lead} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
}

function LeadListSkeleton() {
  return (
    <div className="divide-y rounded-xl border bg-card" aria-busy="true" aria-label="Loading leads">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid gap-2 px-4 py-4 sm:grid-cols-[14rem_1fr_8rem]">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
