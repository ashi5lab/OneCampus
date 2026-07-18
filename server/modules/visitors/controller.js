const { z } = require('zod');
const { logAudit } = require('../../lib/audit');

const checkInSchema = z.object({
  visitor_name: z.string().min(1, 'Visitor name is required'),
  visitor_phone: z.string().optional().nullable(),
  purpose: z.string().min(1, 'Purpose is required'),
  host_name: z.string().min(1, 'Who they are visiting is required'),
  id_proof: z.string().optional().nullable()
});

// date filters to calendar-day of check_in_time (server-local date, same
// as every other date-only filter in this app — see the ::text casting
// note below for why we don't just compare against a DATE column).
async function getAll(req, res) {
  try {
    const { date, search } = req.query;
    const conditions = [];
    const params = [];

    if (date) {
      params.push(date);
      conditions.push(`v.check_in_time::date = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(v.visitor_name ILIKE $${params.length} OR v.host_name ILIKE $${params.length})`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await req.db.query(
      // check_in_time/check_out_time cast to text — node-postgres otherwise
      // parses TIMESTAMP columns into JS Date objects, which the frontend's
      // plain string handling doesn't expect (same pattern as every other
      // date/time column across this app's newer modules).
      `SELECT v.id, v.visitor_name, v.visitor_phone, v.purpose, v.host_name, v.id_proof,
              v.check_in_time::text AS check_in_time, v.check_out_time::text AS check_out_time,
              v.logged_by, u.username AS logged_by_username
       FROM onec_visitor_logs v
       LEFT JOIN onec_users u ON v.logged_by = u.id
       ${where}
       ORDER BY v.check_in_time DESC`,
      params
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function checkIn(req, res) {
  try {
    const parsed = checkInSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { visitor_name, visitor_phone, purpose, host_name, id_proof } = parsed.data;
    const logged_by = req.user.userId;

    const result = await req.db.query(
      `INSERT INTO onec_visitor_logs (visitor_name, visitor_phone, purpose, host_name, id_proof, logged_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, visitor_name, visitor_phone, purpose, host_name, id_proof,
                 check_in_time::text AS check_in_time, check_out_time::text AS check_out_time, logged_by`,
      [visitor_name, visitor_phone ?? null, purpose, host_name, id_proof ?? null, logged_by]
    );
    logAudit(req, 'visitors.checked_in', { visitor_log_id: result.rows[0].id, visitor_name });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function checkOut(req, res) {
  try {
    const { id } = req.params;
    const existing = await req.db.query('SELECT id, check_out_time FROM onec_visitor_logs WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (existing.rows[0].check_out_time) return res.status(409).json({ error: 'Visitor already checked out' });

    const result = await req.db.query(
      `UPDATE onec_visitor_logs SET check_out_time = CURRENT_TIMESTAMP WHERE id = $1
       RETURNING id, visitor_name, visitor_phone, purpose, host_name, id_proof,
                 check_in_time::text AS check_in_time, check_out_time::text AS check_out_time, logged_by`,
      [id]
    );
    logAudit(req, 'visitors.checked_out', { visitor_log_id: result.rows[0].id, visitor_name: result.rows[0].visitor_name });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, checkIn, checkOut };
