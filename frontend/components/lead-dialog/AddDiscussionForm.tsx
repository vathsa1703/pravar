"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddDiscussion } from "@/hooks/useLeads";
import { ApiError } from "@/lib/api";
import { localInputToIso } from "@/lib/time";

const NOTE_MAX = 5000; // same limit as the backend

export function AddDiscussionForm({ leadId }: { leadId: number }) {
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState(""); // "YYYY-MM-DDTHH:mm" in local time, or ""
  const [error, setError] = useState<string | null>(null);
  const addDiscussion = useAddDiscussion(leadId);

  function submit() {
    const trimmed = note.trim();
    if (!trimmed) {
      setError("Write a note before saving.");
      return;
    }
    setError(null);
    addDiscussion.mutate(
      // No follow-up -> send null, and the lead keeps its current follow-up.
      { note: trimmed, follow_up_at: followUp ? localInputToIso(followUp) : null },
      {
        onSuccess: () => {
          setNote("");
          setFollowUp("");
          toast.success(followUp ? "Discussion saved and follow-up updated" : "Discussion saved");
        },
        onError: (err) => {
          const fieldError = err instanceof ApiError ? err.fieldErrors[0]?.message : undefined;
          setError(fieldError ?? err.message);
        },
      },
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-3 border-t bg-muted/30 p-5"
      aria-label="Add a discussion"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="discussion-note">New discussion</Label>
        <Textarea
          id="discussion-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          // Ctrl/Cmd + Enter saves, plain Enter adds a new line.
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="What was discussed? e.g. Sent pricing deck, wants a demo next week."
          maxLength={NOTE_MAX}
          rows={3}
          aria-invalid={error ? true : undefined}
          aria-describedby="discussion-note-hint"
          className="bg-background"
        />
        <p id="discussion-note-hint" className="flex justify-between text-xs text-muted-foreground">
          <span>Ctrl + Enter to save</span>
          <span>
            {note.length}/{NOTE_MAX}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="discussion-follow-up">Next follow-up (optional)</Label>
          <Input
            id="discussion-follow-up"
            type="datetime-local"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            className="bg-background"
          />
        </div>
        <Button type="submit" disabled={addDiscussion.isPending}>
          {addDiscussion.isPending ? "Saving…" : "Save discussion"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
