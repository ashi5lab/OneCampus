require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const tenantResolver = require('./middleware/tenantResolver');
const tenantDb = require('./middleware/tenantDb');

const app = express();
const PORT = process.env.PORT || 3001;

// Global middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check must not depend on tenant resolution — hosting platform
// probes won't send a tenant Host header/domain.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Resolve the tenant, then pin a dedicated DB connection to that tenant's schema
app.use(tenantResolver);
app.use(tenantDb);

// Setup API routes
const authRoutes = require('./modules/auth/routes');
const unitsRoutes = require('./modules/units/routes');
const cohortsRoutes = require('./modules/cohorts/routes');
const modulesRoutes = require('./modules/modules/routes');
const instructorsRoutes = require('./modules/instructors/routes');
const learnersRoutes = require('./modules/learners/routes');
const guardiansRoutes = require('./modules/guardians/routes');
const attendanceRoutes = require('./modules/attendance/routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/units', unitsRoutes);
app.use('/api/v1/cohorts', cohortsRoutes);
app.use('/api/v1/modules', modulesRoutes);
app.use('/api/v1/instructors', instructorsRoutes);
app.use('/api/v1/learners', learnersRoutes);
app.use('/api/v1/guardians', guardiansRoutes);
app.use('/api/v1/attendance', attendanceRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
