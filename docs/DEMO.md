# Demo script (about 3–4 minutes)

A click-through to record for the submission video. Every step shows one requirement.

## Before recording

```bash
cp .env.example .env
# Set your UTC offset so the "today" demo leads fall in your local day (330 = India).
docker compose up --build
docker compose exec -e SEED_UTC_OFFSET_MINUTES=330 backend python -m app.seed
```

Open http://localhost:3000 in a normal browser window at about 1280px wide. Re-run the seed right before recording so the "time ago" values look fresh.

## Script

1. **The list (20s).**
   "This is LeadFlow. Every lead shows its status badge, the last discussion note, how long ago that was, and the next follow-up."
   Point at Kavya Reddy: *No discussions yet / No activity yet*.

2. **Today's follow-ups and overdue (30s).**
   "Follow-ups due today are pinned at the top, ordered by time. Arjun's was this morning and has already passed, so it's amber: *Due earlier today*. Meera's is later today."
   "Below that, the rest are sorted by most recent activity. Sofia's follow-up was 3 days ago, so she's red: *Overdue by 3 days*. Rohan (Won) and Li Wei (Lost) also have old follow-ups, but closed leads are never overdue."

3. **Filter and search (25s).**
   Click **Contacted**: only contacted leads. Type `north` in search: Arjun (matched by company, *Northwind*). Clear the search and click **All**.
   "Search is debounced, case-insensitive, matches name or company, and combines with the status filter."

4. **Timeline dialog (25s).**
   Click **Sofia Almeida**. "It opens in a dialog, not a new page. Name, company, phone, status, current follow-up, and the full history, newest first, with absolute and relative times and any follow-up set at the time."

5. **Add a discussion with a follow-up (40s).**
   Type: `Called finance. Ready to sign, wants a final call tonight.`
   Set the follow-up to **today at 23:30**. Click **Save discussion** (or press Ctrl+Enter).
   "The note appears at the top of the history, and behind the dialog Sofia has moved into *Follow-ups today*. She's no longer red, and her last note and *just now* updated with no page reload."

6. **Discussion without a follow-up (20s).**
   Type `Sent the contract PDF.` and save with no date.
   "Saving without a date keeps the existing follow-up, which is still 23:30. To remove it, I use *Clear follow-up* explicitly." (Optionally click it.)

7. **Status change (20s).**
   Change the status dropdown to **Won**. "The badge updates here and in the list right away." Close the dialog, **reload the page**: still Won.

8. **Add a lead (30s).**
   Click **Add lead** and press **Add lead** with an empty name: inline *Name is required*.
   Fill `Tomás Herrera`, `Andes Fintech`, `+56 9 8765 4321`. "Status defaults to New, and international phone formats are accepted." Press **Enter**. The dialog closes and the lead is in the list.

9. **Time zone edge case (optional, 20s).**
   Open Tomás and save a note with a follow-up at **00:30 tomorrow**. "Not pinned: 'today' is your local calendar day, which the browser sends to the API." Change it to **23:30 today**: now pinned.

10. **Under the hood (20s).**
    Open http://localhost:8000/docs. "The FastAPI OpenAPI docs. Errors share one JSON shape, `{detail, code}`." Optionally show `docker compose exec backend pytest` passing.
