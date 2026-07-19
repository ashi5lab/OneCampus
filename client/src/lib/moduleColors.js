// Per-module accent colors for the small square icon badges used on the
// Dashboard's "Your Modules" grid and the More directory (see
// components/ModuleBadge.jsx) — a curated rotation of tint/ink pairs
// (light background + a readable darker foreground of the same hue),
// assigned per NAV_LINK_DEFS key so the same module always gets the same
// color everywhere it appears.
const PALETTE = [
  { bg: '#EAE9FF', fg: '#4F46E5' }, // indigo
  { bg: '#E0F5F5', fg: '#0F766E' }, // teal
  { bg: '#DFF5E7', fg: '#15803D' }, // emerald
  { bg: '#FCE7E8', fg: '#B91C1C' }, // rose
  { bg: '#FDF0D5', fg: '#92400E' }, // amber
  { bg: '#FBE7F6', fg: '#A21CAF' }, // fuchsia
  { bg: '#E0EEFB', fg: '#1D4ED8' }, // sky
  { bg: '#FDEAD9', fg: '#C2410C' } // orange
];

// Explicit assignments for the modules shown in the redesign mock, so they
// match exactly; any key not listed here (the long tail of "More"-only
// features) gets a deterministic color from the same palette instead of a
// hand-picked one.
const EXPLICIT = {
  learners: 0,
  instructors: 1,
  cohorts: 2,
  attendance: 0,
  broadcast: 1,
  calendar: 3,
  reports: 0,
  'access-control': 1,
  units: 4,
  modules: 3,
  guardians: 5,
  exams: 3,
  certificates: 2,
  'kindergarten-activity': 4,
  notices: 4,
  library: 3,
  assignments: 5,
  messages: 6,
  leave: 6,
  timetable: 1,
  'bulk-upload': 5,
  'staff-attendance': 6,
  discipline: 3,
  ptm: 7,
  alumni: 5,
  visitors: 7
};

function hashKey(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return hash % PALETTE.length;
}

export function colorForModule(key) {
  const index = key in EXPLICIT ? EXPLICIT[key] : hashKey(key);
  return PALETTE[index];
}
