"use client";

import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateLead } from "@/hooks/useLeads";
import { LEAD_STATUSES, STATUS_LABELS, type LeadStatus } from "@/lib/types";

// Base UI's Select uses `items` to show the label (not the raw value) in the trigger.
const ITEMS = LEAD_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }));

export function StatusSelect({ leadId, status }: { leadId: number; status: LeadStatus }) {
  const updateLead = useUpdateLead(leadId);

  return (
    <div className="flex items-center gap-2">
      <label id="status-select-label" className="text-sm text-muted-foreground">
        Status
      </label>
      <Select
        items={ITEMS}
        value={status}
        disabled={updateLead.isPending}
        onValueChange={(value) => {
          if (!value || value === status) return;
          updateLead.mutate(
            { status: value as LeadStatus },
            {
              onSuccess: (lead) => toast.success(`Status changed to ${STATUS_LABELS[lead.status]}`),
              onError: (err) => toast.error(`Could not update status: ${err.message}`),
            },
          );
        }}
      >
        <SelectTrigger aria-labelledby="status-select-label" className="min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
