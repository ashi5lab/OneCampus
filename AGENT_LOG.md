# AGENT LOG — OneCampus

> This file is maintained by the AI agent (Antigravity) to record all significant changes, investigations, database operations, and decisions made during development sessions. Each entry includes the user's original request, the agent's findings, actions taken, and outcomes.

---

## Logging Rules

> **All future agent sessions MUST follow these rules when updating this file:**

1. **Always append — never overwrite.** New work goes at the bottom as the next numbered entry. Do not edit or remove past entries.
2. **Sequential numbering.** Entries are numbered `Entry 001`, `Entry 002`, `Entry 003`, and so on. Check the last entry number before writing a new one.
3. **One entry per significant change session.** If multiple related fixes are made in the same session, they go under one entry with sub-sections. Unrelated changes in the same session each get their own entry.
4. **Always include:**
   - Date, time (IST), and Session ID
   - The user's exact request (quoted)
   - Files read during investigation
   - Root cause or rationale
   - Every file created, modified, or deleted (with before/after snippets where relevant)
   - Any database operations — exact SQL run, which schema/table, and the output/result
   - Expected outcome after the change
5. **DB operations must be fully documented** — schema name, table name, SQL statement, command used to execute it, and the console output confirming success or failure.
6. **No partial entries.** If work is in progress, mark the entry header with `[IN PROGRESS]` and update it to `[COMPLETE]` when done.

---

## Entry 001 — Class Attendance Showing as "Pending" After Submission

**Date:** 2026-07-25
**Time:** ~20:16 IST
**Session ID:** `14c32fb4-a0d5-4356-bf37-6c820b650dd2`

---

### User Request

> "still not working. showing class attendance as pending"

**Context:** The user reported that the "Mark Attendance" page (`/app/attendance`) was showing every class card with a **"Pending"** status badge, even after an instructor submitted attendance for a cohort.

---

### Investigation Steps

#### Step 1 — Identified the UI symptom location

Examined `client/src/features/attendance/components/AttendancePage.jsx` (the class picker screen).

Found the logic at lines 203-217 that renders the status badge:

```jsx
{!log ? (
  <div className="text-orange-500">Pending</div>
) : log.is_partial ? (
  <div>Partial . {log.first_name}</div>
) : (
  <div>Marked . {log.first_name}</div>
)}
```

**Conclusion:** "Pending" means `!log` — no log was found for that cohort + date in the API response. The query `useCohortAttendanceLogs(todayIso())` was returning an **empty array**.

---

#### Step 2 — Traced the data flow

| Layer | File | Role |
|---|---|---|
| UI | `AttendancePage.jsx` | Renders status badge based on `logs` |
| Hook | `useAttendance.js` > `useCohortAttendanceLogs(date)` | Fetches from API |
| API Service | `attendanceApi.js` > `getLogs(date)` | GET /attendance/logs?date=... |
| Server Route | `attendance/routes.js` | GET /logs > controller.getLogs |
| Server Controller | `attendance/controller.js` > `getLogs()` | Queries `onec_cohort_attendance_logs` |

---

#### Step 3 — Traced the write flow (bulk submit)

Examined `client/src/features/attendance/components/AttendanceRoster.jsx` — the `handleSaveAll()` function (lines 131-161):

```js
await markAttendanceBulk.mutateAsync({
  cohort_id: Number(cohortId),
  date,
  is_full_cohort: isFullCohort,
  records
});
```

Examined the `markBulk` controller in `server/modules/attendance/controller.js` (lines 134-207). Found the critical insert on lines 151-160:

```sql
INSERT INTO onec_cohort_attendance_logs (cohort_id, date, marked_by, is_partial)
VALUES ($1, $2, $3, $4)
ON CONFLICT (cohort_id, date) DO UPDATE
  SET marked_by = EXCLUDED.marked_by,
      is_partial = CASE
        WHEN onec_cohort_attendance_logs.is_partial = FALSE THEN FALSE
        ELSE EXCLUDED.is_partial
      END
```

The controller **always references `is_partial`** — both for INSERT and UPDATE.

Similarly, the `getLogs` controller (lines 304-326) selects:

```sql
SELECT l.cohort_id, l.is_partial, ...
FROM onec_cohort_attendance_logs l
```

---

#### Step 4 — Examined the database schema

Checked the original table creation migration:

