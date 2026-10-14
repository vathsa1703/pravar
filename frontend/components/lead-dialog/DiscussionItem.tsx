import { CalendarClock } from "lucide-react";
import { formatDateTime, timeAgo } from "@/lib/time";
import type { Discussion } from "@/lib/types";

export function DiscussionItem({ discussion }: { discussion: Discussion }) {
  return (
    <li className="relative border-l-2 border-border pb-4 pl-4 last:pb-0">
      {/* Timeline dot */}
      <span className="absolute top-1.5 -left-[5px] size-2 rounded-full bg-muted-foreground/60" aria-hidden />
      <p className="text-xs text-muted-foreground">
        <time dateTime={discussion.created_at} title={discussion.created_at}>
          {formatDateTime(discussion.created_at)}
        </time>{" "}
        · {timeAgo(discussion.created_at)}
      </p>
      <p className="mt-1 text-sm whitespace-pre-wrap break-words">{discussion.note}</p>
      {discussion.follow_up_at && (
        <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock className="size-3" aria-hidden />
          Follow-up set for {formatDateTime(discussion.follow_up_at)}
        </p>
      )}
    </li>
  );
}
