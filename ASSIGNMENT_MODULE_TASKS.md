# Assignment Module — Implementation Tracker

Branch: `feature/assignment-module`
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

- [ ] Migration: `onec_assignments` table
- [ ] Migration: `onec_assignment_classes` join table (assignment ↔ cohorts)
- [ ] Migration: `onec_assignment_students` join table (assignment ↔ specific students override)
- [ ] Migration: `onec_assignment_submissions` table (per-student marks/grades/remarks/status)
- [ ] Migration: `onec_assignment_attachments` table

### 🔧 Server — Core

- [ ] `server/modules/assignments/controller.js`
  - [ ] `getAll()` — list with search, filter (class, status, date range), pagination
  - [ ] `getOne()` — single assignment with classes, attachments
  - [ ] `create()` — create draft or active assignment
  - [ ] `update()` — edit assignment fields
  - [ ] `duplicate()` — clone an assignment
  - [ ] `remove()` — delete (draft only, or admin)
  - [ ] `publish()` / `unpublish()` — toggle publish status
  - [ ] `completeValuation()` — validate all students graded, mark completed + published
- [ ] `server/modules/assignments/submissions.js`
  - [ ] `getSubmissions()` — list students with their submission row for a given assignment + class
  - [ ] `upsertSubmission()` — save/update mark or grade + remarks for one student
  - [ ] `bulkUpsertSubmissions()` — save all at once
- [ ] `server/modules/assignments/routes.js`
- [ ] Register module in `server/index.js`
- [ ] Add permissions to permission system

### 🖥️ Client — Services & Hooks

- [ ] `client/src/features/assignments/services/assignmentApi.js`
- [ ] `client/src/features/assignments/hooks/useAssignments.js`
  - [ ] `useAssignments(filters)` — paginated list
  - [ ] `useAssignment(id)` — single record
  - [ ] `useCreateAssignment()` — mutation
  - [ ] `useUpdateAssignment()` — mutation
  - [ ] `useDuplicateAssignment()` — mutation
  - [ ] `useDeleteAssignment()` — mutation
  - [ ] `usePublishAssignment()` — mutation
  - [ ] `useCompleteValuation()` — mutation
- [ ] `client/src/features/assignments/hooks/useSubmissions.js`
  - [ ] `useSubmissions(assignmentId, cohortId)` — paginated student list
  - [ ] `useSaveSubmission()` — mutation
  - [ ] `useBulkSaveSubmissions()` — mutation

### 🖥️ Client — Pages & Components

- [ ] **AssignmentListPage** (`/app/assignments`)
  - [ ] Search bar (title, class, subject, teacher)
  - [ ] Filter: Class (autocomplete)
  - [ ] Filter: Date range
  - [ ] Filter: Status chip row
  - [ ] DataTable with all columns
  - [ ] Row actions: View, Edit, Duplicate, Delete
  - [ ] Pagination
  - [ ] Skeleton loading
  - [ ] Empty state
  - [ ] Responsive: card layout on mobile

- [ ] **AssignmentFormPage** (`/app/assignments/new`, `/app/assignments/:id/edit`)
  - [ ] Assignment title field
  - [ ] Description (optional)
  - [ ] Subject field
  - [ ] Target: Single Class / Multiple Classes / Specific Students
    - [ ] Single Class — autocomplete class picker
    - [ ] Multiple Classes — autocomplete multi-select class picker
    - [ ] Specific Students — multi-select student search (no class filter)
  - [ ] Created By — auto-filled, read-only
  - [ ] Due Date — date picker
  - [ ] Evaluation Type dropdown (Marks / Grades)
    - [ ] Marks: Max Marks + Pass Marks fields
    - [ ] Grades: Pass Grade dropdown
  - [ ] Instructions (optional textarea)
  - [ ] Attachment upload (PDF, images, docs)
  - [ ] Save as Draft / Create Assignment / Cancel actions
  - [ ] Edit mode pre-fill

- [ ] **AssignmentDetailPage** (`/app/assignments/:id`)
  - [ ] Assignment summary card (title, subject, classes, due date, created by, status badges)
  - [ ] Tabs: Overview | Students | Activity
  - [ ] Class selector (multi-class assignments)
  - [ ] Student valuation table
    - [ ] Search by name / reg no / roll no
    - [ ] Avatar + name + reg + roll columns
    - [ ] Marks input or Grade dropdown per student
    - [ ] Remarks input per student
    - [ ] Status badge (Pending / Graded)
    - [ ] Pagination
    - [ ] Autosave indicator
    - [ ] Unsaved changes warning on navigation
  - [ ] Save Progress button
  - [ ] Complete Valuation button (when all students graded)
  - [ ] Publish / Unpublish toggle
  - [ ] Confirmation dialog before publishing

- [ ] **AssignmentCreatedPage** (success state after create)
  - [ ] Checkmark animation
  - [ ] "View Assignment" and "Go to Assignments" buttons

- [ ] **Reusable sub-components**
  - [ ] `AssignmentStatusBadge` — Draft / Created / Grading In Progress / Completed
  - [ ] `PublishBadge` — Published / Unpublished
  - [ ] `EvaluationInput` — marks or grade dropdown depending on assignment type
  - [ ] `ValuationTable` — student rows with inline editing

### 🗺️ Navigation

- [ ] Add Assignments to sidebar nav (More Apps or direct)
- [ ] Register routes in `client/src/App.jsx`

### ✅ Quality Checks

- [ ] Matches PRD
- [ ] Matches UI mockups
- [ ] Uses standard OneCampus Topbar
- [ ] Responsive + mobile-friendly (iPhone SE)
- [ ] Pagination on all lists
- [ ] Search on all lists
- [ ] Filters working
- [ ] Skeleton loading states
- [ ] Empty states
- [ ] Success/error toasts (react-hot-toast)
- [ ] No duplicated UI patterns
- [ ] Reuses existing components (DataTable, UserSearchSelect, etc.)
- [ ] AGENT_LOG entry added

---

## Completed Tasks

*(nothing yet — implementation starting)*

---

## Notes

- Evaluation type is per-assignment (Marks or Grades), not per-student
- Specific Students mode bypasses class selection entirely
- `completeValuation` validates 100% coverage before marking completed
- Attachments stored via existing R2/S3 upload pattern
- Assignment status is derived / updated server-side — never set directly by client
- `learner_user_id` (onec_users.id) is the display identifier per Rule 8

---

*Last updated: 2026-07-25*
