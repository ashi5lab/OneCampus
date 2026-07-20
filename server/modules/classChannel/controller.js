const { z } = require('zod');
const { getMyCohorts } = require('../../lib/myCohorts');
const { canAccessCohort } = require('../../lib/cohortAccess');

const postSchema = z.object({ body: z.string().min(1, 'Message is required').max(4000) });

// Backs the Class tab's picker — every cohort this caller belongs to (see
// getMyCohorts). Empty for staff/admin, who have no cohort-membership
// relationship in the schema; their Class tab shows an empty state instead.
async function listMyCohorts(req, res) {
  try {
    const cohorts = await getMyCohorts(req);
    res.json({ data: cohorts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Posts + their replies in one round trip — channel volume is small enough
// that a separate per-post replies endpoint would just be N+1 round trips
// for no benefit. Oldest post first so the feed reads top-to-bottom like a
// chat thread.
async function listPosts(req, res) {
  try {
    const cohortId = Number(req.params.cohortId);
    if (!(await canAccessCohort(req, cohortId))) {
      return res.status(403).json({ error: 'Not a member of this class' });
    }

    const result = await req.db.query(
      `SELECT p.id, p.body, p.created_at, p.author_id,
              u.username AS author_username, u.role AS author_role,
              COALESCE(
                (SELECT json_agg(json_build_object(
                    'id', r.id, 'body', r.body, 'created_at', r.created_at,
                    'author_id', r.author_id, 'author_username', ru.username, 'author_role', ru.role
                  ) ORDER BY r.created_at ASC)
                 FROM onec_class_post_replies r
                 JOIN onec_users ru ON r.author_id = ru.id
                 WHERE r.post_id = p.id),
                '[]'
              ) AS replies
       FROM onec_class_posts p
       JOIN onec_users u ON p.author_id = u.id
       WHERE p.cohort_id = $1
       ORDER BY p.created_at ASC`,
      [cohortId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createPost(req, res) {
  try {
    const cohortId = Number(req.params.cohortId);
    if (!(await canAccessCohort(req, cohortId))) {
      return res.status(403).json({ error: 'Not a member of this class' });
    }

    const parsed = postSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    // req.user carries only userId/role/tenant (see the JWT payload in
    // modules/auth/controller.js), not username — join it back in the same
    // round trip rather than a follow-up SELECT.
    const result = await req.db.query(
      `WITH ins AS (
         INSERT INTO onec_class_posts (cohort_id, author_id, body) VALUES ($1, $2, $3) RETURNING *
       )
       SELECT ins.*, u.username AS author_username, u.role AS author_role FROM ins JOIN onec_users u ON ins.author_id = u.id`,
      [cohortId, req.user.userId, parsed.data.body]
    );
    res.status(201).json({ data: { ...result.rows[0], replies: [] } });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Class does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createReply(req, res) {
  try {
    const postId = Number(req.params.postId);
    const postResult = await req.db.query('SELECT cohort_id FROM onec_class_posts WHERE id = $1', [postId]);
    if (postResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (!(await canAccessCohort(req, postResult.rows[0].cohort_id))) {
      return res.status(403).json({ error: 'Not a member of this class' });
    }

    const parsed = postSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const result = await req.db.query(
      `WITH ins AS (
         INSERT INTO onec_class_post_replies (post_id, author_id, body) VALUES ($1, $2, $3) RETURNING *
       )
       SELECT ins.*, u.username AS author_username, u.role AS author_role FROM ins JOIN onec_users u ON ins.author_id = u.id`,
      [postId, req.user.userId, parsed.data.body]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { listMyCohorts, listPosts, createPost, createReply };
