const { z } = require('zod');
const { logAudit } = require('../../lib/audit');
const { getOwnLearnerId } = require('../../lib/ownLearner');
const { hasPermission } = require('../../lib/permissions');

const questionSchema = z.object({
  question_text: z.string().min(1, 'Question text is required'),
  question_type: z.enum(['mcq', 'text']).default('text'),
  options: z.array(z.string().min(1)).optional().nullable(),
  correct_option: z.number().int().optional().nullable(),
  max_score: z.number().positive().default(1)
});

const examSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().nullable(),
    module_id: z.number().int(),
    cohort_id: z.number().int(),
    grading_type: z.enum(['manual', 'auto']).default('manual'),
    duration_minutes: z.number().int().positive().default(60),
    questions: z.array(questionSchema).min(1, 'At least one question is required')
  })
  // Auto-grading only makes sense when every question has a machine-checkable
  // answer key — mixing in a free-text question would leave it permanently
  // unscored since there's no grader step for an 'auto' exam.
  .refine(
    (data) =>
      data.grading_type !== 'auto' ||
      data.questions.every(
        (q) =>
          q.question_type === 'mcq' &&
          Array.isArray(q.options) &&
          q.options.length >= 2 &&
          Number.isInteger(q.correct_option) &&
          q.correct_option >= 0 &&
          q.correct_option < q.options.length
      ),
    { message: 'Auto-graded exams require every question to be MCQ with options and a valid correct answer', path: ['questions'] }
  );

const answerSchema = z.object({
  question_id: z.number().int(),
  answer_text: z.string().optional().nullable(),
  selected_option: z.number().int().optional().nullable()
});
const submitSchema = z.object({ answers: z.array(answerSchema) });

const gradeSchema = z.object({
  scores: z
    .array(
      z.object({
        question_id: z.number().int(),
        score_obtained: z.number(),
        feedback: z.string().optional().nullable()
      })
    )
    .min(1)
});

const publishSchema = z.object({ published: z.boolean() });

const GRADER_ROLES = ['admin', 'staff', 'instructor'];

