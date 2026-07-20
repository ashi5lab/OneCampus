const { getMyCohorts } = require('../../lib/myCohorts');
const { getOwnLearnerId } = require('../../lib/ownLearner');

const AUDIENCE_BY_ROLE = { instructor: 'instructors', learner: 'learners', guardian: 'guardians' };

// A single merged, time-sorted feed of everything relevant to this caller
// or their class(es) — notices, direct messages, class-channel chat, new
// assignments/exams in their cohort(s), and (for a learner) their own
// attendance marks, scores, and leave decisions. Backs the Activities tab
// and the Home tab's Activities preview card. Read-only fan-out over
// existing tables — no new write paths, so every source here stays
// consistent with the page that already owns it (Notices, Messages, the
// Class channel, Assignments, Exams).
async function listActivities(req, res) {
  try {
    const role = req.user.role;
    const userId = req.user.userId;
    const cohorts = await getMyCohorts(req);
    const cohortIds = cohorts.map((c) => c.id);
    const ownLearnerId = role === 'learner' ? await getOwnLearnerId(req) : null;

    const queries = [];

    // Notices — same audience rule as the Notices module itself.
    const isNoticeManager = role === 'admin' || role === 'staff';
    const audienceGroup = AUDIENCE_BY_ROLE[role];
    queries.push(
      req.db.query(
        `SELECT 'notice' AS type, n.id, n.title AS title, NULL::text AS subtitle, n.created_at AS ts, u.username AS actor
         FROM onec_notices n LEFT JOIN onec_users u ON n.posted_by = u.id
         WHERE $1 OR n.audience = 'all' OR n.audience = $2
         ORDER BY n.created_at DESC LIMIT 15`,
        [isNoticeManager, audienceGroup || null]
      )
    );

    // Messages received.
    queries.push(
      req.db.query(
        `SELECT 'message' AS type, m.id, COALESCE(m.subject, 'New message') AS title, u.username AS subtitle, m.created_at AS ts, u.username AS actor
         FROM onec_messages m JOIN onec_users u ON m.sender_id = u.id
         WHERE m.recipient_id = $1 ORDER BY m.created_at DESC LIMIT 15`,
        [userId]
      )
    );

    // Own leave decisions.
    queries.push(
      req.db.query(
        `SELECT 'leave' AS type, id, INITCAP(status) AS title, INITCAP(leave_type) AS subtitle, COALESCE(reviewed_at, created_at) AS ts, NULL::text AS actor
         FROM onec_leave_requests WHERE user_id = $1 AND status != 'pending' ORDER BY COALESCE(reviewed_at, created_at) DESC LIMIT 5`,
        [userId]
      )
    );

    if (cohortIds.length > 0) {
      queries.push(
        req.db.query(
          `SELECT 'class_post' AS type, p.id, LEFT(p.body, 140) AS title, c.name AS subtitle, p.created_at AS ts, u.username AS actor
           FROM onec_class_posts p JOIN onec_users u ON p.author_id = u.id JOIN onec_cohorts c ON p.cohort_id = c.id
           WHERE p.cohort_id = ANY($1) ORDER BY p.created_at DESC LIMIT 15`,
          [cohortIds]
        )
      );
      queries.push(
        req.db.query(
          `SELECT 'class_reply' AS type, r.id, LEFT(r.body, 140) AS title, c.name AS subtitle, r.created_at AS ts, u.username AS actor
           FROM onec_class_post_replies r
           JOIN onec_class_posts p ON r.post_id = p.id
           JOIN onec_cohorts c ON p.cohort_id = c.id
           JOIN onec_users u ON r.author_id = u.id
           WHERE p.cohort_id = ANY($1) ORDER BY r.created_at DESC LIMIT 15`,
          [cohortIds]
        )
      );
      queries.push(
        req.db.query(
          `SELECT 'assignment' AS type, a.id, a.title AS title, m.name AS subtitle, a.created_at AS ts, NULL::text AS actor
           FROM onec_assignments a JOIN onec_modules m ON a.module_id = m.id
           WHERE a.cohort_id = ANY($1) ORDER BY a.created_at DESC LIMIT 10`,
          [cohortIds]
        )
      );
      queries.push(
        req.db.query(
          `SELECT 'exam' AS type, e.id, e.title AS title, m.name AS subtitle, COALESCE(e.published_at, e.created_at) AS ts, NULL::text AS actor
           FROM onec_online_exams e JOIN onec_modules m ON e.module_id = m.id
           WHERE e.cohort_id = ANY($1) AND e.published = true
           ORDER BY COALESCE(e.published_at, e.created_at) DESC LIMIT 10`,
          [cohortIds]
        )
      );
    }

    if (ownLearnerId) {
      queries.push(
        req.db.query(
          `SELECT 'attendance' AS type, a.id, CONCAT('Attendance marked: ', INITCAP(a.status)) AS title, NULL::text AS subtitle, a.date::timestamp AS ts, NULL::text AS actor
           FROM onec_attendance a WHERE a.learner_id = $1 ORDER BY a.date DESC LIMIT 10`,
          [ownLearnerId]
        )
      );
      queries.push(
        req.db.query(
          `SELECT 'score' AS type, s.id, CONCAT('Score published: ', m.name) AS title, CONCAT(s.score_obtained, ' / ', es.max_score) AS subtitle, es.eval_date::timestamp AS ts, NULL::text AS actor
           FROM onec_learner_scores s
           JOIN onec_evaluation_schedules es ON s.eval_schedule_id = es.id
           JOIN onec_modules m ON es.module_id = m.id
           WHERE s.learner_id = $1 ORDER BY es.eval_date DESC LIMIT 10`,
          [ownLearnerId]
        )
      );
    }

    const results = await Promise.all(queries);
    const items = results.flatMap((r) => r.rows);
    items.sort((a, b) => new Date(b.ts) - new Date(a.ts));

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentCount = items.filter((item) => new Date(item.ts).getTime() >= oneDayAgo).length;

    res.json({ data: items.slice(0, 40), recentCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { listActivities };
