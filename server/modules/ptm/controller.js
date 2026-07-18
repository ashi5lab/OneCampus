const { z } = require('zod');
const { logAudit } = require('../../lib/audit');
const { hasPermission } = require('../../lib/permissions');
const { getScopedLearnerIds } = require('../../lib/rowScope');

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const slotSchema = z
  .object({
    instructor_id: z.number().int(),
    slot_date: z.string().regex(DATE_RE, 'Use YYYY-MM-DD'),
    start_time: z.string().regex(TIME_RE, 'Use HH:MM'),
    end_time: z.string().regex(TIME_RE, 'Use HH:MM'),
    cohort_id: z.number().int().optional().nullable()
  })
  .refine((d) => d.end_time > d.start_time, { message: 'End time must be after start time', path: ['end_time'] });

const bookSchema = z.object({
  learner_id: z.number().int(),
  notes: z.string().optional().nullable()
});

// A slot can be authored either by anyone with ptm.manage (admin/staff), or
// by the instructor it belongs to acting on their own availability — same
// self-or-permission shape as timetable's instructor_id ownership checks.
async function canManageSlot(req, instructorId) {
  if (await hasPermission(req, 'ptm.manage')) return true;
  if (req.user.role !== 'instructor') return false;
  const result = await req.db.query('SELECT 1 FROM onec_instructors WHERE id = $1 AND user_id = $2', [
    instructorId,
    req.user.userId
  ]);
  return result.rows.length > 0;
}

// GET /slots?date=&instructor_id= — every slot with whatever booking (if
// any) currently occupies it, so the frontend can render "open" vs. "booked
// by X" without a second round trip.
async function listSlots(req, res) {
  try {
    const { date, instructor_id } = req.query;
    const conditions = [];
    const params = [];
    if (date) {
      params.push(date);
      conditions.push(`s.slot_date = $${params.length}`);
    }
    if (instructor_id) {
      params.push(instructor_id);
      conditions.push(`s.instructor_id = $${params.length}`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await req.db.query(
      `SELECT s.id, s.instructor_id, s.slot_date::text AS slot_date,
              s.start_time::text AS start_time, s.end_time::text AS end_time, s.cohort_id,
              i.first_name AS instructor_first_name, i.last_name AS instructor_last_name,
              c.name AS cohort_name,
              b.id AS booking_id, b.learner_id, b.notes AS booking_notes,
              l.first_name AS learner_first_name, l.last_name AS learner_last_name
       FROM onec_ptm_slots s
       JOIN onec_instructors i ON s.instructor_id = i.id
       LEFT JOIN onec_cohorts c ON s.cohort_id = c.id
       LEFT JOIN onec_ptm_bookings b ON b.slot_id = s.id
       LEFT JOIN onec_learners l ON b.learner_id = l.id
       ${where}
       ORDER BY s.slot_date ASC, s.start_time ASC`,
      params
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createSlot(req, res) {
  try {
    const parsed = slotSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const d = parsed.data;

    if (!(await canManageSlot(req, d.instructor_id))) {
      return res.status(403).json({ error: 'You can only open slots on your own availability' });
    }

    const result = await req.db.query(
      `INSERT INTO onec_ptm_slots (instructor_id, slot_date, start_time, end_time, cohort_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [d.instructor_id, d.slot_date, d.start_time, d.end_time, d.cohort_id ?? null, req.user.userId]
    );
    logAudit(req, 'ptm.slot_created', { slot_id: result.rows[0].id, instructor_id: d.instructor_id, slot_date: d.slot_date });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Instructor or class does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function removeSlot(req, res) {
  try {
    const { id } = req.params;
    const existing = await req.db.query('SELECT instructor_id FROM onec_ptm_slots WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    if (!(await canManageSlot(req, existing.rows[0].instructor_id))) {
      return res.status(403).json({ error: 'You can only remove slots on your own availability' });
    }

    const result = await req.db.query('DELETE FROM onec_ptm_slots WHERE id = $1 RETURNING *', [id]);
    logAudit(req, 'ptm.slot_removed', { slot_id: id });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /slots/:id/book — row-scoped like every other learner-facing
// endpoint (lib/rowScope.js): a learner books for themselves, a guardian
// for one of their linked children. Rejects (409) a slot that's already
// taken — UNIQUE(slot_id) is the actual source of truth here (a race
// between two families booking the same slot resolves to whichever INSERT
// wins; the loser gets this same 409, not a corrupted double-booking).
async function bookSlot(req, res) {
  try {
    const { id } = req.params;
    const parsed = bookSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const { learner_id, notes } = parsed.data;

    const scopedLearnerIds = await getScopedLearnerIds(req);
    if (scopedLearnerIds !== null && !scopedLearnerIds.includes(learner_id)) {
      return res.status(403).json({ error: 'You can only book on behalf of your own child' });
    }

    const slotResult = await req.db.query('SELECT id FROM onec_ptm_slots WHERE id = $1', [id]);
    if (slotResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const result = await req.db.query(
      `INSERT INTO onec_ptm_bookings (slot_id, learner_id, booked_by, notes) VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, learner_id, req.user.userId, notes ?? null]
    );
    logAudit(req, 'ptm.slot_booked', { slot_id: id, learner_id });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ error: 'This slot has already been booked' });
    if (err.code === '23503') return res.status(400).json({ error: 'Slot or learner does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// DELETE /bookings/:id — the family who booked it can cancel, or anyone
// with ptm.manage (e.g. the school needs to free up a slot administratively).
async function cancelBooking(req, res) {
  try {
    const { id } = req.params;
    const existing = await req.db.query('SELECT learner_id FROM onec_ptm_bookings WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const canManageAny = await hasPermission(req, 'ptm.manage');
    if (!canManageAny) {
      const scopedLearnerIds = await getScopedLearnerIds(req);
      if (scopedLearnerIds === null || !scopedLearnerIds.includes(existing.rows[0].learner_id)) {
        return res.status(403).json({ error: 'You can only cancel your own booking' });
      }
    }

    const result = await req.db.query('DELETE FROM onec_ptm_bookings WHERE id = $1 RETURNING *', [id]);
    logAudit(req, 'ptm.booking_cancelled', { booking_id: id });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /my-learners — the caller's own bookable learner(s): themselves (if
// a learner) or their linked children (if a guardian) — just enough (id +
// name) to populate the booking form's "which child" picker without
// requiring the broader learners.view permission a plain guardian doesn't
// have.
async function myLearners(req, res) {
  try {
    const scopedLearnerIds = await getScopedLearnerIds(req);
    if (!scopedLearnerIds || scopedLearnerIds.length === 0) return res.json({ data: [] });

    const result = await req.db.query(
      'SELECT id, first_name, last_name FROM onec_learners WHERE id = ANY($1) ORDER BY first_name',
      [scopedLearnerIds]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { listSlots, createSlot, removeSlot, bookSlot, cancelBooking, myLearners };
