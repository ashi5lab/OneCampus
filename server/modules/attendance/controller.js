const { z } = require('zod');
const { parsePagination } = require('../../lib/pagination');
const { getScopedLearnerIds } = require('../../lib/rowScope');

const attendanceSchema = z.object({
  learner_id: z.number().int(),
  cohort_id: z.number().int(),
  allocation_id: z.number().int().optional().nullable(),
  date: z.string(), // YYYY-MM-DD
  status: z.enum(['present', 'absent', 'late', 'excused']),
  remarks: z.string().optional().nullable()
});

async function getAll(req, res) {
  try {
    const { pagination, error } = parsePagination(req.query);
    if (error) return res.status(400).json({ error: 'Invalid pagination parameters', details: error });

    // Filter by cohort_id and/or date, independently — either may be omitted.
    const { cohort_id, date } = req.query;
    const conditions = [];
    const params = [];

    // Row-level self-scoping for learner/guardian roles (see lib/rowScope.js)
    // — forces the filter regardless of any query params, so a learner or
    // guardian can't widen the result set by simply omitting cohort_id/date.
    const scopedLearnerIds = await getScopedLearnerIds(req);
    if (scopedLearnerIds !== null) {
      params.push(scopedLearnerIds);
      conditions.push(`learner_id = ANY($${params.length})`);
    }

    if (cohort_id) {
      params.push(cohort_id);
      conditions.push(`cohort_id = $${params.length}`);
    }
    if (date) {
      params.push(date);
      conditions.push(`date = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const baseQuery = `FROM onec_attendance ${whereClause}`;

    if (!pagination) {
      const result = await req.db.query(`SELECT * ${baseQuery} ORDER BY date DESC, id DESC`, params);
      return res.json({ data: result.rows });
    }

    const pageParams = [...params, pagination.limit, pagination.offset];
    const [rows, count] = await Promise.all([
      req.db.query(
        `SELECT * ${baseQuery} ORDER BY date DESC, id DESC LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
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

async function mark(req, res) {
  try {
    const parsed = attendanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { learner_id, cohort_id, allocation_id, date, status, remarks } = parsed.data;
    const marked_by = req.user.userId;

    // We use an UPSERT pattern based on the UNIQUE(learner_id, date, allocation_id) constraint
    // In PostgreSQL, to use ON CONFLICT with a nullable column like allocation_id,
    // it's tricky because NULL != NULL in unique indexes.
    // For now, assuming either daily (allocation_id is null) or hourly, we will just handle the basic conflict clause.

    // If allocation_id is null, our schema has a UNIQUE(learner_id, date, allocation_id) constraint.
    // We will do a manual check if UPSERT syntax becomes complex with NULL constraints.
    const checkQuery = `
      SELECT id, status FROM onec_attendance
      WHERE learner_id = $1 AND date = $2
      ${allocation_id ? 'AND allocation_id = $3' : 'AND allocation_id IS NULL'}
    `;
    const checkParams = allocation_id ? [learner_id, date, allocation_id] : [learner_id, date];
    const existing = await req.db.query(checkQuery, checkParams);

    let result;
    if (existing.rows.length > 0) {
      // Update
      const id = existing.rows[0].id;
      result = await req.db.query(
        'UPDATE onec_attendance SET status = $1, remarks = $2, marked_by = $3 WHERE id = $4 RETURNING *',
        [status, remarks, marked_by, id]
      );
    } else {
      // Insert
      result = await req.db.query(`
        INSERT INTO onec_attendance (learner_id, cohort_id, allocation_id, date, status, remarks, marked_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [learner_id, cohort_id, allocation_id, date, status, remarks, marked_by]);
    }

    // No instant per-absence WhatsApp trigger here anymore — the
    // whatsapp_absentee channel now sends as one batched digest per day
    // instead of one call per learner-guardian pair, via an explicit
    // manual button or a scheduled daily/weekly firing (see
    // server/lib/absenteeDigest.js and server/lib/absenteeScheduler.js).
    return res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Learner, cohort, or allocation does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Class-wise absentee/late report for a single day — powers the admin
// dashboard "Absentees Today" card and its drill-down page. Returns a
// per-cohort breakdown listing the absent and late students (with remarks)
// plus a whole-day summary. Optional cohort_ids (comma-separated) narrows
// to selected classes; omitted = all classes the caller can see.
//
// Row-scoped the same way getAll is: a learner/guardian who somehow reaches
// this only ever sees their own records, never a full classmate roster.
async function absenteeReport(req, res) {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const conditions = ['a.date = $1'];
    const params = [date];

    const scopedLearnerIds = await getScopedLearnerIds(req);
    if (scopedLearnerIds !== null) {
      params.push(scopedLearnerIds);
      conditions.push(`a.learner_id = ANY($${params.length})`);
    }

    const cohortIds = (req.query.cohort_ids || '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n));
    if (cohortIds.length > 0) {
      params.push(cohortIds);
      conditions.push(`a.cohort_id = ANY($${params.length})`);
    }

    const result = await req.db.query(
      `SELECT a.cohort_id, c.name AS cohort_name, a.status, a.remarks,
              l.id AS learner_id, l.first_name, l.last_name
       FROM onec_attendance a
       JOIN onec_learners l ON l.id = a.learner_id
       LEFT JOIN onec_cohorts c ON c.id = a.cohort_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY c.name NULLS LAST, l.first_name, l.last_name`,
      params
    );

    // A learner can have multiple rows per day (hour-based/allocation
    // attendance). Collapse to one status per learner-per-cohort, keeping
    // the most significant one so a single absent hour still counts them
    // absent for the day. present is only kept if nothing worse exists.
    const RANK = { absent: 4, late: 3, excused: 2, present: 1 };
    const perLearner = new Map(); // key: `${cohort_id}:${learner_id}`
    for (const row of result.rows) {
      const key = `${row.cohort_id}:${row.learner_id}`;
      const existing = perLearner.get(key);
      if (!existing || (RANK[row.status] || 0) > (RANK[existing.status] || 0)) {
        perLearner.set(key, row);
      }
    }

    const summary = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    const cohortMap = new Map();
    for (const row of perLearner.values()) {
      if (summary[row.status] !== undefined) summary[row.status] += 1;
      summary.total += 1;

      if (row.status !== 'absent' && row.status !== 'late') continue;

      if (!cohortMap.has(row.cohort_id)) {
        cohortMap.set(row.cohort_id, {
          cohort_id: row.cohort_id,
          cohort_name: row.cohort_name || 'Unassigned',
          absent_count: 0,
          late_count: 0,
          students: []
        });
      }
      const cohort = cohortMap.get(row.cohort_id);
      if (row.status === 'absent') cohort.absent_count += 1;
      else cohort.late_count += 1;
      cohort.students.push({
        learner_id: row.learner_id,
        first_name: row.first_name,
        last_name: row.last_name,
        status: row.status,
        remarks: row.remarks || null
      });
    }

    const cohorts = [...cohortMap.values()].sort(
      (a, b) => b.absent_count - a.absent_count || a.cohort_name.localeCompare(b.cohort_name)
    );

    res.json({ data: { date, summary, cohorts } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, mark, absenteeReport };
