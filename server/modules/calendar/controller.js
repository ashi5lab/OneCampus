const { z } = require('zod');
const { logAudit } = require('../../lib/audit');

const EVENT_TYPES = ['event', 'holiday'];
const RECURRENCE_TYPES = ['weekly', 'monthly', 'yearly'];
const AUDIENCE_VALUES = ['all', 'instructors', 'learners', 'guardians'];
// Same pattern as server/modules/notices/controller.js — admin/staff manage
// the calendar so they see every entry regardless of audience.
const AUDIENCE_BY_ROLE = { instructor: 'instructors', learner: 'learners', guardian: 'guardians' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const eventSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().nullable(),
    event_type: z.enum(EVENT_TYPES).default('event'),
    start_date: z.string().regex(DATE_RE, 'Use YYYY-MM-DD'),
    end_date: z.string().regex(DATE_RE, 'Use YYYY-MM-DD').optional().nullable(),
    is_recurring: z.boolean().default(false),
    recurrence_type: z.enum(RECURRENCE_TYPES).optional().nullable(),
    // weekly: [0-6] weekday ints (0=Sunday); monthly: [1-31] day-of-month ints; yearly: ignored (repeats on start_date's month/day)
    recurrence_days: z.array(z.number().int()).optional().nullable(),
    recurrence_end_date: z.string().regex(DATE_RE, 'Use YYYY-MM-DD').optional().nullable(),
    audience: z.enum(AUDIENCE_VALUES).default('all')
  })
  .refine((d) => !d.is_recurring || !!d.recurrence_type, { message: 'Choose a recurrence pattern', path: ['recurrence_type'] })
  .refine((d) => !d.is_recurring || d.recurrence_type === 'yearly' || (d.recurrence_days && d.recurrence_days.length > 0), {
    message: 'Choose at least one day',
    path: ['recurrence_days']
  })
  .refine((d) => d.is_recurring || !d.end_date || d.end_date >= d.start_date, {
    message: 'End date must be on or after the start date',
    path: ['end_date']
  });

function audienceWhereClause(req, paramIndexStart, column = 'audience') {
  const role = req.user.role;
  if (role === 'admin' || role === 'staff') return { clause: '', params: [] };
  const group = AUDIENCE_BY_ROLE[role];
  if (!group) return { clause: ` AND ${column} = 'all'`, params: [] };
  return { clause: ` AND (${column} = 'all' OR ${column} = $${paramIndexStart})`, params: [group] };
}

