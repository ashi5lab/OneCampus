# UI & UX Guidelines (Rules)

This document outlines the core rules and reusable components for maintaining a consistent, premium design system across OneCampus.

## 1. Core Layouts & Views
- **Global Topbar & Sidebar:** The app uses a global Topbar and Sidebar for navigation. Page-specific headers (like titles and back buttons) should integrate into the global Topbar using the `PageHeader` component.
- **Web (Desktop) Views:** Use multi-column layouts where applicable. For complex pages like profiles, use a main content area (left) and a fixed-width sidebar (right) for quick links or secondary details.
- **Mobile Views:** Layouts must collapse into a single scrollable feed. Elements that form sidebars on desktop should stack below the main content naturally on mobile.

## 2. Reusable Components
- **PageHeader:** Always use `<PageHeader title="..." />` to push titles and actions into the global topbar. Do not render inline headers on the page body.
- **DataTable:** Use `<DataTable />` for rendering lists and tabular data. It handles empty states and responsive scrolling automatically.
- **Badge / Pills:** Use the `<Badge />` component for statuses. For interactive tabs, use pill-shaped buttons with rounded-full borders and Lucide icons.
- **Avatar:** Use the `<Avatar />` component for user profile pictures. When editing the current user's profile, use `<ProfilePictureUploader />`.
- **UserSearchSelect:** For any user selection (students, teachers, guardians, etc.), always use the `<UserSearchSelect />` autocomplete component instead of standard dropdowns. Ensure `useAllUsers()` hook is used to provide the `users` prop, and filter using the `roles` array prop. It supports toggling elements via `showUsername`, `showClass`, and `showRole` props (all default to `true`).
- **Modals and Alerts:** NEVER use native browser `window.alert` or `window.confirm`. Always use the `showToast` utility for notifications and the `<ConfirmDialog />` component for confirmation prompts.
## 3. Styling & Cards
- **Premium Cards:** Content should be grouped into cards with `bg-surface rounded-2xl shadow-sm border border-border`. For hero/banner cards (like the student profile header), use larger rounded corners (`rounded-[24px]`) and premium gradients (e.g., `bg-gradient-to-br from-[#4b43c4] to-[#3a34a8]`).
- **Typography:** Ensure high contrast. Use `text-ink-900` for primary text and headings, `text-ink-500` for secondary text, and `font-extrabold` for large statistics or primary names.
- **Interactive Elements:** Buttons and interactive cards should have transition effects (e.g., `hover:bg-surface-muted transition-colors`).
- **Icons:** Use `lucide-react` icons exclusively. Keep sizes consistent (`w-4 h-4` or `w-5 h-5` for inline text, larger for stat highlights).

## 4. Charts & Visualizations
- Avoid bulky third-party charting libraries for simple UI elements. Use custom lightweight SVG components (e.g., line charts, doughnut charts) tailored to the exact mockup design to ensure premium aesthetics and fast load times.

## 5. Agent Workflow Rules

These rules apply to every agent session working on OneCampus:

1. **Read all root MD files first** — Before starting any task, read `AGENT_LOG.md`, `OneCampus_PRD_v2.md`, `Future_Features.md`, and `Rules.md` to understand the current state of the project.
2. **Update AGENT_LOG.md** — Every session must append a new numbered entry documenting: user's exact input, files investigated, root causes, every file changed (with before/after snippets), DB operations, and expected outcomes. Never overwrite past entries.
3. **Update OneCampus_PRD_v2.md** — Any new features, changes to existing modules, or architectural decisions must be noted in the PRD.
4. **Update Future_Features.md** — Any feature requested by the user but deferred to a later session must be added here with context.
5. **Rules specified by the user** — Any explicit rule or instruction given by the user must be documented in this file (`Rules.md`).
6. **Commit and push after every significant change set** — Do not leave working changes uncommitted. Use descriptive commit messages.
7. **Never leave tasks half-finished** — If a session must end mid-task, mark the AGENT_LOG entry as `[IN PROGRESS]` and document exactly what remains.
8. **Universal identifier display** — The backend keeps its role-table IDs (`learner_id`, `instructor_id`, etc.) as-is. Do NOT attempt to migrate or rename DB columns. However, the **student profile UI must display `user_id`** (the `onec_users.id`) for quick identification and debugging — not `learner_id`. Never expose `learner_id` or other role-table IDs in the UI; only use `user_id` when an ID needs to be surfaced to users.
