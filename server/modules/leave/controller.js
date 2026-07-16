const { z } = require('zod');
const { logAudit } = require('../../lib/audit');
const { getCallerDesignation } = require('../../lib/designation');

const LEAVE_TYPES = ['personal', 'sick'];
const HALF_DAY_PERIODS = ['first_half', 'second_half'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z
  .object({
    leave_type: z.enum(LEAVE_TYPES),
    reason: z.string().optional().nullable(),
    start_date: z.string().regex(DATE_RE, 'Use YYYY-MM-DD'),
    end_date: z.string().regex(DATE_RE, 'Use YYYY-MM-DD'),
    is_half_day: z.boolean().optional().default(false),
    half_day_period: z.enum(HALF_DAY_PERIODS).optional().nullable()
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: 'End date must be on or after the start date',
    path: ['end_date']
  })
  .refine((data) => !data.is_half_day || data.start_date === data.end_date, {
    message: 'Half-day leave must be a single date',
    path: ['is_half_day']
  })
  .refine((data) => !data.is_half_day || !!data.half_day_period, {
    message: 'Choose first half or second half',
    path: ['half_day_period']
  });

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  review_note: z.string().optional().nullable()
});

function numDaysBetween(start, end, isHalfDay) {
  if (isHalfDay) return 0.5;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(end) - new Date(start)) / msPerDay) + 1;
}

// Leave requests are always self-filed — a teacher/staff member/student
// applies for their own leave, never on someone else's behalf — so the
// applicant's role comes straight from the caller's session, not the body.
function applicantRoleFor(role) {
  return role === 'instructor' || role === 'staff' || role === 'learner' ? role : null;
}

async function create(req, res) {
  try {
    const applicantRole = applicantRoleFor(req.user.role);
    if (!applicantRole) return res.status(403).json({ error: 'Only instructors, staff, and learners can apply for leave' });

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { leave_type, reason, start_date, end_date, is_half_day, half_day_period } = parsed.data;
    const num_days = numDaysBetween(start_date, end_date, is_half_day);

    const result = await req.db.query(
      `INSERT INTO onec_leave_requests
         (user_id, applicant_role, leave_type, reason, start_date, end_date, is_half_day, half_day_period, num_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        req.user.userId,
        applicantRole,
        leave_type,
        reason ?? null,
        start_date,
        end_date,
        is_half_day,
        is_half_day ? half_day_period : null,
        num_days
      ]
    );
    logAudit(req, 'leave.applied', { leave_id: result.rows[0].id, leave_type, start_date, end_date, num_days });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function listMine(req, res) {
  try {
    const result = await req.db.query(
      `SELECT lr.*, ru.username AS reviewed_by_username
       FROM onec_leave_requests lr
       LEFT JOIN onec_users ru ON lr.reviewed_by = ru.id
       WHERE lr.user_id = $1
       ORDER BY lr.created_at DESC`,
      [req.user.userId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Who this caller may see in the approval queue: admin and anyone tagged
// principal/vice_principal see every request tenant-wide; a plain instructor
// sees only requests from learners in cohorts where they're the advisor
// (onec_cohorts.advisor_id — the "class teacher" set via the Cohorts page);
// everyone else (plain staff, learners) sees nothing here — their own
// requests are listMine, not this queue.
async function getApproverScope(req) {
  if (req.user.role === 'admin') return { scope: 'all' };

  const designation = await getCallerDesignation(req);
  if (designation === 'principal' || designation === 'vice_principal') return { scope: 'all' };

  if (req.user.role === 'instructor') return { scope: 'own_class', userId: req.user.userId };

  return { scope: 'none' };
}

async function list(req, res) {
  try {
    const approverScope = await getApproverScope(req);
    if (approverScope.scope === 'none') return res.json({ data: [] });

    let where = '';
    const params = [];
    if (approverScope.scope === 'own_class') {
      params.push(approverScope.userId);
      where = `WHERE lr.applicant_role = 'learner' AND EXISTS (
        SELECT 1 FROM onec_learners l JOIN onec_cohorts c ON l.cohort_id = c.id
        WHERE l.user_id = lr.user_id AND c.advisor_id = $1
      )`;
    }

    const result = await req.db.query(
      `SELECT lr.*, u.username AS applicant_username,
              COALESCE(i.first_name, s.first_name, l.first_name) AS applicant_first_name,
              COALESCE(i.last_name, s.last_name, l.last_name) AS applicant_last_name,
              c.name AS applicant_cohort_name,
              ru.username AS reviewed_by_username
       FROM onec_leave_requests lr
       JOIN onec_users u ON lr.user_id = u.id
       LEFT JOIN onec_instructors i ON i.user_id = lr.user_id AND lr.applicant_role = 'instructor'
       LEFT JOIN onec_staff s ON s.user_id = lr.user_id AND lr.applicant_role = 'staff'
       LEFT JOIN onec_learners l ON l.user_id = lr.user_id AND lr.applicant_role = 'learner'
       LEFT JOIN onec_cohorts c ON l.cohort_id = c.id
       LEFT JOIN onec_users ru ON lr.reviewed_by = ru.id
       ${where}
       ORDER BY (lr.status = 'pending') DESC, lr.created_at DESC`,
      params
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function canReview(req, leave) {
  if (req.user.role === 'admin') return true;

  const designation = await getCallerDesignation(req);
  if (designation === 'principal' || designation === 'vice_principal') return true;

  if (req.user.role === 'instructor' && leave.applicant_role === 'learner') {
    const result = await req.db.query(
      `SELECT 1 FROM onec_learners l JOIN onec_cohorts c ON l.cohort_id = c.id
       WHERE l.user_id = $1 AND c.advisor_id = $2`,
      [leave.user_id, req.user.userId]
    );
    return result.rows.length > 0;
  }

  return false;
}

async function review(req, res) {
  try {
    const { id } = req.params;
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const existing = await req.db.query('SELECT * FROM onec_leave_requests WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const leave = existing.rows[0];
    if (leave.status !== 'pending') return res.status(400).json({ error: 'This request has already been reviewed' });

    if (!(await canReview(req, leave))) {
      return res.status(403).json({ error: 'You are not authorized to review this request' });
    }

    const { status, review_note } = parsed.data;
    const result = await req.db.query(
      `UPDATE onec_leave_requests SET status = $1, review_note = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [status, review_note ?? null, req.user.userId, id]
    );
    logAudit(req, 'leave.reviewed', { leave_id: id, status });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Withdraw one's own request before anyone has acted on it — deliberately
// not a hard delete (status='cancelled' keeps it in the applicant's history).
async function cancel(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query(
      `UPDATE onec_leave_requests SET status = 'cancelled'
       WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING *`,
      [id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found, not yours, or already reviewed' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { create, listMine, list, review, cancel };
