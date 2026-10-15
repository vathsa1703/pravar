# Demo video: master script (about 5 minutes)

**Bold** = what to click or type. Quoted text = what to say. Every step names the requirement or bonus it shows.

## Before recording

1. Re-seed so the dates are fresh (the demo data is relative to "now"):
   ```bash
   cd backend
   .venv\Scripts\python -m app.seed          # Docker: docker compose exec backend python -m app.seed
   ```
2. Open http://localhost:3000, press **F5**. Browser window about 1280px wide, one tab, notifications off.
3. Have two more tabs ready, not visible yet: the API docs (http://localhost:8001/docs, or :8000 in Docker) and the GitHub repo's Actions page.
4. Don't click around before you start. Every edit changes the data; re-seed to restart a take.

## The script

### 1. Intro and the seed script *(bonus: seed script)* ~25s
> "This is LeadFlow, a single-screen lead manager built with Next.js, FastAPI and PostgreSQL. All of this demo data comes from one command, `python -m app.seed`. It creates 8 leads, each with realistic discussions, covering every status. There's a follow-up due today, one that already passed this morning, one overdue, one in the future, one lead with no discussions at all, plus a Won and a Lost lead. Dates are relative to now, so the demo always looks current, and the script is safe to re-run."

### 2. The list ~20s
> "Each row shows the lead's name and company, a colour-coded status badge, the last discussion note, how long ago that was, and the next follow-up. Kavya has no discussions, so it says *No discussions yet / No activity yet*."

### 3. Today's follow-ups and overdue *(bonus: overdue in red)* ~40s
**Point at the pinned section, then at Sofia.**
> "Follow-ups due today are pinned at the top under their own header, in time order. Arjun's was this morning and has already passed, so he's amber: *Due earlier today*. Meera's is this evening. Below that, the rest are sorted by most recent activity."
> "Bonus: overdue highlighting. Sofia's follow-up was three days ago, so she gets a red border, a red tint and an *Overdue by 3 days* badge. Rohan is Won and Li Wei is Lost. They also have old dates, but closed leads are never marked overdue."

### 4. Filters and search *(bonus: search, bonus: filters combined with search)* ~45s
**Click "Contacted".**
> "Bonus: status filter. Only contacted leads."

**Type `north` in the search box.**
> "Bonus: search by name. It's debounced and case-insensitive, and it also matches the company. This is Arjun, found through *Northwind*. It combines with the filter: this is *Contacted* AND *north*."

**Clear the search, click "All".**

### 5. Open a lead ~30s
**Click Sofia Almeida.**
> "It opens in a dialog, not a new page. I can see her name, company, phone, status, the current follow-up, and the full history, newest first, each with the exact time, how long ago, and the follow-up that was set."

### 6. Add a discussion with a follow-up ~45s
**Click the note box and type:** `Called finance. Ready to sign, wants a final call tonight.`
**Set "Next follow-up" to today at 11:30 pm, then click "Save discussion"** (or press Ctrl+Enter).
> "The note appears at the top of the history. Behind the dialog, Sofia has moved into *Follow-ups today*, she's no longer red, and her last note and *just now* updated. No page refresh."

### 7. Discussion without a follow-up ~25s
**Type** `Sent the contract PDF.` **and save with the date empty.**
> "Saving without a date keeps the existing follow-up. It's still 11:30 pm. To remove one, I click *Clear follow-up* explicitly."

*(Optional: click "Clear follow-up" and show the row update.)*

### 8. Status change ~25s
**Change the status dropdown to Won.**
> "The badge changes here and in the list straight away."

**Close the dialog, press F5.**
> "Still Won. It's saved in the database."

### 9. Add a lead ~35s
**Click "Add lead", then click "Add lead" again with the name empty.**
> "Name is required, and the error shows inline."

**Type** `Tomás Herrera` / `Andes Fintech` / `+56 9 8765 4321`.
> "Status defaults to New, and international phone formats are accepted."

**Press Enter.**
> "The dialog closes and the lead is already in the list."

### 10. Time zone edge case (optional) ~20s
**Open Tomás, save a note with a follow-up at 12:30 am tomorrow.**
> "Not pinned. 'Today' is my local calendar day: the browser sends the day boundaries to the API, so the server doesn't need to know my time zone."

**Change it to 11:30 pm today.**
> "Now it's pinned."

### 11. Under the hood and Docker *(bonus: Docker Compose)* ~50s
**Switch to the API docs tab.**
> "FastAPI with auto-generated OpenAPI docs. SQLAlchemy and Alembic on PostgreSQL, with the schema created by migrations. Every error uses one JSON shape. The backend has 31 tests."

**Switch to the repo; show `docker-compose.yml`, then the Actions page with the green check.**
> "Bonus: Docker Compose. The whole stack, Postgres, the FastAPI backend and the Next.js frontend, starts with one command: `docker compose up --build`. The backend waits for the database health check and runs the migrations on start. I don't have admin rights to install Docker on this laptop, so I verified it with GitHub Actions: on a clean machine it builds all three containers, seeds them, checks the API and the frontend, and runs all 31 backend tests inside the container. This green check is that run."

### 12. Close ~10s
> "That's LeadFlow. The README covers the setup, design decisions, and how I used AI. Thanks for watching."

## Bonus checklist (all five covered)

| Bonus | Step |
| --- | --- |
| Search leads by name | 4 |
| Overdue follow-ups in red | 3 |
| Docker Compose setup | 11 |
| Seed script (5+ leads, discussions) | 1 |
| Filters, combined with search | 4 |
