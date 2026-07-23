# AI Implementation Guide for OneCampus Design System

## Overview
This guide consolidates design system rules, component library standards, and page guidelines. **ALWAYS READ THIS BEFORE IMPLEMENTING ANY PAGE OR COMPONENT.**

---

## Part 1: Design System Foundations

### Vision
Clean, modern, professional school management UI inspired by Linear, Notion, Stripe Dashboard, and Material Design 3.

### Tech Stack (Required)
- React (with hooks)
- Tailwind CSS (only for styling)
- shadcn/ui (for pre-built components)
- Lucide Icons (for all iconography)
- Framer Motion (for animations)

**CRITICAL:** Never use inline styles, emotion/styled-components, or custom CSS classes if Tailwind or shadcn/ui can do it.

### Color System

All colors **MUST** use CSS variables. Never hardcode hex values in code.

#### Theme Tokens
| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--background` | `#F6F8FC` | Dark variant | Page background |
| `--surface` | `#FFFFFF` | Dark variant | Cards, containers |
| `--primary` | `#4F46E5` | `#6366F1` | Primary actions, links |
| `--primary-hover` | `#4338CA` | Lighter variant | Hover state for primary |
| `--border` | `#E5E7EB` | Dark variant | Dividers, borders |
| `--text-primary` | `#111827` | `#F3F4F6` | Main text |
| `--text-secondary` | `#374151` | `#D1D5DB` | Secondary text |
| `--muted` | `#6B7280` | `#9CA3AF` | Disabled, muted content |
| `--success` | `#16A34A` | Lighter variant | Success states |
| `--warning` | `#F59E0B` | Lighter variant | Warning states |
| `--danger` | `#DC2626` | Lighter variant | Error/danger states |
| `--info` | `#2563EB` | Lighter variant | Info states |

**Implementation:**
```css
/* In client/src/styles/theme.css */
:root {
  --background: #F6F8FC;
  --surface: #FFFFFF;
  --primary: #4F46E5;
  /* ... rest of tokens ... */
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0F172A;
    --surface: #1E293B;
    /* ... dark theme adjustments ... */
  }
}

:root[data-theme="light"] {
  /* Light theme overrides */
}

:root[data-theme="dark"] {
  /* Dark theme overrides */
}
```

### Typography

- **Font Family:** Inter (preferred, system fallback to -apple-system, BlinkMacSystemFont, etc.)
- **Spacing System:** 8px base unit (8, 16, 24, 32, 40, 48, 56, 64px)
- **Border Radius:**
  - Cards: `rounded-2xl` (16px)
  - Buttons/Inputs: `rounded-lg` (12px)
  - Small elements: `rounded-md` (8px)
  - Pill/Full: `rounded-full`

### Global Design Rules

1. **One Sidebar** - Used throughout the application for navigation
2. **One Page Header Pattern** - Consistent header/topbar across all pages
3. **One Table Component** - DataTable used everywhere (with pagination)
4. **One Card Component** - StatsCard, SummaryCard, InfoCard patterns
5. **One Button Component** - Consistent button styles across all pages
6. **Maximum 5 Summary Cards** per page (spacing/hierarchy)
7. **Skeleton Loaders** - Use for all loading states
8. **Light/Dark Theme Support** - All components must support both themes via CSS variables

---

## Part 2: Component Library Standards

### Rule: Component Reuse

**NEVER** create page-specific versions of these components:
- Buttons
- Cards (StatsCard, SummaryCard, InfoCard)
- Tables (DataTable)
- Forms (Input, Select, DatePicker, Textarea)
- Layout (Sidebar, Topbar, PageHeader, PageContainer)

**IF** a component doesn't exist, create it as reusable under `/components` and use it everywhere.

### Layout Components
```
/components/layout/
├── Sidebar.jsx          # Main navigation sidebar
├── Topbar.jsx           # Top navigation bar
├── PageHeader.jsx       # Page title + breadcrumbs
├── PageContainer.jsx    # Main page layout wrapper
└── BottomTabBar.jsx     # Mobile bottom navigation
```

### Card Components
```
/components/cards/
├── StatsCard.jsx        # Single metric card (number + trend)
├── SummaryCard.jsx      # Summary with icon/badge
└── InfoCard.jsx         # Generic info container
```

### Table Components
```
/components/tables/
├── DataTable.jsx        # Main table component with pagination
├── Pagination.jsx       # Pagination control
└── TableToolbar.jsx     # Search + filters above tables
```

