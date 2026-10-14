# LeadFlow

LeadFlow is a single-screen lead management tool (a lightweight CRM). A sales rep can:

- see every lead with its status, last discussion and next follow-up
- see **today's follow-ups pinned at the top**, and **overdue follow-ups in red**
- open a lead in a dialog to read its full discussion history, log a new discussion, set or clear a follow-up, and change the status
- add new leads, filter by status and search by name or company

Everything happens on one page. There is no login (the assignment makes it optional).

![Lead list](docs/screenshots/01-lead-list.png)

| Timeline dialog | Adding a discussion | Add lead |
| --- | --- | --- |
| ![Timeline](docs/screenshots/03-timeline-dialog.png) | ![Add discussion](docs/screenshots/04a-add-discussion-form.png) | ![Add lead](docs/screenshots/05-add-lead.png) |

More screenshots are in [docs/screenshots](docs/screenshots): filtered list, list after saving a discussion, and mobile.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · shadcn/ui · TanStack Query · FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL 16 · Docker Compose

---

## Quick start (Docker)

Requires Docker with Compose v2.

```bash
git clone https://github.com/vathsa1703/pravar.git leadflow
cd leadflow
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
docker compose up --build
```

When the three containers are up (the backend runs `alembic upgrade head` on start), load the demo data in a second terminal:

```bash
docker compose exec backend python -m app.seed
# Optional: place the "today" demo follow-ups inside YOUR day (the container runs in UTC):
docker compose exec -e SEED_UTC_OFFSET_MINUTES=330 backend python -m app.seed   # 330 = India, -300 = New York
```

| What | URL |
| --- | --- |
| App | http://localhost:3000 |
| API | http://localhost:8000/api |
| API docs (Swagger) | http://localhost:8000/docs |

If port 3000 or 8000 is taken, change `FRONTEND_PORT` / `API_PORT` in `.env`. If you change `API_PORT`, also update `NEXT_PUBLIC_API_URL` (and rebuild, because it is baked into the frontend bundle). If you change `FRONTEND_PORT`, add the new origin to `BACKEND_CORS_ORIGINS`.

Stop with `Ctrl+C`; `docker compose down -v` also deletes the database volume.

## Running without Docker

You need Python 3.12+, Node.js 22.12+ (or 24), and a PostgreSQL server.

```bash
# 1. Database
createdb leadflow                      # or: psql -c "create database leadflow"
cp .env.example .env                   # then edit DATABASE_URL to match your Postgres user/password/port

# 2. Backend (http://localhost:8000)
cd backend
python -m venv .venv
source .venv/bin/activate              # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
alembic upgrade head
python -m app.seed                     # optional demo data
uvicorn app.main:app --reload --port 8000

# 3. Frontend (http://localhost:3000), in another terminal
cd frontend
npm install
npm run dev
```

The backend reads `.env` from the repo root (or `backend/.env`). The frontend uses `NEXT_PUBLIC_API_URL` and falls back to `http://localhost:8000`. To use a different API URL, put it in `frontend/.env.local`.

## Environment variables

All variables are listed in [.env.example](.env.example). `.env` is git-ignored.

| Variable | Used by | Default / example | Purpose |
| --- | --- | --- | --- |
| `POSTGRES_USER` | db (Compose) | `leadflow` | Database user created by the Postgres container |
| `POSTGRES_PASSWORD` | db (Compose) | `leadflow` | Its password (local dev only) |
| `POSTGRES_DB` | db (Compose) | `leadflow` | Database name |
| `DATABASE_URL` | backend (no Docker) | `postgresql+psycopg://leadflow:leadflow@localhost:5432/leadflow` | SQLAlchemy URL. Compose builds its own URL pointing at host `db`. |
| `BACKEND_CORS_ORIGINS` | backend | `http://localhost:3000` | Comma-separated browser origins allowed to call the API |
| `SEED_UTC_OFFSET_MINUTES` | seed script | *(empty)* | Your UTC offset, so seeded "today" follow-ups fall in your day |
| `NEXT_PUBLIC_API_URL` | frontend (build time) | `http://localhost:8000` | Where the browser reaches the API |
| `API_PORT` | Compose | `8000` | Host port for the backend |
| `FRONTEND_PORT` | Compose | `3000` | Host port for the frontend |

