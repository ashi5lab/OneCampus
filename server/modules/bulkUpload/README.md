# Bulk Upload Module

**Purpose**: Import many students, teachers, or staff at once from an Excel (`.xlsx`/`.xls`) or CSV file instead of one-at-a-time via the Students/Teachers/Staff "+ Add" forms. Upload is fire-and-forget: the file is parsed and validated synchronously (fast — it's just bytes already in memory), a job row is created, and the response comes back immediately with a job id. The actual per-row database work happens afterward in the background (see `server/lib/bulkUploadProcessor.js`'s `processJob`) — the frontend polls job status instead of holding one long request open.

## Endpoints

All require **`bulk_upload.manage`** (admin-only by default, like `users.manage_passwords` — bulk-creating many accounts at once is a bigger blast radius than the per-record `learners.manage`/`instructors.manage`/`staff.manage` the single-record create endpoints use).

- `GET /api/v1/bulk-upload/template/:entityType?format=xlsx|csv` — downloads a fillable template (default `xlsx`) with an Instructions sheet and one sample row. `:entityType` is `learner` | `instructor` | `staff`.
- `POST /api/v1/bulk-upload/:entityType/upload` — multipart, field `file`. Returns `202` with the created job (`status: 'processing'`) as soon as the file is validated — does **not** wait for rows to actually be inserted.
- `GET /api/v1/bulk-upload/jobs?entity_type=` — job history list (lightweight — no `errors` array; poll a single job for that).
- `GET /api/v1/bulk-upload/jobs/:id` — single job, including the full `errors` array. Poll this while `status === 'processing'`.
- `GET /api/v1/bulk-upload/jobs/:id/failures.xlsx` — downloads just the failed rows (original data + an `Error` column) so the admin can fix them in place and re-upload.
- `GET /api/v1/bulk-upload/jobs/:id/credentials.xlsx` — downloads every successfully-created row's generated username + password. This is the only place the plaintext passwords exist after processing — they aren't stored anywhere else.

## Column model (`server/lib/bulkUploadFields.js`)

One shared definition drives both the downloadable template and the upload parser, so they can't drift apart. Column matching is header-text-based (case/punctuation-insensitive, plus a few aliases — e.g. "Phone" matches "Mobile Number") rather than column order, so a reordered or renamed-within-reason file still works.

**Students** — required: First Name, Last Name, **Class** (must exactly match an existing Cohort name), **Mobile Number**. Optional: Registry/Roll No (auto-generated if blank), Gender, Date of Birth, Address, Guardian First/Last Name, Guardian Mobile Number (defaults to the student's own number if left blank and a guardian name is given), Guardian Email, Guardian Address.

**Teachers / Staff** — required: First Name, Last Name, Mobile Number. Optional: Staff/Employee ID (auto-generated if blank), Gender.

**Email** (all three entity types) — optional; a placeholder (`<generated username>@<tenant domain>`) is used if left blank. There's no Username/Password column anymore — every row gets a portal login automatically, username and password both generated (see `server/lib/credentials.js`, same generator the single-record "+ Add" forms use) rather than typed into the sheet. Download the job's credentials workbook (`GET .../jobs/:id/credentials.xlsx`) afterward to get everyone's login.

**Guardian dedup**: if a guardian with the exact same phone number already exists in the tenant, the new learner is linked to that existing guardian instead of creating a duplicate — the common real case of siblings sharing one parent's number.

**"Class info is mandatory"** only applies to the student template — teachers/staff have no direct class/cohort relationship in this schema (a teacher's classes come from Timetable allocations — cohort + subject + schedule — which isn't a one-column bulk-import fit); a teacher can be set as a cohort's advisor ("class teacher") individually from the Cohorts page after import.

## Processing (`server/lib/bulkUploadProcessor.js`)

Each row is its own transaction (`BEGIN`/`COMMIT`/`ROLLBACK`) — one bad row never aborts rows before or after it. Rows are processed strictly sequentially on one dedicated DB connection (not `req.db` — see the comment on `processJob` for why: `req.db` is released back to the pool as soon as the HTTP response finishes, and this can still be running long after that), which also means a guardian created by an earlier row in the same file is visible to a later row's phone-dedup lookup (e.g. two siblings uploaded in the same file both land on one guardian). Capped at 2000 data rows per file — large enough for any realistic single-school import; split bigger files.

Every uploaded value round-trips through the sheet as a **string** (`raw: false` when parsing) specifically so phone numbers, roll numbers, and dates don't get silently reinterpreted as spreadsheet numbers (losing a leading zero, or turning a date into a serial number).

## Known limitations (v1, intentional)

- No progress beyond `success_count`/`failure_count` on the job row — no per-row "processing now" indicator; the job's `status` is `processing` until every row has been attempted.
- No queue/worker process — fine at school scale (a few thousand rows, sequential inserts against a local/regional DB finish in well under a minute); would need one for a much larger multi-tenant scale.
- The uploaded file itself isn't retained after processing — only the `errors` array (original row data + message) and the `credentials` array (generated username/password per success) survive, which is what backs the failures/credentials workbook downloads. There's no "did you already download this?" tracking — the credentials endpoint can be called repeatedly (e.g. to re-download after a lost file), same as failures.
