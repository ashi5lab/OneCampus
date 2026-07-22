const { z } = require('zod');
const { logAudit } = require('../../lib/audit');
const { getOwnLearnerId } = require('../../lib/ownLearner');
const { hasPermission } = require('../../lib/permissions');

const assignmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  module_id: z.number().int(),
  cohort_id: z.number().int(),
  due_date: z.string(), // YYYY-MM-DD
  max_score: z.number().default(100),
  publish_marks: z.boolean().optional()
});

const submissionSchema = z.object({
  submission_text: z.string().min(1, 'Submission text is required')
});

const gradeSchema = z.object({
  score_obtained: z.number(),
  feedback: z.string().optional().nullable()
});

// --- Assignments ---

// A learner sees only assignments for their own cohort — everyone else
// (admin/staff/instructor) sees every assignment tenant-wide. Not a
// security boundary (any authenticated user could learn their own cohort
// id anyway), just relevance filtering.
async function listAssignments(req, res) {
  try {
    let query = `SELECT a.*, m.name AS module_name, c.name AS cohort_name
                 FROM onec_assignments a
                 JOIN onec_modules m ON a.module_id = m.id
                 JOIN onec_cohorts c ON a.cohort_id = c.id`;
    const params = [];

    const hasClassView = await hasPermission(req, 'class.view');

    if (req.user.role === 'admin' || hasClassView) {
      // Admin or explicit class.view sees all assignments
    } else if (req.user.role === 'learner') {
      const ownLearnerId = await getOwnLearnerId(req);
      const cohortResult = ownLearnerId
        ? await req.db.query('SELECT cohort_id FROM onec_learners WHERE id = $1', [ownLearnerId])
        : { rows: [] };
      params.push(cohortResult.rows[0]?.cohort_id ?? -1);
      query += ' WHERE a.cohort_id = $1';
    } else if (req.user.role === 'instructor' && !req.tenantConfig.config?.rules?.global_teacher_visibility) {
      // Teachers only see their own classes unless global visibility is ON
      params.push(req.user.userId);
      query += ` WHERE a.created_by = $1 OR a.cohort_id IN (
        SELECT cohort_id FROM onec_instructor_cohorts ic
        JOIN onec_instructors i ON ic.instructor_id = i.id
        WHERE i.user_id = $1
      )`;
    }
    query += ' ORDER BY a.due_date DESC';

    const result = await req.db.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createAssignment(req, res) {
  try {
    const parsed = assignmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { title, description, module_id, cohort_id, due_date, max_score } = parsed.data;
    const result = await req.db.query(
      `INSERT INTO onec_assignments (title, description, module_id, cohort_id, due_date, max_score, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description ?? null, module_id, cohort_id, due_date, max_score, req.user.userId]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Module or cohort does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateAssignment(req, res) {
  try {
    const { id } = req.params;
    const parsed = assignmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { title, description, module_id, cohort_id, due_date, max_score, publish_marks } = parsed.data;

    // Access control: only admin or the creator can edit
    const existing = await req.db.query('SELECT created_by FROM onec_assignments WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && existing.rows[0].created_by !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to edit this assignment' });
    }

    const result = await req.db.query(
      `UPDATE onec_assignments SET title = $1, description = $2, module_id = $3, cohort_id = $4, due_date = $5, max_score = $6, publish_marks = COALESCE($7, publish_marks)
       WHERE id = $8 RETURNING *`,
      [title, description ?? null, module_id, cohort_id, due_date, max_score, publish_marks ?? null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteAssignment(req, res) {
  try {
    const { id } = req.params;

    // Access control: only admin or the creator can delete
    const existing = await req.db.query('SELECT created_by FROM onec_assignments WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && existing.rows[0].created_by !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this assignment' });
    }

    const result = await req.db.query('DELETE FROM onec_assignments WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req, 'assignment.deleted', { assignment_id: result.rows[0].id, title: result.rows[0].title });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- Submissions ---

async function listSubmissions(req, res) {
  try {
    const { id } = req.params;
    const role = req.user.role;
    const isGrader = role === 'admin' || role === 'staff' || role === 'instructor';

    let query = `SELECT s.*, l.first_name, l.last_name, l.registry_no
                 FROM onec_assignment_submissions s
                 JOIN onec_learners l ON s.learner_id = l.id
                 WHERE s.assignment_id = $1`;
    const params = [id];

    if (!isGrader) {
      const ownLearnerId = await getOwnLearnerId(req);
      params.push(ownLearnerId ?? -1);
      query += ' AND s.learner_id = $2';
    }
    query += ' ORDER BY s.submitted_at DESC NULLS LAST';

    const result = await req.db.query(query, params);

    // If it's a learner, check if marks are published. If not, hide them.
    if (!isGrader) {
      const assignRes = await req.db.query('SELECT publish_marks FROM onec_assignments WHERE id = $1', [id]);
      const publishMarks = assignRes.rows[0]?.publish_marks;
      if (!publishMarks) {
        result.rows.forEach(row => {
          row.score_obtained = null;
          row.feedback = null;
        });
      }
    }

    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Learner submits/updates their own submission — learner_id is resolved
// server-side from the caller's own record, never taken from the request
// body, so a learner can't submit on someone else's behalf. Upsert by
// (assignment_id, learner_id), same pattern as attendance's mark().
async function submit(req, res) {
  try {
    const { id } = req.params;
    const ownLearnerId = await getOwnLearnerId(req);
    if (!ownLearnerId) return res.status(403).json({ error: 'Only learners can submit assignments' });

    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const { submission_text } = parsed.data;

    const existing = await req.db.query(
      'SELECT id FROM onec_assignment_submissions WHERE assignment_id = $1 AND learner_id = $2',
      [id, ownLearnerId]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await req.db.query(
        'UPDATE onec_assignment_submissions SET submission_text = $1, submitted_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [submission_text, existing.rows[0].id]
      );
    } else {
      result = await req.db.query(
        `INSERT INTO onec_assignment_submissions (assignment_id, learner_id, submission_text, submitted_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING *`,
        [id, ownLearnerId, submission_text]
      );
    }
    res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Assignment does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function grade(req, res) {
  try {
    const { submissionId } = req.params;
    const parsed = gradeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { score_obtained, feedback } = parsed.data;
    const result = await req.db.query(
      `UPDATE onec_assignment_submissions
       SET score_obtained = $1, feedback = $2, graded_by = $3, graded_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [score_obtained, feedback ?? null, req.user.userId, submissionId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    logAudit(req, 'assignment.graded', { submission_id: result.rows[0].id, score_obtained });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  listSubmissions,
  submit,
  grade
};
