# OneCampus — Universal Educational ERP (SaaS)
### Technical Specification for AI Coding Agents

> **How to use this document:** This is the complete blueprint for building OneCampus. Give this file to any AI coding agent (Claude Code, Cursor, Copilot, etc.) as the source of truth before it writes any code. Follow the phases in order — do not skip ahead to advanced modules before the foundation (Part 1–4) is working and tested.

---

## 0. Project Summary

OneCampus is a **multi-tenant Educational ERP SaaS** that auto-adapts its terminology, features, and UI for three institution types from a **single codebase**:

- 🧸 **Kindergarten** — activity logs, meal/nap tracking, daily check-in
- 🏫 **School** — exams, marksheets, ranklists, attendance, homework
- 🎓 **College** — credit hours, GPA, semester scheduling, course sections

A new tenant is provisioned through a setup wizard, gets an isolated PostgreSQL schema, and the application automatically renames labels (e.g. "Teacher" → "Professor"), shows/hides modules, and applies branding — without any code branching per institution type.

**Guiding principle for the build:** ship a working, well-scoped core first. Do not introduce new frameworks, engines, or platforms (mobile app, microservices, workflow engines) until the core (Parts 1–7) is stable in production for at least one real tenant.

---

## 1. Tech Stack (v1 — Ship This)

Keep the stack boring and small for v1. Do not deviate without explicit approval.

| Layer | Choice |
|---|---|
| Frontend | React (Vite), React Router, React Query (TanStack Query) |
| Forms & Validation | React Hook Form + Zod |
| Styling | Tailwind CSS (namespaced with a `tw-` prefix if coexisting with an existing UI library like MUI/Bootstrap) |
| Backend | Node.js + Express |
| ORM / DB Access | node-postgres (`pg`) with hand-written SQL, or Prisma if the team prefers a schema-first ORM — pick one and stay consistent |
| Database | PostgreSQL (schema-per-tenant isolation, see Part 3) |
| Auth | JWT (access + refresh tokens), bcrypt for password hashing |
| File storage | S3-compatible bucket (or local disk in dev) |
| Caching / Queues | Redis (optional in v1, required once notifications/background jobs are added) |
| Hosting | Any Node-friendly host (Railway, Render, AWS) — defer this decision until deployment phase |

**Explicitly deferred to a future phase (do not build now):** mobile app (React Native/Expo), Next.js migration, NestJS migration, monorepo restructuring, GraphQL, microservices, offline-first sync, WebSockets, workflow engine. These are valid ideas *if OneCampus grows into a funded, multi-team product* — they are not v1 requirements and will slow down shipping if built prematurely.

---

## 2. High-Level Architecture

```mermaid
graph TD
    Host[Request Domain: college1.onecampus.com] --> Resolver[Tenant Resolver Middleware]
    Resolver --> DB[(PostgreSQL)]
    DB -->|Fetch tenant row + config| Engine[Adaptation Layer]

    subgraph Adaptation Layer
        Vocabulary[Vocabulary Provider: "Professor" vs "Teacher"]
        Modules[Module Toggles: Exams vs Activity Log]
        Theme[Branding: colors, logo]
    end

    Engine --> API[Express API]
    Engine --> Web[React Web App]
```

**Core idea:** one codebase, one deployment. Tenant identity is resolved per-request (by subdomain or custom domain), and everything downstream — API responses, UI labels, active nav items — adapts based on that tenant's config, without `if (orgType === 'school')` scattered through the code. All type-specific behavior routes through the **Vocabulary Provider** and **Module Toggle** system defined below.

---

## 3. Multi-Tenancy & Database Design

### 3.1 Isolation strategy
**Schema-per-tenant** in a single PostgreSQL instance: each tenant gets its own Postgres schema (e.g. `tenant_rhss`), while a shared `public` schema holds the tenant directory. This gives strong data isolation without the operational overhead of separate databases per customer.

**Table Naming Rule:** All tables must be created with the prefix `onec_` (e.g., `onec_users`, `onec_tenants`) to prevent namespace collisions.

### 3.2 Public schema — tenant directory

