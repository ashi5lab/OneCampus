# Future Features & Enhancements

This document tracks features that have been ideated or partially designed but are currently deferred for future implementation.

## Student Profile
- **Term-based Data Filtering:** A dropdown in the student profile header banner (e.g., "This Term", "Previous Term") to filter the Academic Performance, Attendance, and Behavior statistics based on the selected academic term.
- **Extended Contact Information:** Add specific form fields and database columns to capture separate contact numbers:
  - Student Phone Number
  - Student WhatsApp Number
  - Parent/Guardian Phone Number
  - Parent/Guardian WhatsApp Number
- **Global Notifications:** Implement a global reusable `Toast` component for all success and failure notifications (replacing native `alert`).

## Discipline & Behavior
- **Behavior Point Mechanics:** Add more diverse point scenarios, including mechanisms for students to proactively increase their score (e.g., consistent attendance streaks, exceptional academic performance, extracurricular participation).
- **Custom Badge System:** Add functionality to allow teachers/admins to create and award custom visual badges to students' profiles for specific achievements or behavior milestones.

## UI Reusability — remaining Card component migration
Deferred from the flat-list/Card reusability initiative (AGENT_LOG Entry 027) — the visible bug (boxed list rows on mobile) is fixed and the primitives exist; these are the remaining hand-rolled `bg-surface rounded-2xl shadow-sm border border-border` card usages not yet swapped to `<Card />`, left as-is because they already use correct theme tokens (not visually broken, just not componentized):
- **`client/src/features/learners/components/LearnerProfilePage.jsx`** — 11 occurrences (Academic Performance, Attendance Overview, Behavior Summary, academic tab sections, sidebar cards, etc.)
- **`client/src/features/instructors/components/InstructorProfilePage.jsx`** — 8 occurrences (same shape, teacher-side profile)
- **`client/src/features/more/components/MorePage.jsx`** — 3 clickable nav cards, currently `<Link className="...">`. Needs `<Card />` extended with an `as`/`to` prop (Link polymorphism) before these can adopt it — `Card` is currently a plain `<div>`.
