import { BellRing } from "lucide-react";
import type { Lead } from "@/lib/types";
import { LeadRow } from "./LeadRow";

interface FollowUpSectionProps {
  title: string;
  leads: Lead[];
  onOpen: (lead: Lead) => void;
  highlight?: boolean;
}

/** A titled group of lead rows. "Follow-ups today" uses the highlighted variant. */
export function FollowUpSection({ title, leads, onOpen, highlight = false }: FollowUpSectionProps) {
  const headingId = `section-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section
      aria-labelledby={headingId}
      className={
        highlight
          ? "overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20"
          : "overflow-hidden rounded-xl border bg-card"
      }
    >
      <h2
        id={headingId}
        className={
          highlight
            ? "flex items-center gap-2 border-b border-amber-200 px-4 py-2 text-sm font-semibold text-amber-900 dark:border-amber-900 dark:text-amber-200"
            : "flex items-center gap-2 border-b px-4 py-2 text-sm font-semibold text-muted-foreground"
        }
      >
        {highlight && <BellRing className="size-4" aria-hidden />}
        {title}
        <span className="font-normal opacity-70">({leads.length})</span>
      </h2>
      <ul className={highlight ? "divide-y divide-amber-200/70 dark:divide-amber-900/60" : "divide-y"}>
        {leads.map((lead) => (
          <LeadRow key={lead.id} lead={lead} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
}