### Form Components
```
/components/forms/
├── Input.jsx            # Text input
├── SearchInput.jsx      # Search input with icon
├── Select.jsx           # Dropdown select
├── DatePicker.jsx       # Date selection
└── Textarea.jsx         # Multi-line text
```

### Feedback Components
```
/components/feedback/
├── EmptyState.jsx       # No data state
├── Skeleton.jsx         # Loading placeholder
└── Toast.jsx            # Notifications
```

### Common Components
```
/components/
├── Button.jsx           # All button variants
├── Badge.jsx            # Status badges
├── Avatar.jsx           # User avatars
├── Dialog.jsx           # Modal dialogs
├── Dropdown.jsx         # Dropdown menus
├── Tabs.jsx             # Tab navigation
└── Chart*.jsx           # Chart wrappers
```

---

## Part 3: Page Layout Guidelines

### Dashboard Page
```
Header: "Good morning, [Name]" + Search + Notifications + Profile
Cards: 4-5 summary cards (Students, Teachers, Classes, Attendance %)
Sections:
  - Today's Overview (4 stat cards)
  - Today's Schedule (class list)
  - Recent Activity (feed)
  - Quick Actions (button row)
  - Calendar (mini month view)
```

### Classes Page
```
Header: "Classes" + Search + Filter icon + Join Class button
Cards: 4 summary cards (Total Classes, Total Students, Avg Attendance, Pending Tasks)
Tabs: "My Classes" | "All Classes"
View Toggle: Grid | List
Content: Class cards (responsive, no table)
```

### Class Details (Persistent Layout)
```
Header:
  - Class name + badge (Active/Inactive)
  - Metadata: Students, Teachers, Room, Subject
  - Class Settings button
  - Announcement button

Tab Navigation:
  - Overview
  - Chat
  - Members
  - Assignments
  - Exams
  - Timetable
  - Attendance
```

### Class Chat Tab
```
Header: Class name + metadata + Search
Sections:
  - Pinned Messages (collapsed/expandable)
  - Message List (scrollable)
  - Composer (rich text input)
  - Right Sidebar (desktop only, lg:):
    * Class Info
    * Members list
    * Shared Files (recent)
```

### Members Tab
```
Search input + Role filter dropdowns
DataTable with columns: Name, Roll No., Class, Role, Status, Actions
Pagination (10/20/50 rows per page)
Sticky header on scroll
```

### Assignments Tab
```
Cards: 3-4 summary cards (Total, Pending, Submitted, Graded)
DataTable: Assignment name, Subject, Due date, Status, Actions
Right panel: Upcoming assignments
```

### Exams Tab
```
Cards: 3-4 summary cards (Total, Pending, Completed, Graded)
View toggle: List | Calendar
List: DataTable with exams
Calendar: Month view with exam indicators
```

### Attendance Tab
```
Header: Class selector + Date picker
Cards: 4 summary cards (Present %, Absent %, Late %, Excused %)
DataTable: Student name, Status (dropdown), Remarks (editable)
Actions: Save All button + Export CSV button
Pagination
```

### Timetable Page
```
Header: Week view navigation (previous/next)
Calendar grid: Time slots + subjects with color coding
Legend: Subject color indicators
Subject info on hover/click
```

### Activities Page
```
Cards: Summary cards with metrics
DataTable: Activity type, time, actor, details
Right panel: Upcoming events
Filters: By type, date range
```

### Calendar Page
```
Month view
Navigation: Previous/Next month buttons
Event indicators on dates
Event list (right sidebar or below)
```

### Messages/Inbox Page
```
Left sidebar: Conversation list with avatars + unread badges
Main: Message thread
Composer: Rich text editor
```

### More Apps Page
```
Search + Pinned section
Grid layout: App cards with icons
App metadata: Name, description, quick access
```

### Profile & Settings
```
Left sidebar navigation stays fixed
Right content area changes based on selection
Profile: User info, photo, contact
Settings: Theme, notifications, privacy, etc.
```

---

## Part 4: Tailwind CSS Patterns

### Spacing
```jsx
// Use gap for layouts
<div className="flex gap-4">  // 16px gap
<div className="grid gap-6"> // 24px gap

// Use p/px/py for padding
<div className="p-4">        // 16px all sides
<div className="px-6 py-4">  // 24px horizontal, 16px vertical

// Use m/mx/my for margins (rare, prefer gap)
<div className="mb-2">       // 8px margin-bottom
```