## API overview

Base path `/api`. Interactive docs at **http://localhost:8000/docs** (OpenAPI).

| Method | Path | Purpose | Success | Errors |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | Health check (used by Docker) | 200 | |
| GET | `/api/leads` | List leads, already sorted. Query: `status`, `q` (name/company), `day_start`, `day_end` | 200 | 422 |
| POST | `/api/leads` | Create a lead `{name, company?, phone?, status?}` | 201 | 422 |
| GET | `/api/leads/{id}` | One lead | 200 | 404 |
| PATCH | `/api/leads/{id}` | Update any of `name, company, phone, status, next_follow_up_at` (`null` clears the follow-up) | 200 | 404, 422 |
| GET | `/api/leads/{id}/discussions` | Discussions, newest first | 200 | 404 |
| POST | `/api/leads/{id}/discussions` | Add `{note, follow_up_at?}`; returns `{discussion, lead}` | 201 | 404, 422 |

Every lead in a response includes the computed fields `last_note`, `last_discussion_at`, `follow_up_today` and `is_overdue`.

**Error shape.** Every error uses the same JSON shape:

```json
{ "detail": "Lead not found", "code": "not_found" }
{ "detail": "Validation failed", "code": "validation_error",
  "errors": [{ "field": "name", "message": "Name is required" }] }
{ "detail": "Internal server error", "code": "internal_error" }
```

Unexpected exceptions are logged on the server and returned as a plain 500. Stack traces never reach the client.

**Validation.** `name`: trimmed, required, max 200. `note`: trimmed, required, max 5000. `phone`: optional, digits plus `+ ( ) - .` and spaces, at least 5 digits, so international formats pass. `follow_up_at` and `day_start`/`day_end`: ISO datetimes that must include a time zone. Past follow-ups are allowed, so a rep can log something that was missed.

## Project structure

```
.
├── docker-compose.yml        db + backend + frontend
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── alembic/versions/     0001_initial.py: the schema, built by migrations
│   ├── app/
│   │   ├── main.py           creates the FastAPI app: CORS, error handlers, routers
│   │   ├── config.py         settings from env vars (pydantic-settings)
│   │   ├── db.py             engine, session factory, get_db dependency
│   │   ├── errors.py         global exception handlers and the {detail, code} shape
│   │   ├── models/           SQLAlchemy models: Lead, Discussion, LeadStatus enum
│   │   ├── schemas/          Pydantic request/response models and validation
│   │   ├── services/         business logic: list query, follow-up transaction
│   │   ├── routers/          thin HTTP layer: health, leads, discussions
│   │   └── seed.py           demo data (python -m app.seed)
│   └── tests/                pytest against a real Postgres test DB
└── frontend/
    ├── Dockerfile
    ├── app/                  layout.tsx, providers.tsx (React Query + toasts), page.tsx (the one screen)
    ├── components/
    │   ├── lead-list/        LeadList, FollowUpSection, LeadRow, StatusBadge, LeadFilters
    │   ├── lead-dialog/      LeadTimelineDialog, DiscussionItem, AddDiscussionForm, StatusSelect
    │   ├── lead-form/        AddLeadDialog
    │   └── ui/               shadcn/ui components (generated)
    ├── hooks/                useLeads.ts (queries + mutations + cache updates), useDebouncedValue.ts
    └── lib/                  api.ts (typed fetch), types.ts, time.ts (+ time.test.ts)
```

## Design decisions

