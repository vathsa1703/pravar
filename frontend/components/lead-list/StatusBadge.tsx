import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type LeadStatus } from "@/lib/types";

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  contacted: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  qualified: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  proposal_sent: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  lost: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  return <Badge className={cn(STATUS_STYLES[status], className)}>{STATUS_LABELS[status]}</Badge>;
}
