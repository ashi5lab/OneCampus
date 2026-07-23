# Q School UI Design System
Version: 1.0

This document defines the global UI rules for the Q School application.

These rules MUST be followed for every new page, feature, dialog, modal and component.

The objective is to create a modern SaaS application similar in quality to Linear, Stripe Dashboard, Notion, Google Classroom and Material Design 3.

---

# Primary Goals

The application should feel

- Clean
- Bright
- Professional
- Spacious
- Consistent
- Fast
- Accessible
- Mobile Friendly

Never create different UI styles for different pages.

Everything must come from reusable components.

---

# Tech Stack

Preferred

- React
- Tailwind CSS
- shadcn/ui
- Lucide Icons
- Framer Motion
- React Table

Avoid Bootstrap styling.

---

# Layout

Desktop

Sidebar
Width: 240px

Content

max-width: 1600px

padding

32px

Never allow content to touch browser edges.

Always use whitespace.

---

# Spacing System

Only use

4
8
12
16
20
24
32
40
48
64

Never invent spacing.

Everything should follow 8px grid.

---

# Border Radius

Buttons
12px

Inputs
12px

Cards
16px

Dialogs
20px

Badges
999px

Never mix different radius values.

---

# Shadows

Only use soft shadows.

Example

shadow-sm

or

0 8px 24px rgba(15,23,42,.05)

Avoid heavy shadows.

---

# Colors

Background

#F6F8FC

Surface

#FFFFFF

Primary

#4F46E5

Hover

#4338CA

Border

#E5E7EB

Heading

#111827

Body

#374151

Muted

#6B7280

Success

#16A34A

Warning

#F59E0B

Danger

#DC2626

Info

#2563EB

Never hardcode colors.

Use CSS variables.

---

# Typography

Font

Inter

or

Geist

Heading

700

Body

500

Muted

400

Never use more than three font weights.

---

# Buttons

Primary

Filled

Secondary

Outlined

Ghost

Danger

Icon

Loading

Disabled

Every button should come from one Button component.

Never manually style buttons.

---

# Cards

Every card uses

White background

16 radius

1px border

Soft shadow

24 padding

Optional top accent

Every statistics card

Icon

Value

Label

Trend

Optional action

Never create custom cards.

Reuse Card component.

---

# Tables

Every table MUST reuse the same Table component.

Features

Sticky header

Hover rows

Pagination

Sorting

Filtering

Search

Empty state

Loading state

Responsive

No page should build a custom table.

---

# Table Row

Avatar

Title

Subtitle

Status

Actions

Hover

Never display dense text.

---

# Forms

Each form uses

Section Card

Title

Description

Inputs

Actions

Never place controls randomly.

---

# Inputs

One Input component.

One Select component.

One Date Picker.

One Search component.

One Textarea.

One Checkbox.

One Radio.

Never style individually.

---

# Search

Every list page has

Search

Filters

Optional Export

Optional Create button

Header layout

---------------------------------------------------

Title

Description

Search

Buttons

---------------------------------------------------

---

# Empty State

Every page needs

Illustration

Title

Description

Primary action

Never leave blank screens.

---

# Loading State

Use Skeletons.

Never use spinner for full pages.

---

# Badges

Status

Present

Green

Absent

Red

Pending

Orange

Draft

Gray

Published

Blue

Never use random badge colors.

---

# Sidebar

Floating

Logo

Navigation

Collapse support

Active indicator

Notification badge

User profile bottom

Never redesign sidebar on each page.

---

# Header

Page title

Breadcrumb

Search

Notifications

Profile

Actions

Consistent everywhere.

---

# Statistics Cards

Maximum

5 cards

Example

Present

Absent

Late

Leave

Students

Always equal height.

---

# Charts

Only use

Bar

Line

Pie

Area

No 3D charts.

---

# Attendance Screen

Layout

Header

Filters

Summary Cards

Attendance Table

Pagination

Actions

Rules

Never use full-page scrolling.

Table scrolls instead.

Use pagination.

10–20 students per page.

Status dropdown

Present

Absent

Late

Leave

Remarks field only appears when needed.

---

# Chat

No left conversations list.

Class is already selected.

Layout

Header

Messages

Input

Optional collapsible right panel.

---

# Activities

Timeline cards

Grouped by

Today

Yesterday

This Week

Earlier

Each activity has

Icon

Title

Subtitle

Time

Quick action

Never use plain list.

---

# Assignments

Card summary

Table

Status

Submission count

Due date

Quick actions

---

# Exams

Summary cards

Upcoming

Completed

Draft

Table

Charts

Quick actions

---

# Members

Avatar

Name

Role

Roll number

Status

Actions

Filters

Search

---

# More Apps

Grid cards

Search

Pinned

Categories

Recently Used

---

# Dialogs

One Modal component.

20 radius

Header

Body

Footer

Buttons

Never create custom popups.

---

# Icons

Only Lucide.

Never mix icon libraries.

---

# Animations

Very subtle.

Hover

150ms

Dropdown

200ms

Modal

250ms

Never use large animations.

---

# Reusability Rules

Everything MUST come from reusable components.

Never duplicate code.

Never duplicate CSS.

If similar UI exists

reuse it.

Examples

Attendance table

Member table

Assignment table

Exam table

must use

<DataTable />

Statistics

must use

<StatsCard />

Filters

must use

<FilterBar />

Search

must use

<SearchInput />

Page header

must use

<PageHeader />

Buttons

must use

<Button />

Dialog

must use

<Dialog />

Cards

must use

<Card />

Status

must use

<StatusBadge />

Pagination

must use

<Pagination />

Empty page

must use

<EmptyState />

Loading

must use

<Skeleton />

Never recreate these components.

---

# Theme Support

Entire application must support

Blue

Purple

Green

Orange

School Theme

Dark

Only CSS variables should change.

Never hardcode colors.

---

# AI Implementation Rules

Whenever implementing a new page

1. Check if a reusable component already exists.

2. If yes

reuse it.

3. If not

create a reusable component.

4. Never create page-specific CSS.

5. Never duplicate Tailwind classes.

6. Keep files small.

7. Prefer composition over duplication.

8. Every page should look like it belongs to the same application.

---

# Final Principle

If a screenshot of two pages is placed side-by-side,

the user should immediately recognize they belong to the same product.

Consistency is more important than creativity.