### Why PostgreSQL
The data is relational: a lead has many discussions, and the main screen is a join-and-sort query. Postgres gives `timestamptz` (correct time zone handling), native enums, `LATERAL` joins and transactions. It is also what the assignment asked for. The schema comes from **Alembic migrations, not `create_all`**. The test suite builds its database by running those same migrations, so they are exercised on every test run.

### Sync SQLAlchemy
The API is plain CRUD with short queries. Sync SQLAlchemy is simpler to read and debug (no `await` everywhere, no async driver quirks), and FastAPI runs sync endpoints in a thread pool, so requests still don't block each other. Async would only pay off with long I/O waits or very high concurrency, and neither applies here.

### How "today" is computed (browser time zone)
"Today" means the **same calendar day in the user's browser time zone**. The server can't know that zone, so the browser works it out and sends it:

1. `lib/time.ts → todayWindow()` builds local midnight today and local midnight tomorrow (`new Date(y, m, d)` and `new Date(y, m, d + 1)`, which also handles 23- and 25-hour DST days), then converts both to UTC ISO strings.
2. Every lead request sends them as `?day_start=…&day_end=…`.
3. The server marks a lead `follow_up_today` when `day_start <= next_follow_up_at < day_end`.

So 11:30 PM tonight counts as today and 12:30 AM tomorrow doesn't, in whatever zone the browser is in. There is a backend test and a frontend test for exactly this. If no window is sent, the server falls back to the UTC day. The list refetches every minute, so the "Follow-ups today" section rolls over at midnight and "x minutes ago" stays fresh.

### How overdue is defined
- **Overdue** = the follow-up is **before the start of today** (`next_follow_up_at < day_start`) **and** the lead is not Won or Lost. The row gets a red left border, a red tint and an "Overdue by N days" badge. N counts calendar days, so 11 PM yesterday is "1 day".
- **Due earlier today** = the follow-up is today but its time has passed. These stay in the pinned "Follow-ups today" section with a softer amber "Due earlier today" label. They are deliberately *not* red, so the "today's follow-ups are pinned" rule is never broken.
- **Won and Lost** leads are never overdue and never pinned. Closed deals don't need chasing. Their old follow-up date is still shown, in grey.

The server computes both flags in SQL, so sorting and highlighting always agree.

### The list query
`services/leads.py → _lead_summary_query()` builds one SQL statement:

```sql
SELECT leads.*, latest.note AS last_note, latest.created_at AS last_discussion_at,
       COALESCE(<open AND day_start <= follow_up < day_end>, false) AS follow_up_today,
       COALESCE(<open AND follow_up < day_start>, false)            AS is_overdue
FROM leads
LEFT JOIN LATERAL (
    SELECT note, created_at FROM discussions
    WHERE discussions.lead_id = leads.id
    ORDER BY created_at DESC, id DESC LIMIT 1
) latest ON true
WHERE [status = :status] AND [(name ILIKE :q OR company ILIKE :q)]
ORDER BY
  CASE WHEN <today> THEN 0 ELSE 1 END,               -- today's follow-ups first
  CASE WHEN <today> THEN next_follow_up_at END ASC,  -- ...by follow-up time
  COALESCE(latest.created_at, leads.created_at) DESC -- the rest: most recent activity
```

- **Compute, don't denormalize.** `last_note` and `last_discussion_at` are computed in the query instead of stored on `leads`, so they can never drift out of sync with the discussions table, and adding a discussion only writes one row. The `LATERAL` subquery fetches just the newest discussion per lead, and the composite index `discussions(lead_id, created_at)` makes it a short index lookup. If this ever got slow with very large data, the next step would be storing those two columns on `leads` and updating them in the same transaction.
- **Indexes:** `discussions(lead_id, created_at)` (per-lead history and the latest-discussion lookup), `discussions(created_at)`, `leads(status)` (filter) and `leads(next_follow_up_at)` (today/overdue).
- **Search** is case-insensitive `ILIKE` on name *or* company. `%` and `_` are escaped, so they match literally. The frontend debounces typing by 300 ms. Status filter and search combine with `AND`.
- A lead with no discussions sorts by its creation time and shows "No discussions yet" / "No activity yet".

