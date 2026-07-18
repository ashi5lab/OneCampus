const { z } = require('zod');
const { logAudit } = require('../../lib/audit');
const { computeCoverageForLeave } = require('../../lib/substituteCoverage');

const assignSchema = z.object({
  leave_request_id: z.number().int(),
  allocation_id: z.number().int(),
  date: z.string(), // YYYY-MM-DD
  substitute_instructor_id: z.number().int()
});

// GET /coverage/:leaveRequestId — every (period, date) that needs covering
// for an approved instructor leave, and whichever of those already has a
// substitute assigned. See server/lib/substituteCoverage.js.
async function getCoverage(req, res) {
  try {
    const { leaveRequestId } = req.params;
    const coverage = await computeCoverageForLeave(req, leaveRequestId);
    if (!coverage) {
      return res.status(404).json({ error: 'Leave request not found, not an instructor leave, or not yet approved' });
    }
    res.json({ data: coverage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST / — assign (or replace) a substitute for one specific period+date.
async function assign(req, res) {
  try {
    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const { leave_request_id, allocation_id, date, substitute_instructor_id } = parsed.data;

    // A substitute can't be the same instructor who's on leave for that
    // period — the whole point of assigning one.
    const allocationResult = await req.db.query('SELECT instructor_id FROM onec_allocations WHERE id = $1', [allocation_id]);
    if (allocationResult.rows.length === 0) return res.status(400).json({ error: 'Period does not exist' });
    if (allocationResult.rows[0].instructor_id === substitute_instructor_id) {
      return res.status(400).json({ error: "The substitute can't be the instructor who's on leave" });
    }

    const result = await req.db.query(
      `INSERT INTO onec_substitute_assignments (leave_request_id, allocation_id, date, substitute_instructor_id, assigned_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (allocation_id, date) DO UPDATE SET substitute_instructor_id = $4, leave_request_id = $1, assigned_by = $5
       RETURNING *`,
      [leave_request_id, allocation_id, date, substitute_instructor_id, req.user.userId]
    );
    logAudit(req, 'substitute.assigned', { allocation_id, date, substitute_instructor_id, leave_request_id });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Leave request, period, or substitute instructor does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function unassign(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('DELETE FROM onec_substitute_assignments WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req, 'substitute.unassigned', { assignment_id: id });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getCoverage, assign, unassign };
