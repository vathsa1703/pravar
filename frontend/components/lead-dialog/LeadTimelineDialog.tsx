"use client";

import { AlertCircle, Building2, CalendarClock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/lead-list/StatusBadge";
import { toast } from "sonner";
import { useDiscussions, useLead, useUpdateLead } from "@/hooks/useLeads";
import { formatDateTime } from "@/lib/time";
import type { Lead } from "@/lib/types";
import { AddDiscussionForm } from "./AddDiscussionForm";
import { DiscussionItem } from "./DiscussionItem";

interface LeadTimelineDialogProps {
  /** The row that was clicked; null when the dialog is closed. */
  lead: Lead | null;
  onClose: () => void;
}

export function LeadTimelineDialog({ lead: clickedLead, onClose }: LeadTimelineDialogProps) {
  const leadId = clickedLead?.id ?? null;
  // Start from the clicked row, then keep the dialog in sync with the cache.
  const { data: lead = clickedLead } = useLead(leadId, clickedLead ?? undefined);
  const discussions = useDiscussions(leadId);

  return (
    <Dialog open={clickedLead !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        {lead && (
          <>
            <DialogHeader className="gap-2 border-b p-5 pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-lg">{lead.name}</DialogTitle>
                <StatusBadge status={lead.status} />
              </div>
              <DialogDescription className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="size-3.5" aria-hidden />
                  {lead.company ?? "No company"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5" aria-hidden />
                  {lead.phone ? <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a> : "No phone"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" aria-hidden />
                  {lead.next_follow_up_at ? `Follow-up ${formatDateTime(lead.next_follow_up_at)}` : "No follow-up"}
                  {lead.next_follow_up_at && <ClearFollowUpButton leadId={lead.id} />}
                </span>
              </DialogDescription>
            </DialogHeader>

            <section aria-label="Discussion history" className="min-h-0 flex-1 overflow-y-auto p-5">
              <h3 className="mb-3 text-sm font-semibold">Discussion history</h3>
              {discussions.isPending ? (
                <div className="space-y-4" aria-busy="true">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : discussions.isError ? (
                <div role="alert" className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="size-4" aria-hidden />
                  Could not load discussions.
                  <Button variant="link" size="sm" onClick={() => discussions.refetch()}>
                    Retry
                  </Button>
                </div>
              ) : discussions.data.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No discussions yet. Log the first one below.
                </p>
              ) : (
                <ol className="ml-1">
                  {discussions.data.map((d) => (
                    <DiscussionItem key={d.id} discussion={d} />
                  ))}
                </ol>
              )}
            </section>

            <AddDiscussionForm key={lead.id} leadId={lead.id} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Saving a note without a date keeps the follow-up, so removing one is an explicit action. */
function ClearFollowUpButton({ leadId }: { leadId: number }) {
  const updateLead = useUpdateLead(leadId);
  return (
    <button
      type="button"
      className="ml-1 rounded text-xs font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
      disabled={updateLead.isPending}
      onClick={() =>
        updateLead.mutate(
          { next_follow_up_at: null },
          {
            onSuccess: () => toast.success("Follow-up cleared"),
            onError: (err) => toast.error(`Could not clear follow-up: ${err.message}`),
          },
        )
      }
    >
      Clear follow-up
    </button>
  );
}
