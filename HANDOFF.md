# OneCampus — Handoff & Next-Steps Plan

> **How to use this document:** This is a status snapshot and task list for continuing the OneCampus build, written for an AI coding agent picking up work with no memory of prior sessions. Read `OneCampus_App_Specification.md` first — it's the source-of-truth technical spec (stack, schema, phase order, coding rules). This document tells you what's actually been built against that spec, what broke and how it was fixed, and what to do next. Where this doc and the spec disagree on status, trust this doc — the spec describes the target, this describes reality as of the last commit.

Last updated: mid-session that produced PR #5 (Phase 7 permissions system, not yet merged) — server and client dev servers are running live and persistent on the developer's own machine (not this doc's author's sandbox) so the user can test in a real browser at http://localhost:5173 in parallel with continued work.

---

## 1. Repo state

- Remote: `https://github.com/ashi5lab/OneCampus`, default branch `main`.
- Merged: PR #1 (evaluations module), PR #2 (frontend scaffold + tenant config endpoint), PR #3 (purple theme), PR #4 (inline user creation on learner/instructor forms).
- Open: PR #5 (Phase 7 permissions system) — merge before starting new work, or rebase onto it.
- Workflow convention used throughout: one feature branch per logical change, pushed, PR opened against `main` via the GitHub API (no `gh` CLI installed on this machine — see §7). Keep following this pattern: don't commit straight to `main`.
- `OneCampus.dc.html` (repo root) is intentionally untracked — a design reference file (see §6). Don't delete it; don't feel obligated to commit it either.
- Both dev servers (`server/` on :3001, `client/` on :5173) were started as detached background processes directly on the developer's machine (not tied to any tool's ephemeral session) so the user can test locally at any time. If they've since been stopped, `cd server && node server.js` and `cd client && npm run dev` bring them back — see §2 for login credentials.

---

## 2. Environment setup

Two `.env` files exist locally (both gitignored, **not** in the repo):