### Typography
```jsx
// Headings
<h1 className="text-3xl font-bold text-text-primary">
<h2 className="text-2xl font-semibold text-text-primary">
<h3 className="text-xl font-semibold text-text-secondary">

// Body
<p className="text-base text-text-secondary">
<span className="text-sm text-muted">

// Emphasis
<span className="font-semibold">
<span className="font-medium">
```

### Colors (Always use CSS variables via Tailwind)
```jsx
// Text
className="text-text-primary"      // Main text
className="text-text-secondary"    // Secondary text
className="text-muted"             // Disabled/muted

// Background
className="bg-background"          // Page background
className="bg-surface"             // Card/container background

// Buttons
className="bg-primary text-white"  // Primary button
className="bg-danger text-white"   // Danger button
className="bg-success text-white"  // Success button

// Borders
className="border border-border"   // Border color
className="border-2"               // Thicker border
```

### Cards
```jsx
<div className="rounded-2xl border border-border bg-surface p-6">
  {/* Card content */}
</div>
```

### Buttons
```jsx
// Primary
<button className="rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover">

// Secondary
<button className="rounded-lg border border-border bg-surface px-4 py-2 font-semibold text-text-primary hover:bg-border">

// Danger
<button className="rounded-lg bg-danger px-4 py-2 font-semibold text-white hover:opacity-90">
```

### Tables
```jsx
<table className="w-full">
  <thead>
    <tr className="border-b border-border bg-surface-muted">
      <th className="px-5 py-3 text-left text-xs font-bold uppercase text-text-secondary">
  </thead>
  <tbody>
    <tr className="border-b border-border hover:bg-surface-muted transition-colors">
      <td className="px-5 py-3 text-text-primary">
```

### Forms
```jsx
<input className="rounded-lg border border-border bg-surface px-3 py-2 text-text-primary placeholder:text-muted focus:border-primary focus:outline-none" />

<select className="rounded-lg border border-border bg-surface px-3 py-2 text-text-primary focus:border-primary focus:outline-none">

<textarea className="rounded-lg border border-border bg-surface px-3 py-2 text-text-primary placeholder:text-muted focus:border-primary focus:outline-none" />
```

### Responsive
```jsx
// Mobile first
<div className="flex flex-col gap-4 lg:flex-row">
  {/* Column on mobile, row on lg+ */}
</div>

<div className="hidden lg:block">
  {/* Desktop only */}
</div>

<div className="lg:hidden">
  {/* Mobile only */}
</div>
```

---

## Part 5: Implementation Checklist

### Before Writing Code
- [ ] Read this entire guide
- [ ] Check if page layout already exists in PAGEGUIDELINES.md
- [ ] Identify which components to reuse
- [ ] Verify component exists in `/components`
- [ ] Plan layout structure (no inventing)
- [ ] Review mock image for exact styling

### While Writing Code
- [ ] Use only Tailwind CSS + shadcn/ui
- [ ] Use CSS variables for all colors
- [ ] Never hardcode colors or styles
- [ ] Use existing components (no duplication)
- [ ] Follow spacing system (8px base)
- [ ] Support light/dark themes
- [ ] Add proper loading states (Skeleton)
- [ ] Add empty states (EmptyState)
- [ ] Test on mobile and desktop

### After Writing Code
- [ ] Compare with mock images
- [ ] Verify theme switching works
- [ ] Check responsive layout
- [ ] Verify component consistency
- [ ] Run Prettier/linting
- [ ] Test pagination (if table)
- [ ] Test search/filters (if present)

---

## Part 6: Common Mistakes to Avoid

### ❌ DON'T
```jsx
// Hardcoded colors
className="bg-[#4F46E5] text-[#111827]"

// Custom CSS for existing component
const CustomButton = styled.button`
  background: #4F46E5;
`

// Page-specific card styling
className="bg-blue-500 p-8 rounded-3xl"

// Inline styles
<div style={{backgroundColor: '#fff', padding: '20px'}}>

// Duplicate component logic
// (created different table for different page)

// Invented layout pattern
// (header on left, content on right)
```