**File:** `server/migrations/039_add_cohort_attendance_logs.sql`

```sql
CREATE TABLE IF NOT EXISTS onec_cohort_attendance_logs (
    id SERIAL PRIMARY KEY,
    cohort_id INTEGER NOT NULL REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    marked_by INTEGER REFERENCES onec_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cohort_id, date)
);
```

**BUG FOUND:** The `is_partial` column is **completely absent** from the table definition in migration `039`.

Confirmed the same missing column in the new-tenant provisioning schema:

**File:** `server/scripts/tenant_schema.sql` (lines 687-694, original)

```sql
CREATE TABLE onec_cohort_attendance_logs (
    id SERIAL PRIMARY KEY,
    cohort_id INTEGER NOT NULL REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    marked_by INTEGER REFERENCES onec_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cohort_id, date)
);
```

Same missing column — new tenant provisioning would also be broken.

---

### Root Cause

Every call to `POST /api/v1/attendance/bulk` was **failing silently on the server** with a PostgreSQL error:

```
ERROR: column "is_partial" of relation "onec_cohort_attendance_logs" does not exist
```

Because the server wraps the bulk insert in a transaction (BEGIN / COMMIT / ROLLBACK), this error triggered a full ROLLBACK. The log entry was never inserted into `onec_cohort_attendance_logs`.

As a consequence:
- `GET /attendance/logs?date=...` also failed (references `l.is_partial` in SELECT) — returned 500 — client got empty data
- `logs` array in the UI was always `[]`
- Every class card evaluated `!log === true` — rendered **"Pending"** badge
- Individual student attendance records (`onec_attendance`) were also **not saved** due to the transaction rollback

The error was caught server-side and returned as a generic `500 Internal Server Error`. The client toast showed a generic failure message.

---

### Changes Made

#### 1. New Migration File (for existing tenants)

**File created:** `server/migrations/040_add_is_partial_to_attendance_logs.sql`

```sql
-- Migration 040: Add is_partial column to onec_cohort_attendance_logs
ALTER TABLE onec_cohort_attendance_logs
  ADD COLUMN IF NOT EXISTS is_partial BOOLEAN NOT NULL DEFAULT FALSE;
```

Column semantics:
- `FALSE` (default) — Attendance submitted for the **entire cohort** — class fully done
- `TRUE` — Attendance submitted for **specific students only** — partial submission

---

#### 2. Tenant Schema Updated (for new tenants)

**File modified:** `server/scripts/tenant_schema.sql`

Before (lines 687-694):
```sql
CREATE TABLE onec_cohort_attendance_logs (
    id SERIAL PRIMARY KEY,
    cohort_id INTEGER NOT NULL REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    marked_by INTEGER REFERENCES onec_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cohort_id, date)
);
```

After (lines 688-696):
```sql
CREATE TABLE onec_cohort_attendance_logs (
    id SERIAL PRIMARY KEY,
    cohort_id INTEGER NOT NULL REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    marked_by INTEGER REFERENCES onec_users(id) ON DELETE SET NULL,
    is_partial BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cohort_id, date)
);
```

---

#### 3. Migration Runner Script Created and Executed

**File created:** `server/scripts/run_migration_040.js`

One-time Node.js script that:
1. Connects to the database using `.env` DATABASE_URL
2. Queries `public.onec_tenants` for all approved tenants
3. Runs `ALTER TABLE ... ADD COLUMN IF NOT EXISTS is_partial` on each tenant schema

---

### Database Operations Performed

**Command run:**
```
cd c:\Users\Ashique\OneDrive\Documents\OneCampus\server
node scripts/run_migration_040.js
```

**Console output:**
```
Running migration on 1 tenant schema(s)...
  PASS  tenant_qschool_onecampus_local: is_partial column added (or already existed)

Migration 040 complete.
```

**SQL actually executed on the live database:**
```sql
ALTER TABLE "tenant_qschool_onecampus_local".onec_cohort_attendance_logs
  ADD COLUMN IF NOT EXISTS is_partial BOOLEAN NOT NULL DEFAULT FALSE
```

**Affected tenant schemas:** `tenant_qschool_onecampus_local`
**Rows affected:** Schema altered (DDL), no row data modified.
**Result:** Column added successfully.

---

### Files Created / Modified Summary

