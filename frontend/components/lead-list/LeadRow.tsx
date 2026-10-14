import { CalendarClock } from "lucide-react";
import { formatFollowUp, timeAgo } from "@/lib/time";
import type { Lead } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

interface LeadRowProps {
  lead: Lead;
  onOpen: (lead: Lead) => void;
}

export function LeadRow({ lead, onOpen }: LeadRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(lead)}
        className="grid w-full grid-cols-1 gap-x-4 gap-y-1.5 border-l-4 border-transparent px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]"
      >
        {/* Name, company, status */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{lead.name}</span>
            <StatusBadge status={lead.status} />
          </div>
          {lead.company && <p className="truncate text-sm text-muted-foreground">{lead.company}</p>}
        </div>

        {/* Last discussion */}
        <div className="min-w-0">
          {lead.last_note ? (
            <p className="truncate text-sm" title={lead.last_note}>
              {lead.last_note}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">No discussions yet</p>
          )}
          <p className="text-xs text-muted-foreground">
            {lead.last_discussion_at ? timeAgo(lead.last_discussion_at) : "No activity yet"}
          </p>
        </div>

        {/* Next follow-up */}
        <div className="text-sm sm:text-right">
          {lead.next_follow_up_at ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="size-3.5" aria-hidden />
              {formatFollowUp(lead.next_follow_up_at)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No follow-up</span>
          )}
        </div>
      </button>
    </li>
  );
}
