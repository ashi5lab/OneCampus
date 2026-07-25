# Assignment Module — Implementation Tracker

Branch: `claude/attendance-search-class-list-i50jbb`
Started: 2026-07-25
Status: 🔄 In Progress

---

## Overview

Full Assignment Management workflow for OneCampus. Covers teacher creation, student valuation, publish/unpublish, and a complete status lifecycle. Built mobile-first, reusing all existing OneCampus components and patterns.

---

## Screens

| Screen | Description |
|---|---|
| Assignment List | Search, filter, paginated table |
| Create / Edit Assignment | Dedicated form page |
| Assignment Details | Overview + student valuation |
| Assignment Created | Success state |

---

## Status Flow

```
Draft → Created → Grading In Progress → Completed → Published
```

---

## Task List

### 🗄️ Database

- [x] Migration: `onec_assignments` — added status, eval_type, passing_marks, pass_grade, instructions, target_type columns
- [x] Migration: `onec_assignment_cohorts` join table (assignment ↔ cohorts)
- [x] Migration: `onec_assignment_target_students` join table (assignment ↔ specific students)
- [x] Migration: `onec_assignment_submissions` — added grade_value, status columns
- [ ] Migration: `onec_assignment_attachments` table (deferred — file upload not yet implemented)

### 🔧 Server — Core

- [x] `server/modules/assignments/controller.js`
  - [x] `listAssignments()` — paginated, search (title/module/user/cohort), filter (cohort_id/status/date range), role-scoped
  - [x] `getAssignment()` — single with grading stats (total_graded, total_students)
  - [x] `createAssignment()` — handles class vs specific_students target, Zod validation
  - [x] `updateAssignment()` — ownership check, re-syncs cohorts/students
  - [x] `duplicateAssignment()` — clones as draft, copies cohorts and students
  - [x] `togglePublish()` — PATCH publish_marks true/false
  - [x] `completeValuation()` — validates 100% graded, sets status=completed + publish_marks=true
  - [x] `getValuationStudents()` — paginated student list with submission join, search by name/reg
  - [x] `upsertGrade()` — ON CONFLICT upsert, auto-advances status to grading_in_progress
  - [x] Helper: `resolveUserIdsToLearnerIds`, `syncAssignmentCohorts`, `syncTargetStudents`
- [x] `server/modules/assignments/routes.js` — all new routes registered
- [x] Module registered in `server/index.js` (existing)
- [x] Permissions: assignments.view, assignments.manage, assignments.grade, assignments.submit (existing)

### 🖥️ Client — Services & Hooks

- [x] `client/src/features/assignments/services/assignmentsApi.js` — full rewrite
  - [x] list (server-paginated with filters)
  - [x] get (single assignment)
  - [x] create / update / remove / duplicate
  - [x] togglePublish
  - [x] getValuationStudents
  - [x] upsertGrade
  - [x] completeValuation
- [x] `client/src/features/assignments/hooks/useAssignments.js` — full rewrite
  - [x] useAssignments(filters) — paginated list
  - [x] useAssignment(id) — single record
  - [x] useCreateAssignment, useUpdateAssignment, useDeleteAssignment, useDuplicateAssignment
  - [x] useTogglePublish
  - [x] useCompleteValuation
  - [x] useValuationStudents(assignmentId, params)
  - [x] useUpsertGrade(assignmentId)

### 🖥️ Client — Pages & Components

- [x] **MultiSearchSelect** (`client/src/components/MultiSearchSelect.jsx`)
  - [x] Chip-based multi-select with inline search input
  - [x] Keyboard navigation (Arrow, Enter, Escape, Backspace)
  - [x] Filters already-selected options from dropdown

- [x] **AssignmentStatusBadge + PublishBadge** (`components/AssignmentStatusBadge.jsx`)
  - [x] Draft / Created / Grading In Progress / Completed

