const { z } = require('zod');
const bcrypt = require('bcrypt');
const { logAudit } = require('../../lib/audit');
const { parsePagination } = require('../../lib/pagination');
const { hasPermission } = require('../../lib/permissions');
const { getScopedLearnerIds } = require('../../lib/rowScope');
const { getCallerDesignation } = require('../../lib/designation');
const { generateUniqueUsername, generatePassword, placeholderEmail } = require('../../lib/credentials');

const classHeadSchema = z.object({ is_class_head: z.boolean() });
const schoolHeadSchema = z.object({ is_school_head: z.boolean() });

const learnerCreateSchema = z.object({
  // No username/password here anymore — both are auto-generated (see
  // create() below) from first_name + registry_no, same as bulk upload.
  email: z.string().email("A valid email is required").optional().or(z.literal('')),
  registry_no: z.string().min(1, "Registry number is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  cohort_id: z.number().int().optional().nullable(),
  status: z.string().default('active'),
  meta: z.record(z.any()).optional().default({})
});

const learnerUpdateSchema = z.object({
  registry_no: z.string().min(1, "Registry number is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  cohort_id: z.number().int().optional().nullable(),
  status: z.string().default('active'),
  meta: z.record(z.any()).optional().default({})
});

// ?page=&pageSize= are optional — omitting both returns every row exactly
// as before pagination existed (see lib/pagination.js). ?search/cohort_id/
// gender/status are all optional and independently combinable filters.
// Always joins onec_cohorts so the frontend gets cohort_name instead of a
// bare cohort_id to display (previously the roster table showed the raw
// id — see server/modules/learners/README.md).
async function getAll(req, res) {
  try {
    const { pagination, error } = parsePagination(req.query);
    if (error) return res.status(400).json({ error: 'Invalid pagination parameters', details: error });

    const { search, cohort_id, gender, status } = req.query;
    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(l.first_name ILIKE $${params.length} OR l.last_name ILIKE $${params.length} OR l.registry_no ILIKE $${params.length})`);
    }
    if (cohort_id) {
      params.push(cohort_id);
      conditions.push(`l.cohort_id = $${params.length}`);
    }
    if (gender) {
      params.push(gender);
      conditions.push(`l.meta->>'gender' = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`l.status = $${params.length}`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const baseQuery = `FROM onec_learners l LEFT JOIN onec_cohorts c ON l.cohort_id = c.id LEFT JOIN onec_users u ON l.user_id = u.id ${whereClause}`;

    if (!pagination) {
      const result = await req.db.query(`SELECT l.*, c.name AS cohort_name, u.profile_picture_url ${baseQuery} ORDER BY l.id DESC`, params);
      return res.json({ data: result.rows });
    }

    const pageParams = [...params, pagination.limit, pagination.offset];
    const [rows, count] = await Promise.all([
      req.db.query(
        `SELECT l.*, c.name AS cohort_name, u.profile_picture_url ${baseQuery} ORDER BY l.id DESC LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
        pageParams
      ),
      req.db.query(`SELECT COUNT(*)::int AS total ${baseQuery}`, params)
    ]);
    return res.json({ data: rows.rows, meta: { total: count.rows[0].total, page: pagination.page, pageSize: pagination.pageSize } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('SELECT * FROM onec_learners WHERE id = $1', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Creates the onec_users row and the onec_learners row together, in one
// transaction, so the frontend never needs a pre-existing user id — this
// was previously the only way to create a learner. Username and password
// are generated here rather than typed in (see server/lib/credentials.js)
// — the response includes both since this is the only moment the plaintext
// password ever exists; the frontend shows it once so it can be handed to
// the student.
async function create(req, res) {
  try {
    const parsed = learnerCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { email, registry_no, first_name, last_name, cohort_id, status, meta } = parsed.data;

    const username = await generateUniqueUsername(req.db, req.tenantConfig.prefix, first_name, registry_no);
    const password = generatePassword();
    const password_hash = await bcrypt.hash(password, 10);
    const finalEmail = email || placeholderEmail(username, req.tenantConfig.domain);

    await req.db.query('BEGIN');
    try {
      const userResult = await req.db.query(
        `INSERT INTO onec_users (username, email, password_hash, role) VALUES ($1, $2, $3, 'learner') RETURNING id`,
        [username, finalEmail, password_hash]
      );
      const user_id = userResult.rows[0].id;

      const learnerResult = await req.db.query(
        `INSERT INTO onec_learners (user_id, registry_no, first_name, last_name, cohort_id, status, meta)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [user_id, registry_no, first_name, last_name, cohort_id, status, meta]
      );

      await req.db.query('COMMIT');
      res.status(201).json({ data: { ...learnerResult.rows[0], username, password } });
    } catch (err) {
      await req.db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Username, email, or registry number is already in use' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const parsed = learnerUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { registry_no, first_name, last_name, cohort_id, status, meta } = parsed.data;

    const result = await req.db.query(
      'UPDATE onec_learners SET registry_no = $1, first_name = $2, last_name = $3, cohort_id = $4, status = $5, meta = $6 WHERE id = $7 RETURNING *',
      [registry_no, first_name, last_name, cohort_id, status, meta, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Registry number must be unique' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    const result = await req.db.query('DELETE FROM onec_learners WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req, 'learner.deleted', { learner_id: result.rows[0].id, registry_no: result.rows[0].registry_no });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// A richer, aggregated view for a single learner: cohort/unit, guardians,
// attendance summary, exam scores, certificates — the "insights" profile
// page. Not gated by requirePermission('learners.view') at the route level
// like the rest of this module (see routes.js) — a learner/guardian who
// lacks roster access should still be able to view their own/their linked
// child's profile, the same self-scoping concept every other per-learner
// endpoint (attendance, certificates, scores) already applies. Roster-level
// roles (admin/staff/instructor) can view anyone's via learners.view.
async function getProfile(req, res) {
  try {
    const learnerId = Number(req.params.id);

    const hasRosterAccess = await hasPermission(req, 'learners.view');
    if (!hasRosterAccess) {
      const scopedIds = await getScopedLearnerIds(req);
      if (scopedIds === null || !scopedIds.includes(learnerId)) {
        return res.status(403).json({ error: 'Missing permission: learners.view' });
      }
    }

    const learnerResult = await req.db.query(
      `SELECT l.*, c.name AS cohort_name, c.time_block AS cohort_time_block, un.name AS unit_name,
              usr.email, usr.profile_picture_url
       FROM onec_learners l
       LEFT JOIN onec_cohorts c ON l.cohort_id = c.id
       LEFT JOIN onec_units un ON c.unit_id = un.id
       LEFT JOIN onec_users usr ON l.user_id = usr.id
       WHERE l.id = $1`,
      [learnerId]
    );
    if (learnerResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    // Queued on the same tenant-pinned connection (req.db), not parallel
    // connections — node-postgres serializes queries issued on one client,
    // so Promise.all here is safe and just avoids one round trip of latency
    // per query rather than running them concurrently on the wire.
    const [guardians, attendanceSummary, recentAttendance, scores, certificates] = await Promise.all([
      req.db.query(
        `SELECT g.id, g.first_name, g.last_name, g.phone, g.address, usr.profile_picture_url
         FROM onec_learner_guardian_map map
         JOIN onec_guardians g ON map.guardian_id = g.id
         LEFT JOIN onec_users usr ON g.user_id = usr.id
         WHERE map.learner_id = $1
         ORDER BY g.last_name, g.first_name`,
        [learnerId]
      ),
      req.db.query(
        'SELECT status, COUNT(*)::int AS count FROM onec_attendance WHERE learner_id = $1 GROUP BY status',
        [learnerId]
      ),
      req.db.query(
        'SELECT id, date, status, remarks FROM onec_attendance WHERE learner_id = $1 ORDER BY date DESC LIMIT 20',
        [learnerId]
      ),
      req.db.query(
        `SELECT s.id, s.score_obtained, s.remarks, sch.eval_date, sch.max_score, sch.passing_score,
                ev.id AS evaluation_id, ev.name AS evaluation_name, ev.type AS evaluation_type, m.name AS module_name
         FROM onec_learner_scores s
         JOIN onec_evaluation_schedules sch ON s.eval_schedule_id = sch.id
         JOIN onec_evaluations ev ON sch.evaluation_id = ev.id
         JOIN onec_modules m ON sch.module_id = m.id
         WHERE s.learner_id = $1
         ORDER BY sch.eval_date DESC`,
        [learnerId]
      ),
      req.db.query(
        'SELECT id, type, certificate_no, issue_date FROM onec_certificates WHERE learner_id = $1 ORDER BY issue_date DESC',
        [learnerId]
      )
    ]);

    res.json({
      data: {
        learner: learnerResult.rows[0],
        guardians: guardians.rows,
        attendance: { summary: attendanceSummary.rows, recent: recentAttendance.rows },
        scores: scores.rows,
        certificates: certificates.rows
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// "Class head" — one of possibly several student representatives for their
// own cohort (their cohort_id already determines which class this applies
// to, so there's no separate join table — see server/migrations, this
// deliberately needed none). Stored in meta rather than a new column, same
// as gender/designation elsewhere in this app.
async function setClassHead(req, res) {
  try {
    const { id } = req.params;
    const parsed = classHeadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const result = await req.db.query(
      `UPDATE onec_learners SET meta = jsonb_set(meta, '{is_class_head}', to_jsonb($1::boolean)) WHERE id = $2 RETURNING *`,
      [parsed.data.is_class_head, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    logAudit(req, 'learners.class_head_set', { learner_id: id, is_class_head: parsed.data.is_class_head });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// "School head" — unlike class head, singular tenant-wide (setting one
// clears whoever held it before), and restricted to the principal
// specifically per spec (not just anyone with learners.manage, which the
// route itself requires as the coarser gate — admin bypasses this narrower
// check since they can already do everything).
async function setSchoolHead(req, res) {
  try {
    const { id } = req.params;
    const parsed = schoolHeadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    if (req.user.role !== 'admin') {
      const designation = await getCallerDesignation(req);
      if (designation !== 'principal') return res.status(403).json({ error: 'Only the principal can assign the school head' });
    }

    await req.db.query('BEGIN');
    try {
      if (parsed.data.is_school_head) {
        await req.db.query(`UPDATE onec_learners SET meta = meta - 'is_school_head' WHERE meta->>'is_school_head' = 'true'`);
      }
      const result = await req.db.query(
        `UPDATE onec_learners SET meta = jsonb_set(meta, '{is_school_head}', to_jsonb($1::boolean)) WHERE id = $2 RETURNING *`,
        [parsed.data.is_school_head, id]
      );
      if (result.rows.length === 0) {
        await req.db.query('ROLLBACK');
        return res.status(404).json({ error: 'Not found' });
      }
      await req.db.query('COMMIT');
      logAudit(req, 'learners.school_head_set', { learner_id: id, is_school_head: parsed.data.is_school_head });
      res.json({ data: result.rows[0] });
    } catch (err) {
      await req.db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, getById, create, update, remove, getProfile, setClassHead, setSchoolHead };