```sql
CREATE TABLE public.onec_tenants (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,       -- e.g. 'rhss.onecampus.com'
    schema_name VARCHAR(63) UNIQUE NOT NULL,   -- e.g. 'tenant_rhss'
    org_name VARCHAR(255) NOT NULL,
    org_type VARCHAR(30) NOT NULL,             -- 'kindergarten' | 'school' | 'college'
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB NOT NULL,                     -- active_modules, branding, vocabulary_override
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 Per-tenant schema tables

```sql
-- Users
CREATE TABLE onec_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,  -- 'admin', 'staff', 'instructor', 'learner', 'guardian'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Structural units (Department, Faculty, Wing)
CREATE TABLE onec_units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    head_user_id INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cohorts: Class (school) / Course Section (college) / Playgroup (kindergarten)
CREATE TABLE onec_cohorts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    unit_id INT REFERENCES onec_units(id),
    time_block VARCHAR(20) NOT NULL,   -- '2026-2027' or 'Fall Semester 2026'
    advisor_id INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modules: Subject (school) / Course (college) / Activity (kindergarten)
CREATE TABLE onec_modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    unit_id INT REFERENCES onec_units(id),
    credits INT DEFAULT 0
);

CREATE TABLE onec_instructors (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES onec_users(id) ON DELETE CASCADE,
    staff_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    meta JSONB DEFAULT '{}'
);

CREATE TABLE onec_guardians (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES onec_users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    meta JSONB DEFAULT '{}'
);

CREATE TABLE onec_learners (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES onec_users(id) ON DELETE CASCADE,
    registry_no VARCHAR(50) UNIQUE NOT NULL,   -- admission/roll number
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    cohort_id INT REFERENCES onec_cohorts(id),
    status VARCHAR(20) DEFAULT 'active',
    meta JSONB DEFAULT '{}'                    -- allergies, majors, credit limits, etc.
);

CREATE TABLE onec_learner_guardian_map (
    learner_id INT REFERENCES onec_learners(id) ON DELETE CASCADE,
    guardian_id INT REFERENCES onec_guardians(id) ON DELETE CASCADE,
    PRIMARY KEY (learner_id, guardian_id)
);

CREATE TABLE onec_allocations (
    id SERIAL PRIMARY KEY,
    cohort_id INT REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    module_id INT REFERENCES onec_modules(id) ON DELETE CASCADE,
    instructor_id INT REFERENCES onec_instructors(id) ON DELETE CASCADE,
    schedule_data JSONB NOT NULL,   -- { days: ["Monday"], hour: "09:00-10:00" }
    time_block VARCHAR(20) NOT NULL
);

CREATE TABLE onec_attendance (
    id SERIAL PRIMARY KEY,
    learner_id INT REFERENCES onec_learners(id) ON DELETE CASCADE,
    cohort_id INT REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    allocation_id INT REFERENCES onec_allocations(id),  -- null for daily, set for hour-based
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,   -- 'present', 'absent', 'late', 'excused'
    remarks VARCHAR(255),
    marked_by INT REFERENCES onec_users(id),
    UNIQUE(learner_id, date, allocation_id)
);

CREATE TABLE onec_evaluations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    time_block VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL   -- 'exam', 'activity_log', 'project'
);

CREATE TABLE onec_evaluation_schedules (
    id SERIAL PRIMARY KEY,
    evaluation_id INT REFERENCES onec_evaluations(id) ON DELETE CASCADE,
    module_id INT REFERENCES onec_modules(id) ON DELETE CASCADE,
    eval_date DATE NOT NULL,
    max_score DECIMAL(5,2) DEFAULT 100.0,
    passing_score DECIMAL(5,2) DEFAULT 40.0
);

CREATE TABLE onec_learner_scores (
    id SERIAL PRIMARY KEY,
    eval_schedule_id INT REFERENCES onec_evaluation_schedules(id) ON DELETE CASCADE,
    learner_id INT REFERENCES onec_learners(id) ON DELETE CASCADE,
    score_obtained DECIMAL(5,2) NOT NULL,
    remarks VARCHAR(255),
    graded_by INT REFERENCES onec_users(id)
);

