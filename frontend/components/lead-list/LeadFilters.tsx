import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LEAD_STATUSES, STATUS_LABELS, type LeadFilters as Filters } from "@/lib/types";

interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: Filters["status"];
  onStatusChange: (value: Filters["status"]) => void;
}

export function LeadFilters({ search, onSearchChange, status, onStatusChange }: LeadFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <label htmlFor="lead-search" className="sr-only">
          Search leads by name or company
        </label>
        <Input
          id="lead-search"
          type="search"
          placeholder="Search by name or company…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Scrolls sideways on narrow screens instead of wrapping. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <Tabs value={status} onValueChange={(value) => onStatusChange(value as Filters["status"])}>
          <TabsList aria-label="Filter by status">
            <TabsTrigger value="all">All</TabsTrigger>
            {LEAD_STATUSES.map((s) => (
              <TabsTrigger key={s} value={s}>
                {STATUS_LABELS[s]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
