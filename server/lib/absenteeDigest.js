const { getActiveConfig, dispatchOne } = require('./broadcastDispatch');

// Replaces the old "send instantly on every single absence" trigger with
// one batched send per call — the whatsapp_absentee channel is still on
// Meta/Twilio's free test tier in this app (same testing-phase constraint
// as the general 'whatsapp' channel, see server/modules/broadcast/README),
// so a class of 100 absentees must still only cost ONE outbound API call,
// not one per learner-guardian pair. Callers: a manual button
// (server/modules/broadcast's sendAbsenteeAlertsNow) and the scheduled
// daily/weekly firing (server/lib/absenteeScheduler.js).
//
// `db` is anything with a tenant-scoped .query() — req.db for the manual
// path, a dedicated pool client with search_path already set for the
// scheduler (see absenteeScheduler.js). Never throws; every caller decides
// for itself how to surface a failure.
async function sendAbsenteeDigest(db, { date, createdBy }) {
  const config = await getActiveConfig({ db }, 'whatsapp_absentee');
  if (!config) return { skipped: 'not_configured' };

  const absentees = await db.query(
    `SELECT DISTINCT l.id AS learner_id, l.first_name, l.last_name, c.name AS cohort_name
     FROM onec_attendance a
     JOIN onec_learners l ON l.id = a.learner_id
     LEFT JOIN onec_cohorts c ON c.id = l.cohort_id
     WHERE a.date = $1 AND a.status = 'absent'
       AND EXISTS (
         SELECT 1 FROM onec_learner_guardian_map map
         JOIN onec_guardians g ON g.id = map.guardian_id
         WHERE map.learner_id = l.id AND g.whatsapp_opt_in = true AND g.phone IS NOT NULL AND g.phone <> ''
       )`,
    [date]
  );
  if (absentees.rows.length === 0) return { skipped: 'no_absentees' };

  const learnerIds = absentees.rows.map((r) => r.learner_id);
  const cohortNames = [...new Set(absentees.rows.map((r) => r.cohort_name).filter(Boolean))];
  const testPhone = (config.variables || {}).test_phone;
  if (!testPhone) return { skipped: 'no_test_phone' };

  const { ok, detail } = await dispatchOne(config, {
    phone: testPhone,
    count: String(absentees.rows.length),
    learner_name: absentees.rows.length === 1 ? `${absentees.rows[0].first_name} ${absentees.rows[0].last_name}` : `${absentees.rows.length} students`,
    cohort_name: cohortNames.join(', '),
    date
  });
  const sent = ok ? 1 : 0;
  const failed = ok ? 0 : 1;

  const sendResult = {
    sent,
    failed,
    note: 'testing phase — one batched send for the whole day regardless of absentee count',
    ...(failed > 0 ? { last_error: detail } : {})
  };
  await db.query(
    `INSERT INTO onec_broadcasts (channel, message, status, audience_type, audience_ids, send_result, created_by, sent_at)
     VALUES ('whatsapp_absentee', $1, $2, 'learner', $3, $4, $5, CURRENT_TIMESTAMP)`,
    [
      `${absentees.rows.length} learner(s) absent on ${date}`,
      failed > 0 && sent === 0 ? 'failed' : 'sent',
      JSON.stringify(learnerIds),
      JSON.stringify(sendResult),
      createdBy
    ]
  );

  return { sent, failed, count: absentees.rows.length, ...(failed > 0 ? { last_error: detail } : {}) };
}

module.exports = { sendAbsenteeDigest };