CREATE TABLE onec_kindergarten_daily_activity (
    id SERIAL PRIMARY KEY,
    learner_id INT REFERENCES onec_learners(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_intake VARCHAR(100),
    sleep_duration VARCHAR(50),
    activities TEXT[],
    logged_by INT REFERENCES onec_users(id)
);

CREATE TABLE onec_certificates (
    id SERIAL PRIMARY KEY,
    learner_id INT REFERENCES onec_learners(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,   -- 'transfer_certificate', 'conduct', 'degree'
    certificate_no VARCHAR(100) UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    issued_by INT REFERENCES onec_users(id),
    data JSONB NOT NULL
);
```

All new tables/columns going forward must be added via **additive migrations only** (no destructive `ALTER`/`DROP` on existing production tables without an explicit, reviewed migration plan and rollback strategy).

---

## 4. Tenant Provisioning

```javascript
// server/scripts/provisionTenant.js
async function provisionTenant({ domain, name, type }) {
  let activeModules = [];

  if (type === 'kindergarten') {
    activeModules = ['attendance', 'kindergarten_activity', 'messaging'];
  } else if (type === 'school') {
    activeModules = ['attendance', 'exams', 'marks', 'messaging', 'certificates'];
  } else if (type === 'college') {
    activeModules = ['attendance', 'exams', 'marks', 'course_credits', 'certificates'];
  }

  const config = {
    active_modules: activeModules,
    branding: { primaryColor: '#4f46e5', logoUrl: '/logo.png' },
    vocabulary_override: {}
  };

  const schemaName = `tenant_${domain.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // 1. Insert into public.tenants
  // 2. CREATE SCHEMA <schemaName>
  // 3. Run the schema DDL above inside that schema, inside a transaction
  // 4. Rollback the whole transaction on any failure
}
```

---

## 5. Vocabulary Provider (Terminology Aliasing)

Never hardcode institution-specific labels like "Teacher" or "Subject" anywhere in the UI or API responses. Every label resolves through a vocabulary dictionary, keyed by org type, with per-tenant overrides layered on top from `config.vocabulary_override`.

```javascript
const vocabulary = {
  kindergarten: { instructor: "Caregiver", cohort: "Playgroup", topic: "Activity", leader: "Director", term: "Period" },
  school:       { instructor: "Teacher",   cohort: "Class",     topic: "Subject",  leader: "Principal", term: "Term" },
  college:      { instructor: "Professor", cohort: "Course Section", topic: "Course", leader: "Dean", term: "Semester" }
};
```

Frontend usage: `const { t } = useVocabulary(); <h1>{t('instructor')} Directory</h1>`
Backend usage: apply the same dictionary when generating labels in exported PDFs, certificates, and notification templates, so terminology stays consistent everywhere, not just in the UI.

---

## 6. Module Toggle System

Each tenant's `config.active_modules` array controls what's visible and reachable — in both the API and the UI. Never gate a feature only in the frontend; always enforce it server-side too.

**Backend guard:**
```javascript
// middleware/moduleGuard.js
module.exports = (requiredModule) => (req, res, next) => {
  const activeModules = req.tenantConfig.active_modules || [];
  if (!activeModules.includes(requiredModule)) {
    return res.status(403).json({ error: `The ${requiredModule} module is not enabled for this institution.` });
  }
  next();
};

router.post('/activity-logs', auth, moduleGuard('kindergarten_activity'), handler);
```

**Frontend usage:**
```jsx
const { config, t } = useConfig();
{config.active_modules.includes('course_credits') && <NavLink to="/credits">Credit Registrar</NavLink>}
```

---

## 7. Permissions

Do not scatter `if (role === 'admin')` checks through the codebase. Centralize permission checks behind helper functions backed by a permissions table (role → permission mapping, tenant-overridable).

```javascript
can(user, 'attendance.mark')
cannot(user, 'certificates.issue')
hasPermission(user, 'exams.grade')
```

This makes it possible to later introduce custom roles per tenant without rewriting every route/component.

---

## 8. API Design Rules

- All frontend network calls go through a single API client module (handles base URL, auth headers, retries, error normalization) — never call `fetch`/`axios` directly from components.
- Every mutating endpoint validates its input with Zod (or an equivalent schema validator) before touching the database.
- Standard error response shape: `{ error: string, code?: string, details?: object }`.
- Standard success shape for lists: `{ data: [...], meta: { total, page, pageSize } }`.
- Version the API under `/api/v1/...` from day one to avoid breaking changes later.
- Auth: JWT access token (short-lived) + refresh token (httpOnly cookie). Rate-limit login and password-reset endpoints.

---

## 9. Frontend Structure (Feature-First)

Group by feature, not by file type, so everything related to one module stays together:

```
client/src/
  features/
    attendance/
      components/
      hooks/
      services/
      types.ts
      README.md
    exams/
    students/
    teachers/
    classes/
  components/        <- shared, reusable, presentational only (no API calls, no business logic)
  contexts/          <- Auth, Config/Tenant, Theme
  lib/               <- api-client, validation schemas, vocabulary provider
  hooks/             <- shared cross-feature hooks
```

Backend, mirror the same idea:

```
server/
  modules/
    attendance/
      routes.js
      controller.js
      service.js
      permissions.js
  middleware/
    tenantResolver.js
    moduleGuard.js
    auth.js
  scripts/
    provisionTenant.js
```

---

## 10. State Management

- **Server state** (anything fetched from the API): React Query. Do not duplicate this into a global store.
- **Global client state** (current tenant, theme, auth session): React Context, kept minimal.
- **Local/complex UI state** (multi-step forms, filters): component-local `useState`/`useReducer`, or Zustand only if a genuine cross-page client state need arises. Do not introduce Redux for v1 — it isn't needed at this scale.

---

## 11. Security Baseline (non-negotiable for v1)

- Passwords hashed with bcrypt (cost factor ≥ 10).
- Helmet for HTTP security headers.
- Rate limiting on auth endpoints and any public-facing forms.
- Parameterized queries everywhere (no string-concatenated SQL) to prevent injection.
- CSRF protection on cookie-based sessions.
- Input validation (Zod) on every mutating endpoint, both client and server side.
- Audit log table for sensitive actions (grading changes, certificate issuance, role changes).
- Enforce tenant isolation at the query layer — every query must be scoped to the resolved tenant's schema; add a test that verifies cross-tenant data cannot leak.

---

## 12. Coding Rules (`AI_RULES.md` — give this to every AI coding assistant)

```
- Never hardcode UI colors — use theme tokens / Tailwind config values.
- Never hardcode institution-specific labels — always resolve through the Vocabulary Provider.
- Never call fetch/axios directly from a component — use the shared API client.
- Always validate input with Zod before it touches the database.
- Always check module toggles server-side, not just in the UI.
- Always use permission helpers (can/cannot/hasPermission), never inline role checks.
- No `any` type in TypeScript (if using TS).
- No `console.log` left in committed code — use the shared logger.
- No destructive database migrations without an explicit rollback plan.
- Every new feature folder gets a short README.md: purpose, API endpoints, permissions, business rules.
- Keep components in `components/` presentational-only — no API calls, no business logic there.
```

---

## 13. Build Phases (recommended order)

| Phase | Scope |
|---|---|
| 1 | Tenant resolver + provisioning script + public.tenants table |
| 2 | Auth (users, login, JWT, roles) |
| 3 | Core entities: units, cohorts, modules, instructors, learners, guardians |
| 4 | Attendance module + module toggle system |
| 5 | Exams/evaluations + learner scores |
| 6 | Vocabulary Provider wired through frontend + PDF/certificate exports |
| 7 | Permissions system (replace any inline role checks) |
| 8 | Kindergarten-specific module (activity log) as first test of the toggle system with a genuinely different feature set |
| 9 | Certificates module |
| 10+ | Notifications, reporting/analytics, billing, mobile app — only after 1–9 are live with a real tenant |

**Do not start Phase 8+ work until Phases 1–7 are deployed and working for at least one real institution.** Resist the urge to add engines, a monorepo, or a mobile app before the core product proves itself.

---

## 14. Explicitly Out of Scope for v1

To keep an AI agent (or a human dev) from over-building, these are deferred until there's a proven need:

- Mobile app (React Native / Expo)
- Monorepo restructuring / shared component packages across platforms
- NestJS / Next.js / Prisma migration
- Workflow engine, notification engine as separate abstractions
- Offline-first sync with conflict resolution
- Multi-language localization (build the vocabulary/i18n hooks now, but don't translate content yet)
- Microservices split
- Custom per-tenant theming beyond primary color + logo

---

## 15. Design System — Theme Options

Three fully-built HTML mockups of the same screen (Students list, from the School Management module) are provided as reference alongside this spec:

- `mockup-1-slate-amber.html`
- `mockup-2-chalkboard-fresh.html`
- `mockup-3-blueprint-precision.html`

**Do not default to just one.** Build the app so any of the three can be selected — either as a one-time decision at project setup, or (since the tenant `config` object already carries a `branding` field, see Part 4) as a per-tenant theme choice down the line. Concretely:

1. Implement all shared UI (`packages/ui` equivalent, or `client/src/components/`) using **CSS custom properties** for every color, radius, and font — never hardcoded hex values or font names inside component files.
2. Define each theme below as a single CSS variables block (or a JS token object if using a CSS-in-JS/Tailwind config approach). Switching themes should mean swapping one variables block, not touching component code.
3. Ship with **Theme 1 (Slate & Amber)** as the default unless told otherwise, but keep the other two implemented and selectable via a settings toggle (even if just for internal/admin use at first) — this doubles as the test that the token system is actually decoupled from the components.
4. When in doubt about a style decision not covered below (e.g. a component the mockups don't show, like a modal or a form), extrapolate from the chosen theme's existing tokens rather than inventing a new visual language.

### Theme 1 — Slate & Amber
*Cool, neutral, productivity-tool feel. Best default: professional, ages well, doesn't read as "for kids."*

| Token | Value |
|---|---|
| `--bg` | `#F5F6F8` |
| `--surface` | `#FFFFFF` |
| `--ink-900` (primary text / sidebar bg) | `#1C2230` |
| `--ink-700` | `#3A4358` |
| `--ink-500` (muted text) | `#6B7488` |
| `--border` | `#D7DBE3` |
| `--surface-muted` | `#EEF0F4` |
| `--accent` (amber) | `#E5A331` |
| `--accent-dark` | `#B8791A` |
| `--success` | `#2E7D5B` |
| `--danger` | `#C24545` |
| Radius | `10px` |
| Display/body font | System sans (`-apple-system, "Segoe UI", sans-serif`) |
| Data/mono font | `"JetBrains Mono", "SF Mono", monospace` — used for IDs, roll numbers |
| Signature element | Amber-highlighted active nav item against a dark slate sidebar; thin attendance progress bars in table rows |

### Theme 2 — Chalkboard Fresh
*Warm, education-coded without being childish. Best if the product should feel approachable to non-technical school staff and parents.*

| Token | Value |
|---|---|
| `--bg` (cream) | `#FBF7EE` |
| `--surface` | `#FFFFFF` |
| `--sidebar-bg` (forest green) | `#1F3D2E` |
| `--sidebar-bg-hover` | `#2E5540` |
| `--ink` | `#26301F` |
| `--ink-soft` | `#6B7460` |
| `--accent-mustard` | `#E0A83B` |
| `--accent-coral` | `#E27554` |
| `--border` | `#E7E1D2` |
| `--success` | `#4C8B5B` |
| Radius | `16px` (generous, friendly) |
| Display font | Serif (`Georgia` / `Iowan Old Style`) for headings and stat values |
| Body/UI font | System sans for nav, buttons, table body |
| Data/mono font | `"Courier New", monospace` — used for eyebrows and IDs, typewriter/report-card feel |
| Signature element | Mustard dashed rule along the sidebar edge; pill-shaped chips and buttons throughout; per-student avatar colors drawn from the palette instead of one flat color |

### Theme 3 — Blueprint Precision
*Technical, structured, "system of record" feel. Best if the product should read as precise/enterprise rather than warm.*

| Token | Value |
|---|---|
| `--bg` | `#FAFBFC` with a subtle 24px graph-paper grid overlay (`--grid-line: #DCE4EC`) |
| `--surface` | `#FFFFFF` |
| `--ink` | `#0F1A2B` |
| `--sidebar-bg` (navy) | `#0B3D66` |
| `--blue-600` | `#1B5C93` |
| `--blue-100` (tinted surface) | `#E4EEF6` |
| `--steel` (muted text) | `#5A6B7D` |
| `--accent-lime` (positive/active) | `#7FB93F` |
| `--accent-rust` (warning/pending) | `#C2542B` |
| Radius | `4px` (sharp, minimal) |
| Display/body font | `Inter` / system sans |
| Data/mono font | `"JetBrains Mono", "SF Mono", monospace` — used pervasively: eyebrows, nav labels, stat values, badges, buttons |
| Signature element | Graph-paper grid background; numbered nav items (`00`, `01`, `02`…); hard 1.5px borders instead of shadows; all-caps monospace micro-labels everywhere |

### Implementation notes for the agent
- All three themes share the **same layout structure** (fixed sidebar + main content, stat-card row, filterable table card) — only tokens and a few structural details (radius, borders vs. shadows, serif vs. mono accents) differ. This confirms layout and tokens can be cleanly separated in code.
- Table density, stat card layout, badge/chip shapes, and the attendance progress bar are UI patterns common to all three — treat them as reusable components (`<StatCard>`, `<Badge>`, `<DataTable>`, `<AttendanceBar>`) that simply consume whichever theme's tokens are active, rather than three separate implementations.
- Apply the vocabulary layer (Part 5) inside these same components — e.g. `<Badge>` for a college learner's status and a kindergarten learner's status should look identical in styling, only the label text should change.
