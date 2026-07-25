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

## 3. Styling & Cards
- **Premium Cards:** Content should be grouped into cards with `bg-surface rounded-2xl shadow-sm border border-border`. For hero/banner cards (like the student profile header), use larger rounded corners (`rounded-[24px]`) and premium gradients (e.g., `bg-gradient-to-br from-[#4b43c4] to-[#3a34a8]`).
- **Typography:** Ensure high contrast. Use `text-ink-900` for primary text and headings, `text-ink-500` for secondary text, and `font-extrabold` for large statistics or primary names.
- **Interactive Elements:** Buttons and interactive cards should have transition effects (e.g., `hover:bg-surface-muted transition-colors`).
- **Icons:** Use `lucide-react` icons exclusively. Keep sizes consistent (`w-4 h-4` or `w-5 h-5` for inline text, larger for stat highlights).

## 4. Charts & Visualizations
- Avoid bulky third-party charting libraries for simple UI elements. Use custom lightweight SVG components (e.g., line charts, doughnut charts) tailored to the exact mockup design to ensure premium aesthetics and fast load times.
