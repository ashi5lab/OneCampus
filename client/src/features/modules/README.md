# Modules Feature (Frontend)

**Purpose**: List and create `onec_modules` rows (Subject/Course/Activity, vocabulary-driven via `t('topic')`/`t('topics')`). Also used as a dropdown data source elsewhere (the evaluations schedule form).

**API Endpoints used**: `GET /api/v1/modules`, `POST /api/v1/modules`.

**Permissions**: server-enforced via `modules.view`/`modules.manage` — see `server/modules/modules/README.md`.
