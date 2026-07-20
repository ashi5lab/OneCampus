// The Home tab's insight cards, per role — same six boolean keys as
// server/lib/homeCardPrefs.js's HOME_CARD_KEYS (onec_users.home_card_prefs
// only ever stores these), but a role-specific label/description since e.g.
// the 'attendance' slot means "your attendance %" for a learner and "my
// classes" for an instructor. Both HomeInsightsPage (what to render, in
// what order) and the Settings toggle list read from here so they can never
// drift out of sync with each other.
const LEARNER_CARDS = [
  { key: 'attendance', label: 'Attendance', description: 'Your attendance percentage' },
  { key: 'academic', label: 'Academic scores', description: 'Recent test performance' },
  { key: 'notices', label: 'Notices', description: 'School & class notices' },
  { key: 'messages', label: 'Messages', description: 'Latest unread message' },
  { key: 'activities', label: 'Activities', description: 'Recent class activity' },
  { key: 'pending', label: 'Needs your attention', description: 'Actions pending from you' }
];

const INSTRUCTOR_CARDS = [
  { key: 'attendance', label: 'My classes', description: 'Classes you teach or advise' },
  { key: 'academic', label: 'This week', description: 'Attendance marked & scores graded' },
  { key: 'notices', label: 'Notices', description: 'School & class notices' },
  { key: 'messages', label: 'Messages', description: 'Latest unread message' },
  { key: 'activities', label: 'Activities', description: 'Recent activity in your classes' },
  { key: 'pending', label: 'Needs your attention', description: 'Grading & approvals pending' }
];

const STAFF_CARDS = [
  { key: 'attendance', label: 'This week', description: 'Notices posted & messages sent' },
  { key: 'notices', label: 'Notices', description: 'School notices' },
  { key: 'messages', label: 'Messages', description: 'Latest unread message' },
  { key: 'activities', label: 'Activities', description: 'Recent activity' },
  { key: 'pending', label: 'Needs your attention', description: 'Approvals pending' }
];

export function getHomeCardsForRole(role) {
  if (role === 'instructor') return INSTRUCTOR_CARDS;
  if (role === 'staff') return STAFF_CARDS;
  return LEARNER_CARDS;
}

// A card shows unless its key is explicitly set to false — matches the
// backend's "missing/null prefs means show everything" default.
export function isCardVisible(prefs, key) {
  return prefs?.[key] !== false;
}