### The follow-up update runs in one transaction
`POST /api/leads/{id}/discussions` → `services/discussions.py → add_discussion()`:

1. Load the lead (404 if it doesn't exist).
2. Add the new `Discussion` row to the session.
3. If the request has `follow_up_at`, set `lead.next_follow_up_at` to it.
4. Call `db.commit()` **once**. Both writes go to Postgres in one transaction: either the note and the new follow-up are both saved, or neither is (on error it rolls back).

The response contains **both** the new discussion and the updated lead (including the recomputed `last_note`, `follow_up_today` and `is_overdue`). The frontend can update the list from that one response.

### When a discussion has no follow-up
Saving a discussion **without** a follow-up date **leaves the lead's existing follow-up unchanged**. Logging "left a voicemail" shouldn't silently wipe a scheduled call. To remove a follow-up, the rep clicks **"Clear follow-up"** in the dialog header, which sends `PATCH /api/leads/{id}` with `{"next_follow_up_at": null}`. The PATCH endpoint only changes the fields actually sent (`model_fields_set`), so an explicit `null` clears the follow-up and leaving the field out keeps it.

### Frontend state: TanStack Query
- **Queries:** `["leads", {status, q}]` for the list (one cache entry per filter), `["lead", id]` for the dialog, and `["discussions", leadId]` for the history.
- **After a mutation, the API response is written into the cache** (`hooks/useLeads.ts → applyLeadToCache`). The lead is replaced in every cached list and in its detail entry, and a new discussion is prepended to the history. The UI changes immediately with no page refresh. Then the lists are invalidated, so the server re-applies sorting and filters in the background. For example, a lead that just got a follow-up today moves into the pinned section.
- **New leads:** where a new lead belongs depends on the active filter and search, so the mutation waits for the list to refetch and then closes the dialog. The new row is already there when the dialog disappears.
- I chose this over optimistic updates because the server computes `follow_up_today` and `is_overdue`. Writing the server's response is just as instant in practice (one round trip) and never shows a wrong state.
- The dialog reads the lead from its own `["lead", id]` query, not from the list. If you change a lead's status while the list is filtered (so the lead drops out of the filtered list), the dialog still works.

### Other choices
- **Integer IDs** (serial) instead of UUIDs: simpler to read in URLs, logs and tests. No public ID-guessing concern here, since there's no auth anyway.
- **All timestamps are stored as UTC `timestamptz`.** The DB session is pinned to UTC, the API returns ISO strings with `Z`, and the browser formats them in local time with `Intl.DateTimeFormat`. The `datetime-local` input value is converted with `new Date(value).toISOString()`.
- **Dialog, not a page:** shadcn `Dialog` (Base UI underneath) handles focus trapping, Escape to close and returning focus to the row.
- **Accessibility:** every input has a label, rows are real `<button>`s with descriptive labels (including "overdue follow-up"), there are visible focus rings, Enter submits the add-lead form, and Ctrl/⌘+Enter submits a discussion (plain Enter adds a new line). Errors use `role="alert"`.
- **Client and server validation match:** the add-lead form checks the same rules as the API for instant feedback. Server field errors (`errors[]`) are mapped back onto the matching input.

## Testing

**Backend** (pytest, 31 tests, against a real PostgreSQL):

```bash
cd backend
pytest                                  # uses <your DATABASE_URL db name>_test on the same server
# or inside Docker:
docker compose exec backend pytest
```

`tests/conftest.py` creates the test database if needed (`leadflow_test` by default, or set `TEST_DATABASE_URL`), runs the Alembic migrations, and truncates the tables before each test. Your dev data is never touched. The tests cover: creating a lead (defaults, trimming), validation errors and the error shape, international phones, 404s, status update persisting, an invalid status, clearing a follow-up, a discussion with a follow-up updating `next_follow_up_at` (and one without leaving it unchanged), newest-first ordering, the list row reflecting the newest note, today's follow-ups first (by time) then most recent activity, the overdue rules (Won never overdue), the 23:30 vs 00:30 day boundary, status filter, search (name + company, case-insensitive, `%` literal), search + filter combined, cascade delete, and a 500 that doesn't leak details.

**Frontend** (Vitest, unit tests for the time logic):

```bash
cd frontend
npm test          # lib/time.test.ts, runs pinned to Asia/Kolkata so "local day" != UTC day
npm run lint
```

**End-to-end:** I drove the full flow with Playwright scripts (not committed): open a lead without navigating, add discussions with and without follow-ups, check the list row updates with no reload, Ctrl+Enter, the blank-note error, clear follow-up, change status and reload, filter + search, and add a lead with validation errors. The screenshots in `docs/screenshots` come from those runs.

## How I used AI

> Be explicit and honest. This section separates what the AI did from what I did.

**What Claude Code (Anthropic's AI coding agent) generated.** I gave Claude Code a detailed specification (features, data model, API contract, folder layout, commit plan). It then wrote essentially all of the code and docs in this repo: the backend (models, migration, services, routers, error handling, seed, tests), the frontend (components, hooks, API client, time helpers and their tests), the Dockerfiles and Compose file, this README and `docs/DEMO.md`. It made the commits, following the commit plan in the spec.

**How it checked its own work.** After each phase it ran the code: pytest against a real Postgres, `curl` against the running API, `tsc`/`eslint`/`next build`, the production standalone server, and Playwright scripts that clicked through the UI and took the screenshots in this repo. Bugs it found and fixed along the way included: seeded "today" follow-ups landing after midnight when the seed ran late in the evening, a shadcn font variable that referenced itself (so the page fell back to a serif font), Playwright being unable to find list rows while the modal was open (expected: the modal hides the background from assistive tech), and the test setup ignoring the database URL in `.env`.

**What was NOT verified by the AI.** Docker was not installed on the development machine, so `docker compose up --build` was **not** run. Each part it relies on was checked separately: the backend start command (`alembic upgrade head && uvicorn`), the Next.js standalone server that the frontend image runs, and that the Compose YAML parses.

**My own review and changes** *(to be filled in by me, not by the AI):*

- [ ] _What I reviewed line by line:_ …
- [ ] _What I changed by hand, and why:_ …
- [ ] _What I tested myself (including `docker compose up --build` on a clean machine):_ …
- [ ] _Anything I disagreed with or would do differently:_ …

**What I'd improve with more time:** see the next section.

## Known limitations and next steps

- **Auth and multi-user:** no login. Every rep sees every lead. Next: authentication, an `owner_id` on leads, and per-rep views.
- **Pagination:** the list returns every matching lead. That's fine for hundreds, but thousands would need keyset pagination (cursor on the sort key) or virtual scrolling.
- **Reminders and notifications:** follow-ups are only visible in the app. Next: email/push reminders from a scheduled job, and a browser notification when a follow-up comes due.
- **Real-time updates:** two reps editing at once only see each other's changes on the next refetch (every minute, or on window focus). Next: Server-Sent Events or WebSockets that invalidate the cache.
- **Editing and deleting:** you can't edit a lead's name/phone or delete a lead or discussion from the UI (the PATCH endpoint already supports editing).
- **Search at scale:** `ILIKE '%q%'` scans the table. With large data, add a `pg_trgm` GIN index.
- **Seed and time zones in Docker:** the container runs in UTC, so set `SEED_UTC_OFFSET_MINUTES` to make the "today" demo leads land in your local day.
- **Frontend tests** cover only the time logic. Component tests (React Testing Library) and a committed Playwright suite would be the next step.