### ✅ DO
```jsx
// CSS variables via Tailwind
className="bg-primary text-text-primary"

// Reuse existing Button component
import { Button } from '@/components/Button'

// Use StatsCard component
import { StatsCard } from '@/components/cards/StatsCard'

// Use DataTable component
import { DataTable } from '@/components/tables/DataTable'

// Reuse layout components
import { PageHeader, PageContainer } from '@/components/layout'

// Follow established patterns
// (sidebar nav, topbar, page layout)
```

---

## Part 7: File Organization

```
client/
├── src/
│   ├── styles/
│   │   └── theme.css              # Color tokens + theme definitions
│   ├── components/
│   │   ├── Button.jsx             # Reusable button
│   │   ├── Badge.jsx              # Reusable badge
│   │   ├── Avatar.jsx             # User avatars
│   │   ├── Dialog.jsx             # Modal dialogs
│   │   ├── Dropdown.jsx           # Dropdown menus
│   │   ├── Tabs.jsx               # Tab navigation
│   │   │
│   │   ├── cards/
│   │   │   ├── StatsCard.jsx      # Single metric + trend
│   │   │   ├── SummaryCard.jsx    # Summary with icon
│   │   │   └── InfoCard.jsx       # Generic info
│   │   │
│   │   ├── tables/
│   │   │   ├── DataTable.jsx      # Main table
│   │   │   ├── Pagination.jsx     # Pagination control
│   │   │   └── TableToolbar.jsx   # Search + filters
│   │   │
│   │   ├── forms/
│   │   │   ├── Input.jsx          # Text input
│   │   │   ├── SearchInput.jsx    # Search with icon
│   │   │   ├── Select.jsx         # Dropdown
│   │   │   ├── DatePicker.jsx     # Date selection
│   │   │   └── Textarea.jsx       # Multi-line
│   │   │
│   │   ├── feedback/
│   │   │   ├── EmptyState.jsx     # No data state
│   │   │   ├── Skeleton.jsx       # Loading
│   │   │   └── Toast.jsx          # Notifications
│   │   │
│   │   └── layout/
│   │       ├── Sidebar.jsx        # Main nav
│   │       ├── Topbar.jsx         # Top bar
│   │       ├── PageHeader.jsx     # Page title
│   │       ├── PageContainer.jsx  # Page wrapper
│   │       └── BottomTabBar.jsx   # Mobile nav
│   │
│   └── features/
│       ├── dashboard/             # Dashboard pages
│       ├── classes/               # Classes pages
│       ├── attendance/            # Attendance pages
│       └── ...
```

---

## Part 8: Quick Reference

### Color Variables
```css
--background      /* Page bg */
--surface         /* Card/container bg */
--primary         /* Main action color */
--primary-hover   /* Primary hover state */
--border          /* Dividers/borders */
--text-primary    /* Main text */
--text-secondary  /* Secondary text */
--muted           /* Disabled/muted */
--success         /* Success state */
--warning         /* Warning state */
--danger          /* Error/danger state */
--info            /* Info state */
```

### Spacing Scale
```
space-xs:  4px   (gap-1)
space-sm:  8px   (gap-2)
space-md:  16px  (gap-4)
space-lg:  24px  (gap-6)
space-xl:  32px  (gap-8)
space-2xl: 40px  (gap-10)
```

### Border Radius
```
rounded-sm:   4px   (small buttons)
rounded-md:   8px   (input fields)
rounded-lg:   12px  (buttons, inputs)
rounded-2xl:  16px  (cards)
rounded-full: 9999px (pills, avatars)
```

### Component Imports (Template)
```jsx
import { Button } from '@/components/Button'
import { StatsCard, SummaryCard } from '@/components/cards'
import { DataTable, Pagination } from '@/components/tables'
import { Input, Select, DatePicker } from '@/components/forms'
import { PageHeader, PageContainer } from '@/components/layout'
import { EmptyState, Skeleton } from '@/components/feedback'
import { Badge, Avatar, Tabs } from '@/components'
```

---

## Summary

**ALWAYS:**
1. Read this guide first
2. Use existing components
3. Use Tailwind CSS + CSS variables only
4. Follow layout patterns from PAGEGUIDELINES.md
5. Support light/dark themes
6. Test on mobile and desktop
7. Compare with mock images before finishing

**NEVER:**
1. Hardcode colors
2. Create custom CSS when Tailwind exists
3. Duplicate components
4. Invent new layouts
5. Use inline styles
6. Skip loading/empty states

---

*Last Updated: 2026-07-23*
*Based on Design System, Component Library, and Page Guidelines*
