const { z } = require('zod');
const { logAudit } = require('../../lib/audit');
const { getOwnLearnerId } = require('../../lib/ownLearner');
const { getOwnGuardianLearnerIds } = require('../../lib/ownGuardianLearners');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOUR_RE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const allocationSchema = z
  .object({
    cohort_id: z.number().int(),
    module_id: z.number().int(),
    instructor_id: z.number().int(),
    days: z.array(z.enum(DAY_NAMES)).min(1, 'Choose at least one day'),
    hour: z.string().regex(HOUR_RE, 'Use HH:MM-HH:MM, e.g. 09:00-10:00'),
    time_block: z.string().min(1, 'Time block is required'),
    start_date: z.string().regex(DATE_RE, 'Use YYYY-MM-DD').optional().nullable(),
    end_date: z.string().regex(DATE_RE, 'Use YYYY-MM-DD').optional().nullable()
  })
  .refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, {
    message: 'End date must be on or after the start date',
    path: ['end_date']
  })
  .refine((d) => {
    const [startH, startM] = d.hour.split('-')[0].split(':').map(Number);
    const [endH, endM] = d.hour.split('-')[1].split(':').map(Number);
    return endH * 60 + endM > startH * 60 + startM;
  }, { message: 'End time must be after start time', path: ['hour'] });

