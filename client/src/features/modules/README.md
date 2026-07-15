# Modules Feature (Frontend)

**Purpose**: Read-only access to `onec_modules` (Subject/Course/Activity, vocabulary-driven), used so far only as a dropdown data source for the evaluations schedule form. No list/create page of its own yet — full CRUD exists on the backend (`server/modules/modules`) but has no dedicated frontend, same gap as Units and Guardians (see HANDOFF.md).

**API Endpoints used**: `GET /api/v1/modules`.