| File | Action | Purpose |
|---|---|---|
| `server/migrations/039_add_cohort_attendance_logs.sql` | Inspected only | Identified as source of bug |
| `server/migrations/040_add_is_partial_to_attendance_logs.sql` | CREATED | ALTER TABLE migration for existing tenants |
| `server/scripts/tenant_schema.sql` | MODIFIED | Added `is_partial` column to new-tenant DDL |
| `server/scripts/run_migration_040.js` | CREATED + EXECUTED | One-time migration runner (safe to keep for reference) |

---

### Expected Outcome After Fix

| Scenario | Before Fix | After Fix |
|---|---|---|
| All students present, submit | API 500, log not saved, badge = Pending | Log saved, is_partial=false, badge = Marked |
| Some students absent, submit | API 500, no records saved | Exception records + log saved |
| Single student via search, submit | API 500, no records saved | Log saved, is_partial=true, badge = Partial |
| GET /attendance/logs?date=... | 500 error (SELECT is_partial failed) | Returns correct per-cohort log rows |

---

### Notes

- `ADD COLUMN IF NOT EXISTS` is idempotent — safe to run multiple times.
- No existing data was lost. The column defaults to `FALSE`, correct for any hypothetical pre-existing rows.
- The migration runner script (`run_migration_040.js`) can be kept for audit reference or deleted after confirming production is healthy.

---

*Log entry authored by Antigravity Agent*
*Session: 14c32fb4-a0d5-4356-bf37-6c820b650dd2*
*Timestamp: 2026-07-25T20:23 IST*

---

## Entry 002 — User Discarding Unstaged Changes + DB Revert Reference

**Date:** 2026-07-25
**Time:** ~20:31 IST
**Session ID:** `14c32fb4-a0d5-4356-bf37-6c820b650dd2`

---

### User Request

> "I am going to remove the changes (not staged changes) now — keep a log of that in the Agent log md file — make sure to keep record of db records that are changed in this process. can we revert those records and entries"

**Context:** The user intends to run `git restore .` (or equivalent) to discard all unstaged working-tree changes. They want this event logged, and want to know whether the live DB change (the `ALTER TABLE` from Entry 001) can also be reverted.

---

### Git State at Time of Request

Captured via `git status`:

```
On branch main
Your branch is up to date with 'origin/main'.

Changes to be committed (STAGED — NOT being discarded):
  new file:   client/src/components/DatePicker.jsx
  modified:   client/src/features/attendance/components/AttendanceRoster.jsx
  modified:   server/modules/attendance/controller.js

Changes not staged for commit (UNSTAGED — being discarded by user):
  modified:   .agents/AGENTS.md
  modified:   client/src/features/attendance/components/AttendancePage.jsx
  modified:   client/src/features/attendance/components/AttendanceRoster.jsx
  modified:   client/src/features/attendance/hooks/useAttendance.js
  modified:   client/src/features/attendance/services/attendanceApi.js
  modified:   server/modules/attendance/controller.js
  modified:   server/modules/attendance/routes.js
  modified:   server/scripts/tenant_schema.sql

Untracked files (also NOT being discarded by git restore — these stay):
  AGENT_LOG.md
  server/migrations/040_add_is_partial_to_attendance_logs.sql
  server/scripts/run_migration_040.js
  server/test_query.js
```

**Important distinction:**
- `git restore .` only discards **unstaged tracked files** listed above.
- **Untracked files** (`AGENT_LOG.md`, `040_add_is_partial_to_attendance_logs.sql`, `run_migration_040.js`) are **NOT removed** by `git restore .` — they stay on disk unless explicitly deleted with `git clean -f`.

---

### What Each Discarded Unstaged File Contained

#### 1. `.agents/AGENTS.md`
Added `AGENT_LOG.md` as prerequisite #4 and the Agent Log Rule section.
Reverting this removes those additions — the agent rule will be lost from the project guidelines.

#### 2. `client/src/features/attendance/components/AttendancePage.jsx`
Added:
- Import of `useCohortAttendanceLogs` hook
- `todayIso()` helper function
- Fetching `logs` from the `/attendance/logs` API
- Dynamic status badge: Pending / Partial / Marked based on log data

Reverting this returns the class picker to showing a **hardcoded "Pending"** badge for all classes — the badge was always static before this change.

#### 3. `client/src/features/attendance/components/AttendanceRoster.jsx` (unstaged layer)
Added:
- `isFullCohort` calculation: `!searchQuery.trim() && !initialLearnerId`
- Passing `is_full_cohort: isFullCohort` in the bulk submit payload

