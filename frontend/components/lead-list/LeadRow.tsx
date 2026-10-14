import { AlertTriangle, CalendarClock, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { followUpState, formatFollowUp, overdueLabel, timeAgo, type FollowUpState } from "@/lib/time";
import type { Lead } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

interface LeadRowProps {
  lead: Lead;
  onOpen: (lead: Lead) => void;
}

// Left border colour signals urgency at a glance.
const BORDER: Record<FollowUpState, string> = {
  overdue: "border-l-red-500",
  "due-earlier": "border-l-amber-500",
  today: "border-l-amber-300",
  scheduled: "border-l-transparent",
  none: "border-l-transparent",
};

export function LeadRow({ lead, onOpen }: LeadRowProps) {
  const state = followUpState(lead);

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(lead)}
        aria-label={`Open ${lead.name}${state === "overdue" ? " (overdue follow-up)" : ""}`}
        className={cn(
          "grid w-full grid-cols-1 gap-x-4 gap-y-1.5 border-l-4 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]",
          BORDER[state],
          state === "overdue" && "bg-red-50/60 dark:bg-red-950/20",
        )}
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
          <FollowUp iso={lead.next_follow_up_at} state={state} />
        </div>
      </button>
    </li>
  );
}

function FollowUp({ iso, state }: { iso: string | null; state: FollowUpState }) {
  if (!iso) return <span className="text-xs text-muted-foreground">No follow-up</span>;

  if (state === "overdue") {
    return (
      <span className="flex flex-col gap-0.5 sm:items-end">
        <span className="inline-flex w-fit items-center gap-1 rounded-md bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
          <AlertTriangle className="size-3" aria-hidden />
          {overdueLabel(iso)}
        </span>
        <span className="text-xs text-red-700/80 dark:text-red-300/80">{formatFollowUp(iso)}</span>
      </span>
    );
  }

  if (state === "due-earlier") {
    return (
      <span className="flex flex-col gap-0.5 sm:items-end">
        <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
          <Clock className="size-3.5" aria-hidden />
          Due earlier today
        </span>
        <span className="text-xs text-muted-foreground">{formatFollowUp(iso)}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        state === "today" ? "font-medium text-amber-800 dark:text-amber-200" : "text-muted-foreground",
      )}
    >
      <CalendarClock className="size-3.5" aria-hidden />
      {formatFollowUp(iso)}
    </span>
  );
}