async function insertQuestions(req, examId, questions) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await req.db.query(
      `INSERT INTO onec_exam_questions (exam_id, question_text, question_type, options, correct_option, max_score, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        examId,
        q.question_text,
        q.question_type,
        q.question_type === 'mcq' ? JSON.stringify(q.options ?? []) : null,
        q.question_type === 'mcq' ? q.correct_option ?? null : null,
        q.max_score,
        i
      ]
    );
  }
}

// --- Exams ---

// Same relevance-filtering pattern as assignments: a learner sees only
// exams for their own cohort, plus their own submission status/score so the
// list page can show "Start" / "Continue" / "View Results" appropriately.
async function listExams(req, res) {
  try {
    let query = `SELECT e.*, m.name AS module_name, c.name AS cohort_name,
                   (SELECT COUNT(*) FROM onec_exam_questions q WHERE q.exam_id = e.id) AS question_count`;
    const params = [];

    const hasClassView = await hasPermission(req, 'class.view');

    if (req.user.role === 'admin' || hasClassView) {
      query += ` FROM onec_online_exams e
                 JOIN onec_modules m ON e.module_id = m.id
                 JOIN onec_cohorts c ON e.cohort_id = c.id`;
    } else if (req.user.role === 'learner') {
      const ownLearnerId = await getOwnLearnerId(req);
      const cohortResult = ownLearnerId
        ? await req.db.query('SELECT cohort_id FROM onec_learners WHERE id = $1', [ownLearnerId])
        : { rows: [] };
      params.push(cohortResult.rows[0]?.cohort_id ?? -1, ownLearnerId ?? -1);
      query += `, s.status AS my_status, s.total_score AS my_score
                 FROM onec_online_exams e
                 JOIN onec_modules m ON e.module_id = m.id
                 JOIN onec_cohorts c ON e.cohort_id = c.id
                 LEFT JOIN onec_exam_submissions s ON s.exam_id = e.id AND s.learner_id = $2
                 WHERE e.cohort_id = $1`;
    } else if (req.user.role === 'instructor' && !req.tenantConfig.config?.rules?.global_teacher_visibility) {
      params.push(req.user.userId);
      query += ` FROM onec_online_exams e
                 JOIN onec_modules m ON e.module_id = m.id
                 JOIN onec_cohorts c ON e.cohort_id = c.id
                 WHERE e.created_by = $1 OR e.cohort_id IN (
                   SELECT cohort_id FROM onec_instructor_cohorts ic
                   JOIN onec_instructors i ON ic.instructor_id = i.id
                   WHERE i.user_id = $1
                 )`;
    }
    query += ' ORDER BY e.created_at DESC';

    const result = await req.db.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// correct_option is stripped for non-graders — an exam-taker's own network
// tab shouldn't reveal the answer key before (or after) they submit.
async function getExam(req, res) {
  try {
    const { id } = req.params;
    const isGrader = GRADER_ROLES.includes(req.user.role);

    const examResult = await req.db.query(
      `SELECT e.*, m.name AS module_name, c.name AS cohort_name
       FROM onec_online_exams e
       JOIN onec_modules m ON e.module_id = m.id
       JOIN onec_cohorts c ON e.cohort_id = c.id
       WHERE e.id = $1`,
      [id]
    );
    if (examResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const questionsResult = await req.db.query(
      'SELECT * FROM onec_exam_questions WHERE exam_id = $1 ORDER BY order_index ASC',
      [id]
    );
    const questions = questionsResult.rows.map((q) => (isGrader ? q : { ...q, correct_option: null }));

    res.json({ data: { ...examResult.rows[0], questions } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createExam(req, res) {
  try {
    const parsed = examSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const { title, description, module_id, cohort_id, grading_type, duration_minutes, questions } = parsed.data;
    const maxScore = questions.reduce((sum, q) => sum + q.max_score, 0);

    await req.db.query('BEGIN');
    try {
      const examResult = await req.db.query(
        `INSERT INTO onec_online_exams (title, description, module_id, cohort_id, grading_type, duration_minutes, max_score, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [title, description ?? null, module_id, cohort_id, grading_type, duration_minutes, maxScore, req.user.userId]
      );
      const exam = examResult.rows[0];
      await insertQuestions(req, exam.id, questions);
      await req.db.query('COMMIT');
      res.status(201).json({ data: exam });
    } catch (err) {
      await req.db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Module or cohort does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// If learners have already started submitting, replacing the question set
// would cascade-delete their in-progress/graded answers (onec_exam_questions
// -> onec_exam_answers is ON DELETE CASCADE). To avoid silently destroying
// that data, once a submission exists this only updates exam metadata —
// questions become frozen; delete and recreate the exam instead.
async function updateExam(req, res) {
  try {
    const { id } = req.params;
    const parsed = examSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const { title, description, module_id, cohort_id, grading_type, duration_minutes, questions } = parsed.data;

    const submissionCount = await req.db.query('SELECT COUNT(*) FROM onec_exam_submissions WHERE exam_id = $1', [id]);
    const hasSubmissions = Number(submissionCount.rows[0].count) > 0;

    // Access control: only admin or the creator can edit
    const existing = await req.db.query('SELECT created_by FROM onec_online_exams WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && existing.rows[0].created_by !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to edit this exam' });
    }

    if (hasSubmissions) {
      const result = await req.db.query(
        `UPDATE onec_online_exams SET title = $1, description = $2, module_id = $3, cohort_id = $4, duration_minutes = $5
         WHERE id = $6 RETURNING *`,
        [title, description ?? null, module_id, cohort_id, duration_minutes, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json({ data: result.rows[0], questionsLocked: true });
    }

    const maxScore = questions.reduce((sum, q) => sum + q.max_score, 0);
    await req.db.query('BEGIN');
    try {
      const result = await req.db.query(
        `UPDATE onec_online_exams SET title = $1, description = $2, module_id = $3, cohort_id = $4, grading_type = $5, duration_minutes = $6, max_score = $7
         WHERE id = $8 RETURNING *`,
        [title, description ?? null, module_id, cohort_id, grading_type, duration_minutes, maxScore, id]
      );
      if (result.rows.length === 0) {
        await req.db.query('ROLLBACK');
        return res.status(404).json({ error: 'Not found' });
      }
      await req.db.query('DELETE FROM onec_exam_questions WHERE exam_id = $1', [id]);
      await insertQuestions(req, id, questions);
      await req.db.query('COMMIT');
      res.json({ data: result.rows[0] });
    } catch (err) {
      await req.db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteExam(req, res) {
  try {
    const { id } = req.params;

    // Access control: only admin or the creator can delete
    const existing = await req.db.query('SELECT created_by FROM onec_online_exams WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && existing.rows[0].created_by !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this exam' });
    }

    const result = await req.db.query('DELETE FROM onec_online_exams WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    logAudit(req, 'online_exam.deleted', { exam_id: result.rows[0].id, title: result.rows[0].title });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function setPublished(req, res) {
  try {
    const { id } = req.params;
    const parsed = publishSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const result = await req.db.query(
      `UPDATE onec_online_exams SET published = $1, published_at = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE NULL END
       WHERE id = $2 RETURNING *`,
      [parsed.data.published, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    logAudit(req, parsed.data.published ? 'online_exam.published' : 'online_exam.unpublished', { exam_id: result.rows[0].id });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- Taking an exam (learner side) ---

// Idempotent "start" — the ON CONFLICT DO UPDATE is a no-op write (sets
// exam_id to its own value) purely so RETURNING always yields the row,
// whether this is a fresh start or the learner is resuming.
async function startSubmission(req, res) {
  try {
    const { id } = req.params;
    const ownLearnerId = await getOwnLearnerId(req);
    if (!ownLearnerId) return res.status(403).json({ error: 'Only learners can take exams' });

    const examResult = await req.db.query('SELECT id FROM onec_online_exams WHERE id = $1', [id]);
    if (examResult.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });

    const result = await req.db.query(
      `INSERT INTO onec_exam_submissions (exam_id, learner_id, status, started_at)
       VALUES ($1, $2, 'in_progress', CURRENT_TIMESTAMP)
       ON CONFLICT (exam_id, learner_id) DO UPDATE SET exam_id = EXCLUDED.exam_id
       RETURNING *`,
      [id, ownLearnerId]
    );
    res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Score/feedback and the answer key are only revealed once the exam is
// published — before that, a learner just sees their submission status.
async function getMySubmission(req, res) {
  try {
    const { id } = req.params;
    const ownLearnerId = await getOwnLearnerId(req);
    if (!ownLearnerId) return res.status(403).json({ error: 'Only learners have exam submissions' });

    const examResult = await req.db.query('SELECT id, title, published, grading_type, max_score FROM onec_online_exams WHERE id = $1', [id]);
    if (examResult.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
    const exam = examResult.rows[0];

    const submissionResult = await req.db.query(
      'SELECT * FROM onec_exam_submissions WHERE exam_id = $1 AND learner_id = $2',
      [id, ownLearnerId]
    );
    if (submissionResult.rows.length === 0) return res.json({ data: { exam, submission: null, answers: [] } });
    const submission = submissionResult.rows[0];

    const answersResult = await req.db.query(
      `SELECT a.question_id, a.answer_text, a.selected_option,
              q.question_text, q.question_type, q.options, q.max_score, q.order_index,
              CASE WHEN $2 THEN a.score_obtained ELSE NULL END AS score_obtained,
              CASE WHEN $2 THEN a.feedback ELSE NULL END AS feedback
       FROM onec_exam_answers a
       JOIN onec_exam_questions q ON a.question_id = q.id
       WHERE a.submission_id = $1
       ORDER BY q.order_index ASC`,
      [submission.id, exam.published]
    );

    res.json({
      data: {
        exam,
        submission: exam.published ? submission : { ...submission, total_score: null },
        answers: answersResult.rows
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function submitAnswers(req, res) {
  try {
    const { id } = req.params;
    const ownLearnerId = await getOwnLearnerId(req);
    if (!ownLearnerId) return res.status(403).json({ error: 'Only learners can submit exams' });

    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const submissionResult = await req.db.query(
      'SELECT * FROM onec_exam_submissions WHERE exam_id = $1 AND learner_id = $2',
      [id, ownLearnerId]
    );
    if (submissionResult.rows.length === 0) return res.status(400).json({ error: 'Start the exam before submitting' });
    const submission = submissionResult.rows[0];
    if (submission.status !== 'in_progress') return res.status(400).json({ error: 'This exam has already been submitted' });

    const examResult = await req.db.query('SELECT grading_type FROM onec_online_exams WHERE id = $1', [id]);
    const gradingType = examResult.rows[0]?.grading_type;

    const questionsResult = await req.db.query('SELECT id, correct_option, max_score FROM onec_exam_questions WHERE exam_id = $1', [id]);
    const questionsById = new Map(questionsResult.rows.map((q) => [q.id, q]));

    await req.db.query('BEGIN');
    try {
      for (const answer of parsed.data.answers) {
        if (!questionsById.has(answer.question_id)) continue;
        const q = questionsById.get(answer.question_id);
        const scoreObtained =
          gradingType === 'auto' && answer.selected_option != null
            ? answer.selected_option === q.correct_option
              ? q.max_score
              : 0
            : null;

        await req.db.query(
          `INSERT INTO onec_exam_answers (submission_id, question_id, answer_text, selected_option, score_obtained)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (submission_id, question_id)
           DO UPDATE SET answer_text = EXCLUDED.answer_text, selected_option = EXCLUDED.selected_option, score_obtained = EXCLUDED.score_obtained`,
          [submission.id, answer.question_id, answer.answer_text ?? null, answer.selected_option ?? null, scoreObtained]
        );
      }

      if (gradingType === 'auto') {
        const totalResult = await req.db.query(
          'SELECT COALESCE(SUM(score_obtained), 0) AS total FROM onec_exam_answers WHERE submission_id = $1',
          [submission.id]
        );
        const updated = await req.db.query(
          `UPDATE onec_exam_submissions SET status = 'graded', submitted_at = CURRENT_TIMESTAMP, total_score = $1, graded_at = CURRENT_TIMESTAMP
           WHERE id = $2 RETURNING *`,
          [totalResult.rows[0].total, submission.id]
        );
        await req.db.query('COMMIT');
        return res.json({ data: updated.rows[0] });
      }

      const updated = await req.db.query(
        `UPDATE onec_exam_submissions SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [submission.id]
      );
      await req.db.query('COMMIT');
      res.json({ data: updated.rows[0] });
    } catch (err) {
      await req.db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- Grading (grader side) ---

async function listSubmissions(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query(
      `SELECT s.*, l.first_name, l.last_name, l.registry_no
       FROM onec_exam_submissions s
       JOIN onec_learners l ON s.learner_id = l.id
       WHERE s.exam_id = $1
       ORDER BY s.submitted_at DESC NULLS LAST`,
      [id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getSubmissionDetail(req, res) {
  try {
    const { submissionId } = req.params;
    const submissionResult = await req.db.query(
      `SELECT s.*, l.first_name, l.last_name, l.registry_no
       FROM onec_exam_submissions s
       JOIN onec_learners l ON s.learner_id = l.id
       WHERE s.id = $1`,
      [submissionId]
    );
    if (submissionResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const answersResult = await req.db.query(
      `SELECT a.*, q.question_text, q.question_type, q.options, q.correct_option, q.max_score, q.order_index
       FROM onec_exam_answers a
       JOIN onec_exam_questions q ON a.question_id = q.id
       WHERE a.submission_id = $1
       ORDER BY q.order_index ASC`,
      [submissionId]
    );

    res.json({ data: { submission: submissionResult.rows[0], answers: answersResult.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function gradeSubmission(req, res) {
  try {
    const { submissionId } = req.params;
    const parsed = gradeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    await req.db.query('BEGIN');
    try {
      for (const score of parsed.data.scores) {
        await req.db.query(
          `UPDATE onec_exam_answers SET score_obtained = $1, feedback = $2
           WHERE submission_id = $3 AND question_id = $4`,
          [score.score_obtained, score.feedback ?? null, submissionId, score.question_id]
        );
      }

      const totalResult = await req.db.query(
        'SELECT COALESCE(SUM(score_obtained), 0) AS total FROM onec_exam_answers WHERE submission_id = $1',
        [submissionId]
      );
      const updated = await req.db.query(
        `UPDATE onec_exam_submissions SET status = 'graded', total_score = $1, graded_by = $2, graded_at = CURRENT_TIMESTAMP
         WHERE id = $3 RETURNING *`,
        [totalResult.rows[0].total, req.user.userId, submissionId]
      );
      if (updated.rows.length === 0) {
        await req.db.query('ROLLBACK');
        return res.status(404).json({ error: 'Not found' });
      }
      await req.db.query('COMMIT');
      logAudit(req, 'online_exam.graded', { submission_id: updated.rows[0].id, total_score: updated.rows[0].total_score });
      res.json({ data: updated.rows[0] });
    } catch (err) {
      await req.db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listExams,
  getExam,
  createExam,
  updateExam,
  deleteExam,
  setPublished,
  startSubmission,
  getMySubmission,
  submitAnswers,
  listSubmissions,
  getSubmissionDetail,
  gradeSubmission
};