#### 4. `client/src/features/attendance/hooks/useAttendance.js`
Added the `useCohortAttendanceLogs(date)` hook export.

#### 5. `client/src/features/attendance/services/attendanceApi.js`
Added `getLogs` method: `GET /attendance/logs?date=...`

#### 6. `server/modules/attendance/controller.js` (unstaged layer)
Added:
- `is_full_cohort` field to `bulkSchema`
- `is_partial` logic in `markBulk` INSERT/ON CONFLICT
- The entire `getLogs` function
- Updated `module.exports` to include `getLogs`

#### 7. `server/modules/attendance/routes.js`
Added route: `GET /logs → controller.getLogs`

#### 8. `server/scripts/tenant_schema.sql`
- Added a duplicate `onec_cohort_attendance_logs` table block around line 126 (likely a paste error during the powershell sed command)
- Added `is_partial BOOLEAN NOT NULL DEFAULT FALSE` to the correct block at line 690

---

### Database Changes Made (Entry 001 — Already Executed on Live DB)

The following DDL was executed on the live PostgreSQL database during Entry 001:

**Schema affected:** `tenant_qschool_onecampus_local`
**Table affected:** `onec_cohort_attendance_logs`
**Operation:** `ALTER TABLE ... ADD COLUMN`

```sql
ALTER TABLE "tenant_qschool_onecampus_local".onec_cohort_attendance_logs
  ADD COLUMN IF NOT EXISTS is_partial BOOLEAN NOT NULL DEFAULT FALSE;
```

**Result at time of execution:**
```
Running migration on 1 tenant schema(s)...
  PASS  tenant_qschool_onecampus_local: is_partial column added (or already existed)
Migration 040 complete.
```

**No row-level data was inserted, updated, or deleted.** Only the schema structure (DDL) was changed.

---

### Can the DB Change Be Reverted?

**Yes — it is safe and straightforward to revert.**

Since only a column was added (no existing rows were modified), the revert is a simple `DROP COLUMN`:

```sql
ALTER TABLE "tenant_qschool_onecampus_local".onec_cohort_attendance_logs
  DROP COLUMN IF EXISTS is_partial;
```

**Run with:**
```
node -e "
require('dotenv').config();
const db = require('./config/db');
db.query('SET search_path TO tenant_qschool_onecampus_local')
  .then(() => db.query('ALTER TABLE onec_cohort_attendance_logs DROP COLUMN IF EXISTS is_partial'))
  .then(() => { console.log('Reverted: is_partial column dropped'); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
" 
```
(run from `server/` directory)

**Impact of reverting the DB column:**
- The `onec_cohort_attendance_logs` table returns to its original state (no `is_partial` column).
- Any existing log rows in that table will lose their `is_partial` value — but since the column was added with `DEFAULT FALSE` and no rows were ever successfully written (all bulk submissions were failing before the fix), there are likely **zero rows** in `onec_cohort_attendance_logs`, making the revert entirely lossless.
- After reverting the DB column, the staged server-side code changes (which reference `is_partial`) must also be discarded or they will crash again.

---

### Summary of What Discarding Unstaged Changes Does

| Layer | Effect |
|---|---|
| Client UI (`AttendancePage.jsx`) | Status badge reverts to always showing hardcoded "Pending" |
| Client hook (`useAttendance.js`) | `useCohortAttendanceLogs` export removed |
| Client service (`attendanceApi.js`) | `getLogs` method removed |
| Server controller (`controller.js`) | `getLogs` function + `is_partial` logic removed |
| Server routes (`routes.js`) | `GET /logs` route removed |
| Server schema (`tenant_schema.sql`) | `is_partial` column line removed from DDL |
| `.agents/AGENTS.md` | Agent log rules removed |
| Live Database | **NOT affected** by `git restore` — DB still has `is_partial` column |

The DB column persists independently of git. A separate SQL revert (above) is required if the DB should also be rolled back.

---

*Log entry authored by Antigravity Agent*
*Session: 14c32fb4-a0d5-4356-bf37-6c820b650dd2*
*Timestamp: 2026-07-25T20:31 IST*

---

## Entry 003 — Attendance Data Breakage (Exception-Model Mismatch) [COMPLETE]

