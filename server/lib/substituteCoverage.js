const { DAY_NAMES } = require('../modules/timetable/controller');

const MAX_DAYS = 60; // a leave request this long would be unusual; guards against a pathological date range

function parseDateOnly(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function formatDateOnly(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Every calendar date in [startStr, endStr], inclusive, as 'YYYY-MM-DD'
// strings — built entirely in UTC so DST/local-timezone shifts can never
// knock a date off by one, since only the calendar date (not a real moment
// in time) matters here.
function eachDateInRange(startStr, endStr) {
  const dates = [];
  let cursor = parseDateOnly(startStr);
  const end = parseDateOnly(endStr);
  while (cursor <= end && dates.length < MAX_DAYS) {
    dates.push(formatDateOnly(cursor));
    cursor += 24 * 60 * 60 * 1000;
  }
  return dates;
}

// For an approved instructor leave, works out every (allocation, date) pair
// that falls within the leave's date range and needs — or already has — a
// substitute. Returns null if the leave isn't found, isn't an instructor's,
// or isn't approved (a substitute only makes sense once leave is actually
// granted, not while still pending/rejected).
async function computeCoverageForLeave(req, leaveRequestId) {
  const leaveResult = await req.db.query(
    `SELECT id, user_id, applicant_role, status, start_date::text AS start_date, end_date::text AS end_date
     FROM onec_leave_requests WHERE id = $1`,
    [leaveRequestId]
  );
  const leave = leaveResult.rows[0];
  if (!leave || leave.applicant_role !== 'instructor' || leave.status !== 'approved') return null;

  const instructorResult = await req.db.query('SELECT id FROM onec_instructors WHERE user_id = $1', [leave.user_id]);
  const instructorId = instructorResult.rows[0]?.id;
  if (!instructorId) return { leave, periods: [] };

  const allocationsResult = await req.db.query(
    `SELECT a.id, a.schedule_data, a.start_date::text AS start_date, a.end_date::text AS end_date,
            m.name AS module_name, c.name AS cohort_name
     FROM onec_allocations a
     JOIN onec_modules m ON a.module_id = m.id
     JOIN onec_cohorts c ON a.cohort_id = c.id
     WHERE a.instructor_id = $1`,
    [instructorId]
  );

  const periods = [];
  for (const date of eachDateInRange(leave.start_date, leave.end_date)) {
    const weekday = DAY_NAMES[new Date(parseDateOnly(date)).getUTCDay()];
    for (const alloc of allocationsResult.rows) {
      const days = alloc.schedule_data?.days || [];
      if (!days.includes(weekday)) continue;
      if (alloc.start_date && date < alloc.start_date) continue;
      if (alloc.end_date && date > alloc.end_date) continue;

      periods.push({
        allocation_id: alloc.id,
        date,
        weekday,
        hour: alloc.schedule_data?.hour || '',
        module_name: alloc.module_name,
        cohort_name: alloc.cohort_name,
        substitute: null
      });
    }
  }
  periods.sort((a, b) => (a.date === b.date ? a.hour.localeCompare(b.hour) : a.date.localeCompare(b.date)));

  if (periods.length > 0) {
    const assignmentsResult = await req.db.query(
      `SELECT sa.id, sa.allocation_id, sa.date::text AS date, sa.substitute_instructor_id,
              i.first_name AS substitute_first_name, i.last_name AS substitute_last_name
       FROM onec_substitute_assignments sa
       JOIN onec_instructors i ON sa.substitute_instructor_id = i.id
       WHERE sa.leave_request_id = $1`,
      [leaveRequestId]
    );
    const byKey = new Map(assignmentsResult.rows.map((row) => [`${row.allocation_id}-${row.date}`, row]));
    for (const period of periods) {
      const assignment = byKey.get(`${period.allocation_id}-${period.date}`);
      if (assignment) {
        period.substitute = {
          assignment_id: assignment.id,
          instructor_id: assignment.substitute_instructor_id,
          first_name: assignment.substitute_first_name,
          last_name: assignment.substitute_last_name
        };
      }
    }
  }

  return { leave, periods };
}

module.exports = { computeCoverageForLeave };