- [x] **AssignmentsPage** (`/app/assignments`)
  - [x] Search bar (title, subject, class…)
  - [x] Filter: Class (autocomplete SearchSelect)
  - [x] Filter: Status chip/select
  - [x] Filter: Date range (from/to)
  - [x] DataTable with all columns (Title, Subject, Class, Due, Status, Published)
  - [x] Row actions: View, Edit, Duplicate, Delete
  - [x] Server pagination
  - [x] Empty state

- [x] **AssignmentFormPage** (`/app/assignments/new`, `/app/assignments/:id/edit`)
  - [x] Assignment title field
  - [x] Subject dropdown (from onec_modules)
  - [x] Due Date date picker
  - [x] Description (optional)
  - [x] Target: Class(es) / Specific Students radio
    - [x] Class mode — MultiSearchSelect with autocomplete class picker
    - [x] Specific Students — MultiSearchSelect with learner search
  - [x] Evaluation Type: Marks / Grades radio
    - [x] Marks: Max Marks + Pass Marks fields
    - [x] Grades: Pass Grade dropdown
  - [x] Instructions (optional textarea)
  - [x] Save as Draft / Create Assignment / Cancel actions
  - [x] Edit mode pre-fill (useEffect + reset)
  - [x] Zod validation

- [x] **AssignmentDetailPage** (`/app/assignments/:id`)
  - [x] Assignment summary in PageHeader with status/publish badges
  - [x] Tabs: Overview | Students (grader only)
  - [x] Class selector (multi-class assignments, shown in Students tab)
  - [x] Student valuation table (ValuationTab)
    - [x] Search by name / reg no
    - [x] Roll no, name, reg, marks/grade input, status badge columns
    - [x] Inline EvalInput (marks number input or grade dropdown)
    - [x] Autosave on blur/select via useUpsertGrade
    - [x] Server pagination
  - [x] Complete Valuation button (graders)
  - [x] Publish / Unpublish toggle (managers)
  - [x] Edit button (managers)
  - [x] Learner self-view (SubmissionForm) for non-graders

- [x] **App.jsx routes**
  - [x] `/app/assignments/new`
  - [x] `/app/assignments/:id/edit`

### 🗺️ Navigation

- [x] Assignments already in sidebar nav
- [x] Routes registered in App.jsx

### ✅ Quality Checks

- [x] Subject is a dropdown of subjects (onec_modules)
- [x] Classes use autocomplete multi-select (MultiSearchSelect)
- [x] Specific students mode with multi-select (no class applicable)
- [x] Server pagination on all lists
- [x] Search on list and valuation table
- [x] Status + publish filters on list
- [x] Inline autosave on valuation
- [x] Reuses DataTable, SearchSelect, PageHeader, showToast
- [ ] Skeleton loading states (DataTable built-in isLoading)
- [ ] Attachment upload (PDF, images, docs) — deferred
- [ ] AssignmentCreated success page — optional
- [ ] AGENT_LOG entry — pending
- [ ] PRD update — pending

---

## Completed Tasks

- DB migration (040_extend_assignments.sql) — status, eval_type, cohorts join, target_students join, submission grade_value
- Server controller full rewrite — all endpoints
- Server routes update
- MultiSearchSelect component
- AssignmentStatusBadge + PublishBadge
- assignmentsApi full rewrite
- useAssignments full rewrite
- AssignmentsPage full rewrite (search/filter/pagination/DataTable)
- AssignmentFormPage (new dedicated page)
- AssignmentDetailPage full rewrite (tabs, valuation, actions)
- App.jsx route additions

---

## Deferred / Future

- Attachment upload (PDF, images, docs)
- AssignmentCreated success animation page
- Activity tab (audit log for assignments)
- Bulk grade upload via CSV

---

## Notes

- Evaluation type is per-assignment (Marks or Grades), not per-student
- Specific Students mode bypasses class selection entirely
- `completeValuation` validates 100% coverage before marking completed
- Assignment status is derived / updated server-side — never set directly by client
- `learner_user_id` (onec_users.id) is the display identifier per Rule 8
- Roll number: ROW_NUMBER() OVER (ORDER BY last_name, first_name) — no DB column for roll_no

---

*Last updated: 2026-07-25*
