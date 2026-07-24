# Product Requirements Document (PRD)

## OneCampus – Modern School Management Platform
### Version 2.0 (UI/UX Redesign & Product Architecture)

## Vision
OneCampus aims to become the simplest and most enjoyable school management platform with a WhatsApp-like user experience while providing complete academic and administrative capabilities.

## Product Goals
- Extremely simple UI
- Mobile-first experience
- Beautiful modern interface
- Modular architecture
- Feature toggle support
- Permission-based system

## Users
- Student
- Parent / Guardian
- Teacher
- Staff
- Principal
- Vice Principal
- Executive Admin
- Admin

## Core Modules
- Dashboard
- Attendance
- Student Profile
- Exams
- Assignments
- Notices
- Calendar
- Timetable
- Messages
- Activities
- More Apps

Advanced:
- Discipline
- Broadcast
- SMS
- WhatsApp
- Parent Connect
- Analytics
- Reports

## Navigation
Sidebar:
- Dashboard
- Classes
- Activities
- Messages
- Calendar
- More Apps

## Attendance
- Daily attendance
- Search
- Filters
- Pagination
- Analytics
- Export

## Student Profile
Complete portfolio including attendance, exams, assignments, discipline, documents, guardian information and analytics.

### Student Portfolio Enhancements
- Attendance insights and analytics.
- Academic performance reports and progress cards.
- Charts and graphs visualizing student performance.
- Export options for all reports and documents (PDF, PPT, C
SV).
- Full detailed student portfolio (PDF/PPT) with slides covering performance, attendance, behaviours, etc.


## Exams
Create, grade, publish and analyze results.

## Assignments
Submission, grading, remarks and publishing.

## Discipline
Positive, Negative and Neutral records with comments and action taken.

## Broadcast
Unified interface for SMS and WhatsApp using configurable providers (Twilio etc.).

## Calendar
Unified calendar containing school events, exams, assignments, attendance and reminders.

## Timetable
Supports class timetable, teacher timetable, conflict detection and override confirmation.

## UX Principles
Every page should support:
- Search
- Filters
- Pagination
- Bulk actions
- Empty states
- Skeleton loading
- Responsive layout

## Implementation Phases

### Phase 1
Design System, Theme Engine, Authentication, Roles & Permissions, Feature Toggles.

### Phase 2
Dashboard, Attendance, Student Profile, Exams, Assignments, Calendar, Notices, Timetable.

### Phase 3
Messaging, Broadcast, WhatsApp, Parent Connect.

### Phase 4
Analytics, Reports and AI features.

## Recommended Stack
Frontend:
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Table
- React Query

Backend:
- Laravel
- PostgreSQL
- Redis

Notifications:
- Firebase
- Twilio

## Final Goal
Deliver a premium, modern, education-focused platform that feels as intuitive as WhatsApp while remaining scalable for schools of any size.