function hourToMinutes(hm) {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

function hoursOverlap(a, b) {
  const [aStart, aEnd] = a.split('-').map(hourToMinutes);
  const [bStart, bEnd] = b.split('-').map(hourToMinutes);
  return aStart < bEnd && bStart < aEnd;
}

// null start/end = unbounded (applies for the whole time_block) — see the
// column comment on onec_allocations in tenant_schema.sql.
function dateRangesOverlap(aStart, aEnd, bStart, bEnd) {
  return (!aStart || !bEnd || aStart <= bEnd) && (!bStart || !aEnd || bStart <= aEnd);
}

// Guards against the two ways a hand-built timetable actually breaks: the
// same class double-booked into two periods at once, or one teacher
// scheduled into two classes at the same time. Only checked within the same
// time_block (a Fall-2026 period and a 2027-2028 period can never collide).
async function findConflict(req, candidate, excludeId = null) {
  const params = [candidate.time_block, candidate.cohort_id, candidate.instructor_id];
  // Date columns cast to text — pg parses `date` columns into JS Date
  // objects by default, but dateRangesOverlap compares them against the
  // candidate's plain 'YYYY-MM-DD' strings; a string-vs-Date comparison
  // silently evaluates to NaN-based `false` and would make this never
  // detect a real conflict.
  let query = `
    SELECT a.id, a.cohort_id, a.module_id, a.instructor_id, a.schedule_data, a.time_block,
           a.start_date::text AS start_date, a.end_date::text AS end_date,
           m.name AS module_name, c.name AS cohort_name, i.first_name AS instructor_first_name, i.last_name AS instructor_last_name
    FROM onec_allocations a
    JOIN onec_modules m ON a.module_id = m.id
    JOIN onec_cohorts c ON a.cohort_id = c.id
    JOIN onec_instructors i ON a.instructor_id = i.id
    WHERE a.time_block = $1 AND (a.cohort_id = $2 OR a.instructor_id = $3)
  `;
  if (excludeId) {
    params.push(excludeId);
    query += ` AND a.id != $${params.length}`;
  }
  const result = await req.db.query(query, params);

  for (const row of result.rows) {
    if (!dateRangesOverlap(candidate.start_date, candidate.end_date, row.start_date, row.end_date)) continue;
    const rowDays = row.schedule_data?.days || [];
    const sharesDay = candidate.days.some((d) => rowDays.includes(d));
    if (!sharesDay) continue;
    if (!hoursOverlap(candidate.hour, row.schedule_data?.hour || '')) continue;

    const reason =
      row.cohort_id === candidate.cohort_id
        ? `${row.cohort_name} already has a period at that time (${row.module_name})`
        : `${row.instructor_first_name} ${row.instructor_last_name} is already teaching ${row.module_name} (${row.cohort_name}) at that time`;
    return reason;
  }
  return null;
}

// The weekly grid for one cohort — what the frontend actually renders.
// Learner/guardian roles are row-scoped to their own/linked cohort(s), same
// pattern as attendance's getScopedLearnerIds but resolved to cohort_id
// since allocations are per-cohort, not per-learner.
async function getAll(req, res) {
  try {
    const cohortId = req.query.cohort_id ? Number(req.query.cohort_id) : null;
    if (!cohortId) return res.status(400).json({ error: 'cohort_id is required' });

    if (req.user.role === 'learner') {
      const ownLearnerId = await getOwnLearnerId(req);
      const learner = await req.db.query('SELECT cohort_id FROM onec_learners WHERE id = $1', [ownLearnerId]);
      if (learner.rows[0]?.cohort_id !== cohortId) return res.status(403).json({ error: 'Not your class timetable' });
    } else if (req.user.role === 'guardian') {
      const learnerIds = await getOwnGuardianLearnerIds(req);
      const linked = await req.db.query('SELECT 1 FROM onec_learners WHERE id = ANY($1) AND cohort_id = $2', [learnerIds, cohortId]);
      if (linked.rows.length === 0) return res.status(403).json({ error: 'Not your child’s class timetable' });
    }

    const result = await req.db.query(
      // start_date/end_date cast to text — see the comment on findConflict's
      // query; PeriodFormModal's toFormDefaults calls .slice() on these
      // assuming plain strings, which a raw Date object doesn't support.
      `SELECT a.id, a.cohort_id, a.module_id, a.instructor_id, a.schedule_data, a.time_block,
              a.start_date::text AS start_date, a.end_date::text AS end_date,
              m.name AS module_name, m.code AS module_code, i.first_name AS instructor_first_name, i.last_name AS instructor_last_name
       FROM onec_allocations a
       JOIN onec_modules m ON a.module_id = m.id
       JOIN onec_instructors i ON a.instructor_id = i.id
       WHERE a.cohort_id = $1
       ORDER BY a.id`,
      [cohortId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Lets a learner/guardian without cohorts.view populate a "which class"
// picker for getAll, without needing the roster-level permission — same
// self-scoping concept as getScopedLearnerIds, resolved to cohorts instead
// of learner ids. Not meaningful for admin/staff/instructor, who already
// have cohorts.view and use the full cohort list instead.
async function getMyCohorts(req, res) {
  try {
    if (req.user.role === 'learner') {
      const ownLearnerId = await getOwnLearnerId(req);
      const result = await req.db.query(
        `SELECT c.id AS cohort_id, c.name AS cohort_name FROM onec_learners l JOIN onec_cohorts c ON l.cohort_id = c.id WHERE l.id = $1`,
        [ownLearnerId]
      );
      return res.json({ data: result.rows });
    }
    if (req.user.role === 'guardian') {
      const learnerIds = await getOwnGuardianLearnerIds(req);
      if (!learnerIds.length) return res.json({ data: [] });
      const result = await req.db.query(
        `SELECT l.id AS learner_id, l.first_name AS learner_first_name, l.last_name AS learner_last_name, c.id AS cohort_id, c.name AS cohort_name
         FROM onec_learners l JOIN onec_cohorts c ON l.cohort_id = c.id
         WHERE l.id = ANY($1) ORDER BY l.first_name`,
        [learnerIds]
      );
      return res.json({ data: result.rows });
    }
    res.status(403).json({ error: 'Use the full cohort list instead' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// An instructor's own cross-cohort schedule — "which classes am I teaching,
// and when" — as opposed to getAll's single-cohort view.
async function getMine(req, res) {
  try {
    if (req.user.role !== 'instructor') return res.status(403).json({ error: 'Only instructors have a personal timetable' });
    const instructor = await req.db.query('SELECT id FROM onec_instructors WHERE user_id = $1', [req.user.userId]);
    const instructorId = instructor.rows[0]?.id;
    if (!instructorId) return res.json({ data: [] });

    const result = await req.db.query(
      `SELECT a.id, a.cohort_id, a.module_id, a.instructor_id, a.schedule_data, a.time_block,
              a.start_date::text AS start_date, a.end_date::text AS end_date,
              m.name AS module_name, m.code AS module_code, c.name AS cohort_name
       FROM onec_allocations a
       JOIN onec_modules m ON a.module_id = m.id
       JOIN onec_cohorts c ON a.cohort_id = c.id
       WHERE a.instructor_id = $1
       ORDER BY a.id`,
      [instructorId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function create(req, res) {
  try {
    const parsed = allocationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const d = parsed.data;

    const conflict = await findConflict(req, d);
    if (conflict) return res.status(409).json({ error: conflict });

    const result = await req.db.query(
      `INSERT INTO onec_allocations (cohort_id, module_id, instructor_id, schedule_data, time_block, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [d.cohort_id, d.module_id, d.instructor_id, JSON.stringify({ days: d.days, hour: d.hour }), d.time_block, d.start_date ?? null, d.end_date ?? null]
    );
    logAudit(req, 'timetable.period_created', { allocation_id: result.rows[0].id, cohort_id: d.cohort_id, module_id: d.module_id });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Cohort, module, or instructor does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const parsed = allocationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const d = parsed.data;

    const conflict = await findConflict(req, d, Number(id));
    if (conflict) return res.status(409).json({ error: conflict });

    const result = await req.db.query(
      `UPDATE onec_allocations SET
         cohort_id = $1, module_id = $2, instructor_id = $3, schedule_data = $4, time_block = $5, start_date = $6, end_date = $7
       WHERE id = $8 RETURNING *`,
      [d.cohort_id, d.module_id, d.instructor_id, JSON.stringify({ days: d.days, hour: d.hour }), d.time_block, d.start_date ?? null, d.end_date ?? null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Cohort, module, or instructor does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('DELETE FROM onec_allocations WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req, 'timetable.period_deleted', { allocation_id: result.rows[0].id });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, getMyCohorts, getMine, create, update, remove, DAY_NAMES };