async function listRaw(req, res) {
  try {
    const { clause, params } = audienceWhereClause(req, 1);
    const result = await req.db.query(
      // Date columns are cast to text — pg parses `date` columns into JS
      // Date objects by default, but the frontend (and expandOccurrences
      // below) expect plain 'YYYY-MM-DD' strings throughout.
      `SELECT ce.id, ce.title, ce.description, ce.event_type,
              ce.start_date::text AS start_date, ce.end_date::text AS end_date,
              ce.is_recurring, ce.recurrence_type, ce.recurrence_days,
              ce.recurrence_end_date::text AS recurrence_end_date,
              ce.audience, ce.created_by, ce.created_at, u.username AS created_by_username
       FROM onec_calendar_events ce
       LEFT JOIN onec_users u ON ce.created_by = u.id
       WHERE true${clause}
       ORDER BY ce.start_date DESC`,
      params
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function create(req, res) {
  try {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const d = parsed.data;

    const result = await req.db.query(
      `INSERT INTO onec_calendar_events
         (title, description, event_type, start_date, end_date, is_recurring, recurrence_type, recurrence_days, recurrence_end_date, audience, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        d.title,
        d.description ?? null,
        d.event_type,
        d.start_date,
        d.is_recurring ? null : d.end_date ?? null,
        d.is_recurring,
        d.is_recurring ? d.recurrence_type : null,
        d.is_recurring ? JSON.stringify(d.recurrence_days ?? []) : null,
        d.is_recurring ? d.recurrence_end_date ?? null : null,
        d.audience,
        req.user.userId
      ]
    );
    logAudit(req, 'calendar.event_created', { event_id: result.rows[0].id, title: d.title, event_type: d.event_type });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;

    // Access control: only admin or the creator can edit
    const existing = await req.db.query('SELECT created_by FROM onec_calendar_events WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && existing.rows[0].created_by !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to edit this event' });
    }

    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const d = parsed.data;

    const result = await req.db.query(
      `UPDATE onec_calendar_events SET
         title = $1, description = $2, event_type = $3, start_date = $4, end_date = $5,
         is_recurring = $6, recurrence_type = $7, recurrence_days = $8, recurrence_end_date = $9, audience = $10
       WHERE id = $11 RETURNING *`,
      [
        d.title,
        d.description ?? null,
        d.event_type,
        d.start_date,
        d.is_recurring ? null : d.end_date ?? null,
        d.is_recurring,
        d.is_recurring ? d.recurrence_type : null,
        d.is_recurring ? JSON.stringify(d.recurrence_days ?? []) : null,
        d.is_recurring ? d.recurrence_end_date ?? null : null,
        d.audience,
        id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    // Access control: only admin or the creator can delete
    const existing = await req.db.query('SELECT created_by FROM onec_calendar_events WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && existing.rows[0].created_by !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this event' });
    }

    const result = await req.db.query('DELETE FROM onec_calendar_events WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req, 'calendar.event_deleted', { event_id: result.rows[0].id, title: result.rows[0].title });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- Recurrence expansion (rule -> concrete occurrences within a range) ---
// Stored as a rule, not materialized rows, so editing "every Sunday" once
// updates every future Sunday instead of needing to touch N rows.

const LOOKAHEAD_CAP_DAYS = 730; // ~2 years, used when recurrence_end_date is null

function parseDate(s) {
  return new Date(`${s}T00:00:00Z`);
}
function toISO(date) {
  return date.toISOString().slice(0, 10);
}
function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function expandOccurrences(event, rangeStart, rangeEnd) {
  const occurrences = [];
  const eventStart = parseDate(event.start_date);

  if (!event.is_recurring) {
    const eventEnd = event.end_date ? parseDate(event.end_date) : eventStart;
    if (eventEnd >= rangeStart && eventStart <= rangeEnd) {
      occurrences.push({ date: event.start_date, endDate: event.end_date || event.start_date });
    }
    return occurrences;
  }

  const ruleEnd = event.recurrence_end_date ? parseDate(event.recurrence_end_date) : addDays(rangeStart, LOOKAHEAD_CAP_DAYS);
  const windowStart = eventStart > rangeStart ? eventStart : rangeStart;
  const windowEnd = ruleEnd < rangeEnd ? ruleEnd : rangeEnd;
  if (windowStart > windowEnd) return occurrences;

  if (event.recurrence_type === 'weekly') {
    const days = new Set(event.recurrence_days || []);
    for (let d = new Date(windowStart); d <= windowEnd; d = addDays(d, 1)) {
      if (days.has(d.getUTCDay())) occurrences.push({ date: toISO(d), endDate: toISO(d) });
    }
  } else if (event.recurrence_type === 'monthly') {
    const days = new Set(event.recurrence_days || []);
    for (let d = new Date(windowStart); d <= windowEnd; d = addDays(d, 1)) {
      if (days.has(d.getUTCDate())) occurrences.push({ date: toISO(d), endDate: toISO(d) });
    }
  } else if (event.recurrence_type === 'yearly') {
    const month = eventStart.getUTCMonth();
    const day = eventStart.getUTCDate();
    for (let year = windowStart.getUTCFullYear(); year <= windowEnd.getUTCFullYear(); year++) {
      const occ = new Date(Date.UTC(year, month, day));
      if (occ >= windowStart && occ <= windowEnd) occurrences.push({ date: toISO(occ), endDate: toISO(occ) });
    }
  }

  return occurrences;
}

// The main calendar view — every own event/holiday occurrence in range,
// PLUS notices/exam schedules/assignment due dates, normalized into one
// shape so the frontend can render a single unified calendar ("easy to see
// events and schedules, exams, notices etc." per spec) instead of
// stitching together four separate API calls itself.
async function getAgenda(req, res) {
  try {
    const { from, to } = req.query;
    if (!from || !DATE_RE.test(from) || !to || !DATE_RE.test(to)) {
      return res.status(400).json({ error: 'from and to (YYYY-MM-DD) are required' });
    }
    const rangeStart = parseDate(from);
    const rangeEnd = parseDate(to);
    if (rangeEnd < rangeStart) return res.status(400).json({ error: 'to must be on or after from' });

    const audienceFilter = audienceWhereClause(req, 3);

    const [calendarRows, noticeRows, examRows, assignmentRows] = await Promise.all([
      req.db.query(
        // Date columns cast to text — see the comment on listRaw's query;
        // expandOccurrences below assumes start_date/end_date/
        // recurrence_end_date are strings, not pg's parsed Date objects.
        `SELECT id, title, description, event_type,
                start_date::text AS start_date, end_date::text AS end_date,
                is_recurring, recurrence_type, recurrence_days,
                recurrence_end_date::text AS recurrence_end_date,
                audience, created_by, created_at
         FROM onec_calendar_events
         WHERE (
           (is_recurring = false AND start_date <= $2 AND COALESCE(end_date, start_date) >= $1)
           OR (is_recurring = true AND start_date <= $2 AND (recurrence_end_date IS NULL OR recurrence_end_date >= $1))
         )${audienceFilter.clause}`,
        [from, to, ...audienceFilter.params]
      ),
      req.db.query(
        `SELECT id, title, created_at::date::text AS date FROM onec_notices
         WHERE created_at::date BETWEEN $1 AND $2${audienceFilter.clause}`,
        [from, to, ...audienceFilter.params]
      ),
      req.db.query(
        `SELECT es.id, es.eval_date::text AS date, ev.name AS evaluation_name, ev.type AS evaluation_type, m.name AS module_name
         FROM onec_evaluation_schedules es
         JOIN onec_evaluations ev ON es.evaluation_id = ev.id
         JOIN onec_modules m ON es.module_id = m.id
         WHERE es.eval_date BETWEEN $1 AND $2`,
        [from, to]
      ),
      req.db.query(
        `SELECT a.id, a.title, a.due_date::text AS date, m.name AS module_name, c.name AS cohort_name
         FROM onec_assignments a
         JOIN onec_modules m ON a.module_id = m.id
         JOIN onec_cohorts c ON a.cohort_id = c.id
         WHERE a.due_date BETWEEN $1 AND $2`,
        [from, to]
      )
    ]);

    const items = [];

    for (const event of calendarRows.rows) {
      for (const occ of expandOccurrences(event, rangeStart, rangeEnd)) {
        items.push({
          source: 'calendar',
          type: event.event_type,
          id: `calendar-${event.id}-${occ.date}`,
          eventId: event.id,
          title: event.title,
          description: event.description,
          date: occ.date,
          endDate: occ.endDate
        });
      }
    }
    for (const notice of noticeRows.rows) {
      items.push({ source: 'notice', type: 'notice', id: `notice-${notice.id}`, title: notice.title, date: notice.date, endDate: notice.date });
    }
    for (const exam of examRows.rows) {
      items.push({
        source: 'exam',
        type: 'exam',
        id: `exam-${exam.id}`,
        title: `${exam.evaluation_name} — ${exam.module_name}`,
        date: exam.date,
        endDate: exam.date
      });
    }
    for (const assignment of assignmentRows.rows) {
      items.push({
        source: 'assignment',
        type: 'assignment',
        id: `assignment-${assignment.id}`,
        title: `${assignment.title} (${assignment.module_name} — ${assignment.cohort_name})`,
        date: assignment.date,
        endDate: assignment.date
      });
    }

    items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    res.json({ data: items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { listRaw, create, update, remove, getAgenda };