**Date:** 2026-07-25
**Time:** ~21:00 IST
**Session ID:** `1038c693-05cb-5db2-aad9-142777098a43`

---

### User Request

> "after the recent changes complete data seem to be broken - also the contents like reports, attendance marked data (in student profile page) and all is broken - some are showing days present -15/1 This month, and all. read the PRD of changes done recently regarding attendance and fix this ... check the agent_log.md - it has a unfinished task regarding attendance of class showing as pending - fix this by analysing properly. give me a plan and execute once I approve"
> "update all logs and operations and tasks in the AGENT_LOG.md - if any PRD related changes or updates, note it in OneCampus_PRD_v2.md. any rules that I specify should be marked in Rules.md"

---

### Root Cause Analysis

Main branch introduced an **exception-based attendance model** (`markBulk` commits `bdfaa51`, `d2089f6`). Under this model:

- `onec_attendance` stores **only non-present exceptions** (absent / late / excused)
- `onec_cohort_attendance_logs` has one row per (cohort, date) = "attendance was taken"
- **Present** is computed: `present = logged_days - exception_count`

Several parts of the codebase still assumed the **old explicit model** (where `status='present'` rows existed in `onec_attendance`). This caused:

1. **"Days present -15/1 This month"** — `MyAttendanceView` counted `status='present'` rows from `onec_attendance` (always 0 in exception model), then divided by `meta.total` (number of exception rows) — nonsense result.
2. **`attendanceRate30d = 0%` on learner dashboards** — `reports/controller.js` ran `COUNT FILTER WHERE status = 'present'` in `onec_attendance` — always returned 0.
3. **Guardian dashboard broken similarly** — same query pattern.
4. **Class cards showing "Pending" / "--/--"** — `getLogs` endpoint and `useCohortAttendanceLogs` hook were in unstaged changes that the user discarded (per Entry 002). The class picker had no live data source for Marked/Pending state.
5. **HomeInsightsPage attendance card** — showed hardcoded "13/15 days" subtitle regardless of real data.

---

### Files Investigated

- `server/modules/reports/controller.js` — learner + guardian attendance queries
- `server/modules/attendance/controller.js` — getLogs (was missing), markBulk
- `server/modules/attendance/routes.js` — route registration
- `client/src/features/attendance/services/attendanceApi.js`
- `client/src/features/attendance/hooks/useAttendance.js`
- `client/src/features/attendance/components/AttendancePage.jsx`
- `client/src/features/attendance/components/MyAttendanceView.jsx`
- `client/src/features/home/components/HomeInsightsPage.jsx`
- `server/modules/learners/controller.js` — `getProfile` (already correct on main, no change needed)
- All root MD files: `AGENT_LOG.md`, `Future_Features.md`, `OneCampus_PRD_v2.md`, `Rules.md`

---

### Changes Made

#### 1. `server/modules/attendance/controller.js`
**Added** `getLogs(req, res)` function — queries `onec_cohort_attendance_logs` for a given date, joins with cohort + user tables, computes `present_count = total_learners - absent - late - excused`. Added to `module.exports`.

#### 2. `server/modules/attendance/routes.js`
**Added** route: `router.get('/logs', requirePermission('attendance.view'), controller.getLogs);`

#### 3. `server/modules/reports/controller.js`
**Fixed** learner dashboard stats:
- BEFORE: `COUNT(*) FILTER (WHERE status = 'present') FROM onec_attendance` → always 0
- AFTER: `COUNT(*) FROM onec_cohort_attendance_logs WHERE cohort_id = $2 AND date >= ...` for `marked_30d`, then `COUNT(*) FROM onec_attendance WHERE status IN ('absent','late','excused')` for `exceptions_30d`
- `present_30d = marked_30d - exceptions_30d`, `attendanceRate30d = present_30d / marked_30d * 100`

**Fixed** guardian per-child stats identically.

#### 4. `client/src/features/attendance/services/attendanceApi.js`
**Added** `getLogs(date)` method: `GET /attendance/logs?date=...`

#### 5. `client/src/features/attendance/hooks/useAttendance.js`
**Added** `useCohortAttendanceLogs(date)` hook export using `['attendance', 'logs', date]` query key.

