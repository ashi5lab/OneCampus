const { z } = require('zod');

const ROSTER_TABLE = { instructor: 'onec_instructors', staff: 'onec_staff' };

const attendanceSchema = z.object({
  staff_role: z.enum(['instructor', 'staff']),
  roster_id: z.number().int(),
  date: z.string(), // YYYY-MM-DD
  status: z.enum(['present', 'absent', 'late', 'excused']),
  remarks: z.string().optional().nullable()
});

const NAME_JOIN = `
  LEFT JOIN onec_instructors i ON sa.staff_role = 'instructor' AND i.id = sa.roster_id
  LEFT JOIN onec_staff s ON sa.staff_role = 'staff' AND s.id = sa.roster_id
`;
const NAME_SELECT = `
  COALESCE(i.first_name, s.first_name) AS first_name,
  COALESCE(i.last_name, s.last_name) AS last_name,
  COALESCE(i.staff_id, s.staff_id) AS staff_id
`;

// GET / — roster-wide view (staff_attendance.view). ?date=/?staff_role=/
// ?roster_id= are independently optional filters.
async function getAll(req, res) {
  try {
    const { date, staff_role, roster_id } = req.query;
    const conditions = [];
    const params = [];

    if (date) {
      params.push(date);
      conditions.push(`sa.date = $${params.length}`);
    }
    if (staff_role) {
      params.push(staff_role);
      conditions.push(`sa.staff_role = $${params.length}`);
    }
    if (roster_id) {
      params.push(roster_id);
      conditions.push(`sa.roster_id = $${params.length}`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await req.db.query(
      `SELECT sa.*, ${NAME_SELECT}
       FROM onec_staff_attendance sa
       ${NAME_JOIN}
       ${where}
       ORDER BY sa.date DESC, sa.id DESC`,
      params
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /mine — the caller's own attendance history (staff_attendance.view_own).
// Only meaningful for a caller who actually has a login, which is exactly
// who's asking (they're authenticated) — matched via the nullable user_id
// column, not roster_id, since that's what ties a row back to "me".
async function listMine(req, res) {
  try {
    const result = await req.db.query(
      `SELECT sa.*, ${NAME_SELECT}
       FROM onec_staff_attendance sa
       ${NAME_JOIN}
       WHERE sa.user_id = $1
       ORDER BY sa.date DESC, sa.id DESC`,
      [req.user.userId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST / — mark/update one instructor or staff member's attendance for a
// date (staff_attendance.mark). Keyed on (staff_role, roster_id) rather
// than user_id — see the migration's comment: a bulk-uploaded instructor/
// staff member commonly has no login account at all, but still needs
// attendance to work. user_id is looked up and stored alongside purely so
// GET /mine can find these rows later, for whoever does have a login.
async function mark(req, res) {
  try {
    const parsed = attendanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { staff_role, roster_id, date, status, remarks } = parsed.data;
    const marked_by = req.user.userId;

    const rosterResult = await req.db.query(`SELECT user_id FROM ${ROSTER_TABLE[staff_role]} WHERE id = $1`, [roster_id]);
    if (rosterResult.rows.length === 0) {
      return res.status(400).json({ error: `No such ${staff_role} on record` });
    }
    const user_id = rosterResult.rows[0].user_id;

    const result = await req.db.query(
      `INSERT INTO onec_staff_attendance (staff_role, roster_id, user_id, date, status, remarks, marked_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (staff_role, roster_id, date) DO UPDATE SET status = $5, remarks = $6, marked_by = $7, user_id = $3
       RETURNING *`,
      [staff_role, roster_id, user_id, date, status, remarks ?? null, marked_by]
    );
    res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, listMine, mark };
