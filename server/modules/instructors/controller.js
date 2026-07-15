const { z } = require('zod');
const bcrypt = require('bcrypt');
const { logAudit } = require('../../lib/audit');
const { parsePagination } = require('../../lib/pagination');

const instructorCreateSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("A valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  staff_id: z.string().min(1, "Staff ID is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().optional().nullable(),
  meta: z.record(z.any()).optional().default({})
});

const instructorUpdateSchema = z.object({
  staff_id: z.string().min(1, "Staff ID is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().optional().nullable(),
  meta: z.record(z.any()).optional().default({})
});

// ?page=&pageSize= are optional — omitting both returns every row exactly
// as before pagination existed (see lib/pagination.js).
async function getAll(req, res) {
  try {
    const { pagination, error } = parsePagination(req.query);
    if (error) return res.status(400).json({ error: 'Invalid pagination parameters', details: error });

    if (!pagination) {
      const result = await req.db.query('SELECT * FROM onec_instructors ORDER BY id DESC');
      return res.json({ data: result.rows });
    }

    const [rows, count] = await Promise.all([
      req.db.query('SELECT * FROM onec_instructors ORDER BY id DESC LIMIT $1 OFFSET $2', [pagination.limit, pagination.offset]),
      req.db.query('SELECT COUNT(*)::int AS total FROM onec_instructors')
    ]);
    res.json({ data: rows.rows, meta: { total: count.rows[0].total, page: pagination.page, pageSize: pagination.pageSize } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('SELECT * FROM onec_instructors WHERE id = $1', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Creates the onec_users row and the onec_instructors row together, in one
// transaction, so the frontend never needs a pre-existing user id — this
// was previously the only way to create an instructor.
async function create(req, res) {
  try {
    const parsed = instructorCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { username, email, password, staff_id, first_name, last_name, phone, meta } = parsed.data;
    const password_hash = await bcrypt.hash(password, 10);

    await req.db.query('BEGIN');
    try {
      const userResult = await req.db.query(
        `INSERT INTO onec_users (username, email, password_hash, role) VALUES ($1, $2, $3, 'instructor') RETURNING id`,
        [username, email, password_hash]
      );
      const user_id = userResult.rows[0].id;

      const instructorResult = await req.db.query(
        `INSERT INTO onec_instructors (user_id, staff_id, first_name, last_name, phone, meta)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [user_id, staff_id, first_name, last_name, phone, meta]
      );

      await req.db.query('COMMIT');
      res.status(201).json({ data: instructorResult.rows[0] });
    } catch (err) {
      await req.db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Username, email, or staff ID is already in use' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const parsed = instructorUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { staff_id, first_name, last_name, phone, meta } = parsed.data;

    const result = await req.db.query(
      'UPDATE onec_instructors SET staff_id = $1, first_name = $2, last_name = $3, phone = $4, meta = $5 WHERE id = $6 RETURNING *',
      [staff_id, first_name, last_name, phone, meta, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Staff ID must be unique' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    const result = await req.db.query('DELETE FROM onec_instructors WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req, 'instructor.deleted', { instructor_id: result.rows[0].id, staff_id: result.rows[0].staff_id });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Aggregated "insights" view for a single instructor: base info plus
// lightweight activity stats. There's no per-instructor row-scoping concept
// in this app (unlike learners) — every role with instructors.view can see
// the roster already, and instructor is itself one of those roles, so no
// extra self-view bypass is needed here (contrast with learners.getProfile).
async function getProfile(req, res) {
  try {
    const { id } = req.params;

    const instructorResult = await req.db.query(
      `SELECT i.*, usr.email, usr.profile_picture_url
       FROM onec_instructors i
       LEFT JOIN onec_users usr ON i.user_id = usr.id
       WHERE i.id = $1`,
      [id]
    );
    if (instructorResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const instructor = instructorResult.rows[0];

    const [attendanceCount, scoresCount, recentAttendance] = await Promise.all([
      req.db.query('SELECT COUNT(*)::int AS count FROM onec_attendance WHERE marked_by = $1', [instructor.user_id]),
      req.db.query('SELECT COUNT(*)::int AS count FROM onec_learner_scores WHERE graded_by = $1', [instructor.user_id]),
      req.db.query(
        `SELECT a.id, a.date, a.status, l.first_name, l.last_name
         FROM onec_attendance a
         JOIN onec_learners l ON a.learner_id = l.id
         WHERE a.marked_by = $1
         ORDER BY a.date DESC LIMIT 10`,
        [instructor.user_id]
      )
    ]);

    res.json({
      data: {
        instructor,
        stats: {
          attendanceMarked: attendanceCount.rows[0].count,
          scoresGraded: scoresCount.rows[0].count
        },
        recentAttendance: recentAttendance.rows
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, getById, create, update, remove, getProfile };
