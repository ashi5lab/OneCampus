// The Home tab's insight cards a learner/instructor/staff user can
// individually show/hide from Settings — see onec_users.home_card_prefs
// (migration 033) and server/modules/profile's home-card-prefs endpoints.
// Shared between the profile controller (validates PATCH keys) and
// anything else that needs the canonical list.
const HOME_CARD_KEYS = ['attendance', 'academic', 'notices', 'messages', 'activities', 'pending'];

module.exports = { HOME_CARD_KEYS };
