require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { CLIENT_ORIGIN } = require('./config/env');
const tenantResolver = require('./middleware/tenantResolver');
const tenantDb = require('./middleware/tenantDb');
const { scheduleRefreshTokenCleanup } = require('./lib/refreshTokenCleanup');

const app = express();
const PORT = process.env.PORT || 3001;

// Global middleware
app.use(helmet());
// A specific origin (not '*') is required — the refresh-token flow sends an
// httpOnly cookie cross-origin (client :5173, server :3001 in dev), and
// browsers reject Access-Control-Allow-Origin: * on credentialed requests.
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check must not depend on tenant resolution — hosting platform
// probes won't send a tenant Host header/domain.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Platform routes (self-serve tenant registration + super admin management)
// operate on the public schema directly and must work with no tenant
// resolved yet — mounted before tenantResolver so it never runs for them.
const platformRoutes = require('./modules/platform/routes');
app.use('/api/v1/platform', platformRoutes);

// Resolve the tenant, then pin a dedicated DB connection to that tenant's schema.
// Scoped to /api/v1 only — mounting this with no path (as it originally was)
// intercepted *every* request, including the landing page and static assets
// served below, so visiting the bare production domain (which isn't itself a
// registered tenant) 404'd/500'd before Express ever reached the SPA catch-all.
app.use('/api/v1', tenantResolver);
app.use('/api/v1', tenantDb);

// Setup API routes
const tenantRoutes = require('./modules/tenant/routes');
const authRoutes = require('./modules/auth/routes');
const unitsRoutes = require('./modules/units/routes');
const cohortsRoutes = require('./modules/cohorts/routes');
const modulesRoutes = require('./modules/modules/routes');
const instructorsRoutes = require('./modules/instructors/routes');
const learnersRoutes = require('./modules/learners/routes');
const guardiansRoutes = require('./modules/guardians/routes');
const guardianLinksRoutes = require('./modules/guardianLinks/routes');
const attendanceRoutes = require('./modules/attendance/routes');
const evaluationsRoutes = require('./modules/evaluations/routes');
const certificatesRoutes = require('./modules/certificates/routes');
const kindergartenActivityRoutes = require('./modules/kindergartenActivity/routes');
const profileRoutes = require('./modules/profile/routes');
const messagesRoutes = require('./modules/messages/routes');
const noticesRoutes = require('./modules/notices/routes');
const libraryRoutes = require('./modules/library/routes');
const assignmentsRoutes = require('./modules/assignments/routes');
const onlineExamsRoutes = require('./modules/onlineExams/routes');
const reportsRoutes = require('./modules/reports/routes');
const broadcastRoutes = require('./modules/broadcast/routes');
const staffRoutes = require('./modules/staff/routes');
const accessControlRoutes = require('./modules/accessControl/routes');

app.use('/api/v1/tenant', tenantRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/units', unitsRoutes);
app.use('/api/v1/cohorts', cohortsRoutes);
app.use('/api/v1/modules', modulesRoutes);
app.use('/api/v1/instructors', instructorsRoutes);
app.use('/api/v1/learners', learnersRoutes);
app.use('/api/v1/guardians', guardiansRoutes);
app.use('/api/v1/guardian-links', guardianLinksRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/evaluations', evaluationsRoutes);
app.use('/api/v1/certificates', certificatesRoutes);
app.use('/api/v1/kindergarten-activity', kindergartenActivityRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/messages', messagesRoutes);
app.use('/api/v1/notices', noticesRoutes);
app.use('/api/v1/library', libraryRoutes);
app.use('/api/v1/assignments', assignmentsRoutes);
app.use('/api/v1/online-exams', onlineExamsRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/broadcast', broadcastRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/access-control', accessControlRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // onec_refresh_tokens only grows otherwise -- see lib/refreshTokenCleanup.js.
  scheduleRefreshTokenCleanup(24 * 60 * 60 * 1000);
});
