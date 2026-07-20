import { NAV_LINK_DEFS } from './sidebarLinks';

// Routes that don't have a NAV_LINK_DEFS entry (fixed nav items, or a
// sub-feature whose route prefix differs from its module's dashboard-app
// link) — checked before falling back to NAV_LINK_DEFS below.
const EXTRA_TITLES = [
  { prefix: '/app/manage-dashboard-apps', label: () => 'Manage Dashboard Apps' },
  { prefix: '/app/profile', label: () => 'Settings' },
  { prefix: '/app/more', label: () => 'More' },
  // Both route under the "Exams" nav item (NAV_LINK_DEFS's `to` is
  // /app/exams, which doesn't prefix-match either of these).
  { prefix: '/app/evaluations', label: () => 'Exams' },
  { prefix: '/app/online-exams', label: () => 'Exams' }
];

function matchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// The mobile header's page title — mirrors whichever nav item the current
// route belongs to (e.g. a student's profile at /app/learners/42 still
// reads "Students", not the student's name) rather than a per-page custom
// string, so it never drifts out of sync with the sidebar/bottom-tab labels.
export function getPageTitle(pathname, t) {
  if (pathname === '/app') return 'Dashboard';

  const extra = EXTRA_TITLES.find((entry) => matchesPrefix(pathname, entry.prefix));
  if (extra) return extra.label(t);

  const navDef = NAV_LINK_DEFS.find((def) => matchesPrefix(pathname, def.to));
  if (navDef) return navDef.label(t);

  return 'OneCampus';
}
