const db = require('../config/db');
const { sendAbsenteeDigest } = require('./absenteeDigest');

const CHECK_INTERVAL_MS = 60 * 1000;
// Same allow-list as middleware/tenantDb.js — schema_name is our own
// system-generated value (never user input at this point), but the
// defense-in-depth check is cheap and keeps both call sites consistent.
const SCHEMA_NAME_RE = /^[a-zA-Z0-9_]+$/;

function todayIso(now) {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function currentHHMM(now) {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// Runs once per tenant per minute-tick. Compares against server-local
// time — every tenant on this deployment shares one server clock, so
// there's no per-tenant timezone concept yet (same simplification as
// every other date-only field in this app; a tenant on a very different
// timezone just needs to account for the offset when picking a time).
async function checkAndFireForTenant(pool, schemaName) {
  if (!SCHEMA_NAME_RE.test(schemaName)) return;

  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${schemaName}"`);

    const configResult = await client.query(
      `SELECT absentee_mode, absentee_schedule_time::text AS absentee_schedule_time, absentee_schedule_day,
              absentee_last_sent_date::text AS absentee_last_sent_date, updated_by
       FROM onec_broadcast_configs WHERE channel = 'whatsapp_absentee' AND is_active = true`
    );
    const config = configResult.rows[0];
    if (!config || !['daily', 'weekly'].includes(config.absentee_mode) || !config.absentee_schedule_time) return;

    const now = new Date();
    const date = todayIso(now);
    if (config.absentee_last_sent_date === date) return; // already fired today, even if the minute is checked again

    if (currentHHMM(now) !== config.absentee_schedule_time.slice(0, 5)) return;

    if (config.absentee_mode === 'weekly') {
      if (config.absentee_schedule_day === null || now.getDay() !== config.absentee_schedule_day) return;
    }

    await sendAbsenteeDigest(client, { date, createdBy: config.updated_by });
    await client.query(
      `UPDATE onec_broadcast_configs SET absentee_last_sent_date = $1 WHERE channel = 'whatsapp_absentee'`,
      [date]
    );
  } catch (err) {
    console.error(`Absentee scheduler failed for tenant "${schemaName}":`, err);
  } finally {
    client.release();
  }
}

async function checkAllTenants() {
  const pool = db.getPool();
  const tenants = await pool.query(`SELECT schema_name FROM public.onec_tenants WHERE status = 'approved' AND is_active = true`);
  for (const { schema_name } of tenants.rows) {
    await checkAndFireForTenant(pool, schema_name);
  }
}

// Called once at server startup (see server.js). A missed tick (e.g. the
// server was down at the scheduled minute) just means that day's digest
// doesn't fire — no catch-up logic, consistent with this being a
// testing-phase/demo feature, not a guaranteed-delivery system.
function startAbsenteeScheduler() {
  setInterval(() => {
    checkAllTenants().catch((err) => console.error('Absentee scheduler tick failed:', err));
  }, CHECK_INTERVAL_MS);
}

module.exports = { startAbsenteeScheduler };
