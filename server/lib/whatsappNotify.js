const { getActiveConfig, dispatchOne } = require('./broadcastDispatch');

// Fired from attendance/controller.js's mark() whenever a learner is newly
// marked absent (not on every edit — see the caller). Uses the
// 'whatsapp_absentee' onec_broadcast_configs row (same generic
// Configuration panel as SMS/voicemail — see server/modules/broadcast) so
// no code change is needed to point this at a real WhatsApp Business
// number once one exists; only guardians with whatsapp_opt_in = true and a
// phone on file are notified, per Meta's opt-in policy for
// business-initiated messages.
//
// Never throws — a notification failure must not break attendance marking
// itself, which is the actual thing the caller is trying to do.
async function notifyAbsentee(req, { learnerId, date }) {
  try {
    const config = await getActiveConfig(req, 'whatsapp_absentee');
    if (!config) return;

    const learnerResult = await req.db.query(
      `SELECT l.first_name, l.last_name, c.name AS cohort_name
       FROM onec_learners l LEFT JOIN onec_cohorts c ON l.cohort_id = c.id
       WHERE l.id = $1`,
      [learnerId]
    );
    const learner = learnerResult.rows[0];
    if (!learner) return;

    const guardiansResult = await req.db.query(
      `SELECT g.phone FROM onec_learner_guardian_map map
       JOIN onec_guardians g ON g.id = map.guardian_id
       WHERE map.learner_id = $1 AND g.whatsapp_opt_in = true AND g.phone IS NOT NULL AND g.phone <> ''`,
      [learnerId]
    );
    if (guardiansResult.rows.length === 0) return;

    let sent = 0;
    let failed = 0;
    for (const guardian of guardiansResult.rows) {
      try {
        const ok = await dispatchOne(config, {
          phone: guardian.phone,
          learner_name: `${learner.first_name} ${learner.last_name}`,
          cohort_name: learner.cohort_name || '',
          date
        });
        ok ? sent++ : failed++;
      } catch {
        failed++;
      }
    }

    await req.db.query(
      `INSERT INTO onec_broadcasts (channel, message, status, audience_type, audience_ids, send_result, created_by, sent_at)
       VALUES ('whatsapp_absentee', $1, $2, 'learner', $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        `${learner.first_name} ${learner.last_name} — absent on ${date}`,
        failed > 0 && sent === 0 ? 'failed' : 'sent',
        JSON.stringify([learnerId]),
        JSON.stringify({ sent, failed }),
        req.user.userId
      ]
    );
  } catch (err) {
    console.error('WhatsApp absentee notification failed:', err);
  }
}

module.exports = { notifyAbsentee };