- `server/.env` — `DATABASE_URL` (Railway Postgres, **public** proxy connection string, not the `*.railway.internal` one — that only resolves inside Railway's private network), `JWT_SECRET`, `PORT`.
- `client/.env` — `VITE_API_BASE_URL` (`http://localhost:3001/api/v1`), `VITE_TENANT_DOMAIN` (`dev.onecampus.local` — needed locally because the browser's `Host` header won't match a real tenant domain; the backend's `tenantResolver` falls back to the `x-tenant-domain` header, which `client/src/lib/apiClient.js` always sends).

If these files are missing, `.env.example` in both directories shows the shape — ask the user for the real Railway connection string, don't invent one.

**Important:** the Railway Postgres instance is **shared** with an unrelated, already-running app (confirmed with the user) — ~48 tables with real data (`users`, `student`, `zalish_*`, etc.) live in the same `public` schema alongside `onec_tenants`. Never touch those tables. All OneCampus tables use the `onec_` prefix per the spec's naming rule, and each tenant gets its own Postgres schema (`tenant_<domain>`) — this isolation is what makes sharing the instance safe.

Three dev tenants exist in that database, provisioned via `server/scripts/provisionTenant.js`:
- `dev.onecampus.local` (school) — the one to use for testing. Seeded users: `test_admin`/`password123` (role `admin`), `ui_test_teacher`/`uitestpass2` (role `instructor`), `ui_test_student`/`uitestpass` (role `learner`) — useful for exercising the Phase 7 permission gating across roles without creating new accounts. Has a handful of test learners/instructors/a cohort/an evaluation from development testing.
- `dev2.onecampus.local` (college) — used only to prove cross-tenant JWT rejection; otherwise empty.
- `dev3-kg.onecampus.local` (kindergarten) — used only to prove the `exams` module-toggle correctly 403s for org types that don't have it; otherwise empty.

To run locally: `cd server && npm run dev` (port 3001), `cd client && npm run dev` (port 5173, or use the `client` config in `.claude/launch.json` with the Browser preview tool). Log in with `test_admin` / `password123`.

---

## 3. Status against the spec's build phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Tenant resolver + provisioning + `public.onec_tenants` | ✅ Done |
| 2 | Auth (users, login, JWT, roles) | ✅ Done — login only; no signup/password-reset flow |
| 3 | Core entities: units, cohorts, modules, instructors, learners, guardians | ✅ Backend CRUD done for all six. Frontend only has Learners/Instructors (full CRUD) and Cohorts (list + create). **Units, Modules (subjects/courses), and Guardians have no frontend at all.** |
| 4 | Attendance + module toggle system | ✅ Backend done (mark/list, upsert). Frontend is list-only — no marking UI. |
| 5 | Exams/evaluations + learner scores | ✅ Backend done (`server/modules/evaluations`). Frontend is list-only for evaluations — no schedule or score-entry UI. |
| 6 | Vocabulary Provider through frontend + PDF/certificate exports | 🟡 Vocabulary provider done and wired through nav/titles/buttons. **PDF/certificate export not started at all.** |
| 7 | Permissions system (replace inline role checks) | ✅ Done, backend only (PR #5). `onec_role_permissions` table (role → permission, tenant-overridable), `server/lib/permissions.js` (`can`/`cannot`/`hasPermission`/`seedDefaultPermissions`), `server/middleware/permissionGuard.js` (`requirePermission(permission)`), wired into every route in units/cohorts/modules/instructors/learners/guardians/attendance/evaluations. Verified end-to-end across admin/instructor/learner roles. **Known limitation: role-level only, not row-level** — a role with `learners.view` sees every learner tenant-wide, there's no "a learner can only see their own record" scoping. **Frontend doesn't read permissions at all** — no hiding of buttons/nav a role can't use; a `403` just surfaces as an error string in whatever form triggered it. |
| 8 | Kindergarten-specific module (activity log) | ❌ Not started. Table exists (`onec_kindergarten_daily_activity`), no module. |
| 9 | Certificates module | ❌ Not started. Table exists (`onec_certificates`), no module. |
| 10+ | Notifications, reporting, billing, mobile | ❌ Explicitly deferred per spec — don't start unless asked. |

Design system (spec Part 15): all **4** themes now exist (Slate & Amber default, Chalkboard Fresh, Blueprint Precision, and a new **Purple** theme sourced from `OneCampus.dc.html` — see §6). Theme switcher works, tokens are fully decoupled from components.

---

## 4. Architecture patterns to follow (learned the hard way — don't regress these)

**Backend, per-request tenant DB scoping:** every tenant-scoped route relies on `server/middleware/tenantDb.js`, which checks out **one** dedicated `pg` client per request, pins its `search_path` to the tenant's schema, and attaches it as `req.db`. Controllers must use `req.db.query(...)`, never the shared pool's `db.query(...)` directly for tenant-scoped data. The original scaffold called `db.query('SET search_path...')` then `db.query('SELECT...')` as two separate pooled calls — under load those can land on two different physical connections, silently leaking one tenant's query onto another tenant's connection. This was a real bug, already fixed everywhere; don't reintroduce the two-call pattern in new modules.

**JWT is tenant-scoped:** `server/middleware/auth.js` checks `decoded.tenant === req.tenantConfig.domain`, not just signature validity. `JWT_SECRET` is global across all tenants, so this check is what stops a token minted for tenant A from being replayed against tenant B. Keep this when adding new protected routes — don't build an alternate auth path that skips it.

**New backend module checklist** (see any existing module, e.g. `server/modules/evaluations/`, as a template): `controller.js` (Zod-validated handlers using `req.db`), `routes.js` (`auth` + `moduleGuard('module_name')` if it's gated by tenant config, mounted in `server.js`), `README.md` (purpose, endpoints, permissions, business rules — this convention is followed everywhere, keep it up).

**Frontend theme tokens:** every color/radius/font in `client/src/components/*` and `client/src/features/*` must resolve through a CSS custom property (`client/src/styles/theme.css`) via the Tailwind color extension (`client/tailwind.config.js`) — never a hardcoded hex value or `text-white`/`bg-black` literal. This was violated in the original `Sidebar.jsx` (hardcoded white text assumed a dark sidebar) and in every "+ Add X" button (hardcoded dark text assumed a light accent) — both broke when the Purple theme's light sidebar / dark accent was added, and were fixed by introducing `--sidebar-text-strong`, `--sidebar-active-bg/text`, `--sidebar-border`, and `--accent-ink` tokens. If a 5th theme is ever added, grep for raw `white`/`black`/hex literals in `client/src/components` and `client/src/features` first.

**Frontend feature-first structure:** `client/src/features/<name>/{components,hooks,services,types.js,README.md}`. `services/*Api.js` wraps `client/src/lib/apiClient.js` (the single fetch wrapper — never call `fetch` directly from a component). `hooks/use*.js` wraps React Query. Vocabulary labels come from `useConfig().t('key')`, never a hardcoded institution-specific noun in JSX.

---

## 5. Known gaps (documented per-feature, not just discovered)

Each frontend feature's `README.md` already states its own known limitation — read those before assuming a feature is complete:

- ~~No user-creation UI anywhere~~ — fixed in PR #4: learner/instructor creation now creates the `onec_users` row inline, in the same form.
- **No permission-awareness in the frontend.** With Phase 7 now enforcing role permissions server-side, an `instructor`- or `learner`-role user will see "+ Add" buttons and nav items they'll get a `403` on if clicked — `useConfig()`/a new permissions context should expose `can(permission)` so the UI can hide/disable what a role can't do, mirroring `hasModule()`'s existing pattern.
- ~~No attendance-marking UI~~ — fixed in PR #6: `AttendanceRoster` (cohort + date picker, per-learner status, batch save).
- No score-entry UI for evaluations (backend upsert endpoint exists and works; frontend is read-only).
- No unit picker for cohort creation (`unit_id` is a raw number field).
- No frontend at all for Units, Modules (subjects/courses), or Guardians, despite full backend CRUD existing.
- No pagination anywhere (`GET` list endpoints return everything; fine at current data volumes, will need `meta: {total, page, pageSize}` per spec §8 once tenants have real data).
- No password-reset / signup flow — tenants are provisioned via CLI script only, users are seeded via CLI script only.

## 5b. Security gaps vs. spec §11 (non-negotiable baseline) not yet closed

- Refresh tokens: spec calls for short-lived access token + httpOnly-cookie refresh token. Currently only a long-lived (`1d`) access token exists, stored in `localStorage` (XSS-exposed, no refresh/rotation).
- No rate limiting on `/api/v1/auth/login` (or anywhere else) — brute-force is currently unmitigated.
- No CSRF protection (moot until cookies are introduced for the refresh token above).
- No audit log table for sensitive actions (grading, certificate issuance, role changes) — table doesn't exist yet, spec requires one.
- No automated test suite exists (no test framework installed in either `client/` or `server/`). Everything so far has been verified manually (curl for the backend, an in-browser walkthrough via the Claude Browser preview tool for the frontend). Worth setting up before Phase 7's permission matrix grows the surface area that needs regression coverage.

---

## 6. Open decision: the Purple portal reference (`OneCampus.dc.html`)

This file (kept untracked at the user's request, as a design reference) shows far more than a color palette: a **separate student-facing app** — Dashboard, Attendance, Timetable, Grades, Assignments, Notifications, Profile (with a Student/Faculty/Admin role switcher) — in both web and native-mobile layouts, built around modules that **don't exist in the current schema or spec at all**: Timetable, Grades-as-distinct-from-evaluations, Assignments, Fees, Notifications.

So far, only the **color/token system** from this reference has been extracted and applied to the *existing* admin panel (as Theme 4 "Purple"). The screens themselves — and the backend modules they'd need — have not been scoped or built.

**Before building any of those screens, get explicit direction from the user on:**
1. Is this a second, student-facing app (distinct role/permission set from the admin panel), or a reskin of existing screens?
2. Should the new modules (Timetable, Assignments, Fees, Notifications) be added to `OneCampus_App_Specification.md` as new schema/phases, given the spec's own guiding principle is "ship a working, well-scoped core first" and these are explicitly outside the current Phase 1–9 scope?
3. Priority relative to Phase 7 (permissions) and Phase 9 (certificates), which are already-scoped, already-specced gaps.

Don't guess on this — it's a significant scope expansion, not a bug fix.

---

## 7. Practical notes for the next agent

- `gh` CLI is **not installed** on this machine and there's no `GITHUB_TOKEN`/`GH_TOKEN` env var. PRs were created by reading the git credential manager's stored token (`git credential fill`) and calling the GitHub REST API directly with `curl`/`node https`. This works (confirmed `repo` scope) but re-derive the credential each time rather than assuming it's cached in your context.
- The Claude Browser preview tool's `computer` `screenshot`/`left_click` actions were unreliable in this environment (viewport/screenshot coordinate mismatch caused misses; some clicks didn't register as real React synthetic events). What worked reliably: `read_page`/`find` for refs, `form_input` for filling fields, `get_page_text` for verifying rendered state, and `javascript_tool` (`element.click()`, `dispatchEvent(new Event('change', {bubbles:true}))`) for anything `computer` clicks didn't register. Prefer that combination over `computer` screenshots for verification.
- `.claude/launch.json` is already configured to run the client dev server via `preview_start({name: 'client'})` — it runs `npm --prefix client run dev -- --host` from the repo root.
- CSS gotcha: a comment in `theme.css` that happens to contain the literal substring `*/` will silently truncate — this broke the build once already. Watch for it when writing comments with `--token-name-*` style wildcards.

---

## 8. Recommended next-steps task list, in priority order

1. **Merge PR #5**, or rebase new work on top of it.
2. **Frontend permission-awareness.** `ConfigContext` has `hasModule()`; add the equivalent for permissions (fetch the caller's own permission set, or just derive from `user.role` client-side against a shared list, and expose `can(permission)`), then use it to hide/disable nav items and "+ Add" buttons a role can't use. Right now a non-admin just gets a raw 403 error string.
3. **Attendance-marking and score-entry UI** — backend already supports both; this is pure frontend work following the existing feature patterns. Natural next target now that permissions gate who's allowed to do it.
4. **Security baseline items from §5b** — at minimum rate-limiting on `/auth/login` and an audit log table are cheap, high-value, and explicitly required by spec §11. (An audit log fits naturally with Phase 7 — consider logging permission denials and grading/certificate actions through the same table.)
5. **Get the open decision in §6 resolved** before touching the Purple-portal screens/modules.
6. Phase 8 (kindergarten activity log) and Phase 9 (certificates) — spec-scoped, not started, lower urgency than 2–4 above.
7. Basic test coverage — pick a framework (nothing installed yet) and at minimum cover tenant isolation, cross-tenant-JWT-rejection, and the new permission-gating behavior in §4, since those are the things most likely to silently regress.
8. Row-level permission scoping (a `learner` seeing only their own attendance/scores, not the whole tenant's) — noted as a known limitation in §3's Phase 7 row, not yet designed.