#### 6. `client/src/features/attendance/components/AttendancePage.jsx`
**Rewritten** `AttendancePicker`:
- Added `todayIso()` helper
- Fetches `logsData` from `useCohortAttendanceLogs(today)`
- Builds `logsMap` (cohort_id → log entry) for O(1) lookup
- Class cards: Status = "Marked" (green) / "Pending" (orange) based on `logsMap`
- Class cards: Present count = `${log.present_count}/${log.total_learners}` when marked, else "--/--"

#### 7. `client/src/features/home/components/HomeInsightsPage.jsx`
**Fixed** attendance stat card:
- Label: `'Attendance This Week'` → `'Attendance (30 days)'`
- Value fallback: `'87%'` → `'—'`
- Subtitle: hardcoded `'Present • 13 / 15 days'` → dynamic `Present • ${present_30d} / ${marked_30d} days`

#### 8. `client/src/features/attendance/components/MyAttendanceView.jsx`
**Rewritten**:
- Now imports and uses `useDashboardReport` for accurate stats
- Stats cards show `attendanceRate30d`, `present_30d`, `marked_30d` from dashboard report
- Table still shows exception records (absent/late/excused) — correct under exception model
- Empty message: "No absences or exceptions recorded yet."
- 4th stat card: "Exceptions" (count of exception rows, i.e. non-present records)

---

### Commit

`8fa81be` — `fix(attendance): fix exception-based model data breakage`
Branch: `claude/attendance-search-class-list-i50jbb`

---

### Database Operations

None in this session. The `is_partial` column migration was already applied in Entry 001.

---

### Expected Outcomes

| Feature | Before | After |
|---|---|---|
| Learner attendance rate (dashboard) | 0% always | Correct % based on logged days |
| "Present • X / Y days" (HomeInsightsPage) | Hardcoded 13/15 | Real data from dashboard report |
| Class picker — Marked/Pending badge | Always "Pending" | Live from `/attendance/logs` endpoint |
| Class picker — Present count | Always "--/--" | `${present}/${total}` when marked |
| MyAttendanceView stats | Computed from exception rows (wrong) | From dashboard report (correct) |
| Guardian dashboard per-child stats | 0% always | Correct % |

---

### Rules Specified by User This Session

> "read all md files in root before doing any tasks"
> "Keep adding new features and changes to PRD"
> "agent log must be updated with all inputs, ops, actions, tasks done (including file changes, DB updates)"
> "any future features should be noted in Future_Features.md"
> "attendance requirements must be in PRD"
> "any rules that I specify should be marked in Rules.md"

---

*Log entry authored by Antigravity Agent*
*Session: 1038c693-05cb-5db2-aad9-142777098a43*
*Timestamp: 2026-07-25T21:00 IST*

---

## Entry 004 — JSX Syntax Error in AttendancePage (Build Failure) [COMPLETE]

**Date:** 2026-07-25
**Time:** ~21:10 IST
**Session ID:** `1038c693-05cb-5db2-aad9-142777098a43`

---

### User Report

> "there are build errors"

Vite error:
```
Internal server error: AttendancePage.jsx: Unexpected token, expected "}" (241:8)
  239 |             }))
  240 |           )
> 241 |         )}
```

---

### Root Cause

In JSX, `{expression}` is closed by the first bare `}` the parser encounters. The `list.map((c) => { ... return jsx; }))` callback used a **block body** `{...}`. JSX treated the closing `}` of the arrow function block as closing the outer `{!isSearching && (...)}` expression — leaving dangling `))` tokens that caused the parse failure.

---

### Fix

**File modified:** `client/src/features/attendance/components/AttendancePage.jsx`

- Extracted a `ClassCard` named component (placed above `AttendancePicker`) containing the card JSX and per-card variable declarations (`isMarked`, `presentCount`, `totalLearners`)
- Rewrote the class list render to use `list.map((c) => (<ClassCard ... />))` — parenthesized arrow body, no block `{}`
- Also simplified the conditional render from nested ternary to three separate `&&` guards (avoids the same JSX-in-ternary pitfall)

**Commit:** `598ebe0`

---

### Rule Established

> Block-body arrow functions (`(x) => { ... }`) must NOT be used directly inside JSX expression containers `{ }` — the closing `}` of the block is misread by JSX as closing the expression. Always use parenthesized arrow bodies `(x) => (...)` or extract to named components.

---

*Log entry authored by Antigravity Agent*
*Session: 1038c693-05cb-5db2-aad9-142777098a43*
*Timestamp: 2026-07-25T21:10 IST*
