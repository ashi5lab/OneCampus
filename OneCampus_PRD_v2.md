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

#### Student Portfolio
Create a unified Student Portfolio page. This page acts as the student's complete academic history throughout their time in school. The profile should contain:
- Student information
- Admission number
- Parent & Guardian information & Phone number of guardian (mandatory) and student (optional)
- Address
- Academic information
- Class history
- Roll number
- Photo
- Contact details
- Emergency contact
- Optional: Medical information, Transport information
The profile should support printing and exporting (PDF/PPT).

#### Student Dashboard & Layout
Every student profile opens into a dashboard displaying an overview instead of raw records. The layout is designed to be highly responsive and modern:
- **Header Banner:** A premium purple theme banner integrating the avatar, contact buttons (Call/WhatsApp), and core stats (Attendance, CGPA, Rank, Behavior Score).
- **Web Layout:** Two-column grid with a main tabbed content area on the left and a fixed sidebar on the right containing parent/guardian details, academic details, and quick links.
- **Mobile Layout:** Single-column scrollable feed where sidebar cards gracefully stack below the main content.
- **Interactive Tabs:** Pill-shaped navigation for Overview, Academics, Attendance, and Behavior sections.
The dashboard gives a quick understanding of the student's overall progress.

#### Academic Performance
Create a dedicated Academic Performance section that consolidates information from every examination and assignment. Features:
- Subject‑wise performance
- Term‑wise performance
- Monthly performance
- Yearly performance
- Overall average
- Highest marks
- Lowest marks
- Rank (if enabled)
- Teacher remarks
Support grading systems: Marks, Percentage, GPA, Letter Grade.

#### Academic Analytics
Provide visual analytics for academic performance. Include charts such as:
- Subject comparison
- Marks trend
- Grade trend
- Performance over time
- Subject strengths
- Subject weaknesses
- Top performing subjects
- Subjects requiring attention
Analytics should update automatically when marks are published.

#### Attendance Analytics
Attendance should include much more than daily records. Display:
- Overall attendance percentage
- Monthly attendance
- Weekly attendance
- Yearly attendance
- Present vs Absent
- Late arrivals
- Half‑day records
- Leave records
- Attendance streak
- Consecutive absences
Visualizations:
- Monthly heatmap
- Line chart
- Calendar view
- Attendance trend
Generate alerts for:
- Low attendance
- Consecutive absences
- Falling attendance trend

#### Assignment Analytics
Assignments should include:
- Total assignments
- Submitted
- Pending
- Late submissions
- Average score
- Subject‑wise assignment score
- Submission trend
- Teacher feedback
Visual analytics:
- Completion rate
- Monthly submission graph
- Subject comparison

#### Examination Analytics
Provide examination insights. Display:
- Total exams
- Average score
- Highest score
- Subject‑wise averages
- Term comparison
- Year comparison
Visualizations:
- Bar charts
- Line charts
- Radar chart
- Subject comparison

#### Behaviour & Discipline
Create a Behaviour section. Track:
- Positive records
- Negative records
- Achievements
- Warnings
- Teacher remarks
- Counselling sessions
- Rewards
- Recognitions
- Behaviour score
- Discipline score
Each record should include:
- Date
- Teacher
- Category
- Comment
- Action taken
- Follow‑up status
Support attachments where applicable.

#### Student Timeline
Provide a chronological timeline. The timeline should automatically aggregate activities such as:
- Attendance marked
- Exam completed
- Assignment submitted
- Notice received
- Behaviour record
- Discipline entry
- Award received
- PTM attended
- Leave applied
This should provide a complete student history.

#### Progress Card
Generate printable progress card (configured per tenant in app settings). Include:
- School branding
- Student details
- Exam scores
- Subject grades
- Attendance summary
- Behaviour summary
- Teacher remarks
- Principal remarks
- Promotion status
- Signature placeholders
Support PDF export.

#### Report Generation
Allow reports to be generated for:
- Individual student
- Entire class
- Entire grade
- Whole school
Reports should support PDF, Excel, CSV.

#### Role‑Based Views
**Parent View** – read‑only access to:
- Student dashboard
- Attendance analytics
- Academic analytics
- Assignments
- Exam results
- Behaviour & discipline records
- Teacher remarks
- School notices
- Calendar

**Student View** – read‑only access to:
- Their own portfolio
- Academic progress
- Attendance
- Assignments
- Exam results
- Behaviour & discipline records
- Achievements
- Upcoming events
- Teacher remarks

**Teacher View** – permissions to:
- View every student's portfolio
- Add behaviour records
- Add discipline entries
- Publish marks & grades
- View analytics
- Generate reports
- Print progress cards


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
