const { z } = require('zod');
const { logAudit } = require('../../lib/audit');
const { parsePagination } = require('../../lib/pagination');
const { getOwnLearnerId } = require('../../lib/ownLearner');
const { hasPermission } = require('../../lib/permissions');

const GRADE_VALUES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'];

const examSchema = z.object({
  title:         z.string().min(1, 'Exam name is required'),
  description:   z.string().optional().nullable(),
  module_id:     z.number().int('Subject is required'),
  exam_date:     z.string().min(1, 'Exam date is required'),
  eval_type:     z.enum(['marks', 'grades']).default('marks'),
  max_score:     z.number().optional().nullable(),
  passing_marks: z.number().optional().nullable(),
  pass_grade:    z.string().optional().nullable(),
  instructions:  z.string().optional().nullable(),
  target_type:   z.enum(['class', 'specific_students']).default('class'),
  cohort_ids:    z.array(z.number().int()).optional().default([]),
  student_user_ids: z.array(z.number().int()).optional().default([]),
  taken_by:      z.number().int().optional().nullable(),
  status:        z.enum(['draft', 'created']).default('created'),
});

const gradeSchema = z.object({
  learner_id:    z.number().int(),
  score_obtained: z.number().optional().nullable(),
  grade_value:   z.string().optional().nullable(),
  feedback:      z.string().optional().nullable(),
});

// ─── helpers ────────────────────────────────────────────────────────────────

async function resolveUserIdsToLearnerIds(db, userIds) {
  if (!userIds || userIds.length === 0) return [];
  const res = await db.query(
    'SELECT id FROM onec_learners WHERE user_id = ANY($1)',
    [userIds]
  );
  return res.rows.map(r => r.id);
}

async function syncExamCohorts(db, examId, cohortIds) {
  await db.query('DELETE FROM onec_exam_cohorts WHERE exam_id = $1', [examId]);
  if (cohortIds.length > 0) {
    const vals = cohortIds.map((cid, i) => `($1, $${i + 2})`).join(', ');
    await db.query(
      `INSERT INTO onec_exam_cohorts (exam_id, cohort_id) VALUES ${vals}`,
      [examId, ...cohortIds]
    );
  }
}

async function syncTargetStudents(db, examId, learnerIds) {
  await db.query('DELETE FROM onec_exam_target_students WHERE exam_id = $1', [examId]);
  if (learnerIds.length > 0) {
    const vals = learnerIds.map((lid, i) => `($1, $${i + 2})`).join(', ');
    await db.query(
      `INSERT INTO onec_exam_target_students (exam_id, learner_id) VALUES ${vals}`,
      [examId, ...learnerIds]
    );
  }
}

// Rich base SELECT used by listExams and getExam
const BASE_SELECT = `
  SELECT e.id, e.title, e.description, e.module_id, e.exam_date::text AS exam_date,
         e.max_score, e.passing_marks, e.pass_grade, e.eval_type, e.status,
         e.target_type, e.instructions, e.publish_marks, e.created_at, e.created_by, e.taken_by,
         m.name AS subject_name,
         u.username AS created_by_username,
         COALESCE(inst.first_name || ' ' || inst.last_name, u.username) AS created_by_name,
         COALESCE(tb_inst.first_name || ' ' || tb_inst.last_name, tb_u.username) AS taken_by_name,
         STRING_AGG(DISTINCT c.name, ', ' ORDER BY c.name) AS class_names,
         ARRAY_AGG(DISTINCT ec.cohort_id) FILTER (WHERE ec.cohort_id IS NOT NULL) AS cohort_ids
  FROM   onec_exams e
  LEFT JOIN onec_modules      m      ON e.module_id  = m.id
  LEFT JOIN onec_users        u      ON e.created_by = u.id
  LEFT JOIN onec_instructors  inst   ON inst.user_id  = e.created_by
  LEFT JOIN onec_users        tb_u   ON e.taken_by    = tb_u.id
  LEFT JOIN onec_instructors  tb_inst ON tb_inst.user_id = e.taken_by
  LEFT JOIN onec_exam_cohorts ec     ON ec.exam_id    = e.id
  LEFT JOIN onec_cohorts      c      ON ec.cohort_id  = c.id
`;

// ─── listExams ───────────────────────────────────────────────────────────────

async function listExams(req, res) {
  try {
    const { pagination, error } = parsePagination(req.query);
    if (error) return res.status(400).json({ error: 'Invalid pagination parameters', details: error });

    const { search, cohort_id, status, from_date, to_date } = req.query;
    const conditions = [];
    const params = [];

    // Role scoping
    const canViewAll = req.user.role === 'admin' || await hasPermission(req, 'class.view');
    if (!canViewAll && req.user.role === 'learner') {
      const ownLearnerId = await getOwnLearnerId(req);
      const cohortRes = ownLearnerId
        ? await req.db.query('SELECT cohort_id FROM onec_learners WHERE id = $1', [ownLearnerId])
        : { rows: [] };
      const cid = cohortRes.rows[0]?.cohort_id ?? -1;
      params.push(cid);
      conditions.push(`ec.cohort_id = $${params.length}`);
    } else if (!canViewAll && req.user.role === 'instructor') {
      if (!req.tenantConfig?.config?.rules?.global_teacher_visibility) {
        params.push(req.user.userId);
        conditions.push(`(e.created_by = $${params.length} OR e.taken_by = $${params.length} OR ec.cohort_id IN (
          SELECT ic.cohort_id FROM onec_instructor_cohorts ic
          JOIN onec_instructors i ON ic.instructor_id = i.id
          WHERE i.user_id = $${params.length}
        ))`);
      }
    }

    if (search) {
      params.push(`%${search}%`);
      const p = params.length;
      conditions.push(`(e.title ILIKE $${p} OR m.name ILIKE $${p} OR u.username ILIKE $${p} OR c.name ILIKE $${p})`);
    }
    if (cohort_id) {
      params.push(cohort_id);
      conditions.push(`ec.cohort_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`e.status = $${params.length}`);
    }
    if (from_date) {
      params.push(from_date);
      conditions.push(`e.exam_date >= $${params.length}`);
    }
    if (to_date) {
      params.push(to_date);
      conditions.push(`e.exam_date <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const groupBy = 'GROUP BY e.id, m.name, u.username, inst.first_name, inst.last_name, tb_u.username, tb_inst.first_name, tb_inst.last_name';

    if (!pagination) {
      const result = await req.db.query(
        `${BASE_SELECT} ${where} ${groupBy} ORDER BY e.created_at DESC`,
        params
      );
      return res.json({ data: result.rows });
    }

    const { page, pageSize, limit, offset } = pagination;

    const countResult = await req.db.query(
      `SELECT COUNT(DISTINCT e.id)
       FROM onec_exams e
       LEFT JOIN onec_modules m ON e.module_id = m.id
       LEFT JOIN onec_users u ON e.created_by = u.id
       LEFT JOIN onec_exam_cohorts ec ON ec.exam_id = e.id
       LEFT JOIN onec_cohorts c ON ec.cohort_id = c.id
       ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await req.db.query(
      `${BASE_SELECT} ${where} ${groupBy} ORDER BY e.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({ data: result.rows, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── getExam ─────────────────────────────────────────────────────────────────

async function getExam(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query(
      `${BASE_SELECT} WHERE e.id = $1 GROUP BY e.id, m.name, u.username, inst.first_name, inst.last_name, tb_u.username, tb_inst.first_name, tb_inst.last_name`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const exam = result.rows[0];

    const statsRes = await req.db.query(
      `SELECT COUNT(*) AS total_graded
       FROM onec_exam_submissions WHERE exam_id = $1 AND status = 'graded'`,
      [id]
    );
    exam.total_graded = parseInt(statsRes.rows[0].total_graded, 10);

    let totalStudentsQuery = '';
    if (exam.target_type === 'specific_students') {
      totalStudentsQuery = `
        SELECT COUNT(DISTINCT ets.learner_id) AS total_students
        FROM onec_exam_target_students ets
        JOIN onec_learners l ON ets.learner_id = l.id
        WHERE ets.exam_id = $1 AND l.status = 'active'
      `;
    } else {
      totalStudentsQuery = `
        SELECT COUNT(DISTINCT l.id) AS total_students
        FROM onec_learners l
        JOIN onec_exam_cohorts ec ON ec.cohort_id = l.cohort_id
        WHERE ec.exam_id = $1 AND l.status = 'active'
      `;
    }
    const totalRes = await req.db.query(totalStudentsQuery, [id]);
    exam.total_students = parseInt(totalRes.rows[0].total_students, 10);

    res.json({ data: exam });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── createExam ──────────────────────────────────────────────────────────────

async function createExam(req, res) {
  try {
    const parsed = examSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const {
      title, description, module_id, exam_date, eval_type,
      max_score, passing_marks, pass_grade, instructions,
      target_type, cohort_ids, student_user_ids, taken_by, status,
    } = parsed.data;

    if (target_type === 'class' && cohort_ids.length === 0) {
      return res.status(400).json({ error: 'Select at least one class' });
    }
    if (target_type === 'specific_students' && student_user_ids.length === 0) {
      return res.status(400).json({ error: 'Select at least one student' });
    }

    const result = await req.db.query(
      `INSERT INTO onec_exams
         (title, description, module_id, exam_date, eval_type, max_score, passing_marks,
          pass_grade, instructions, target_type, status, taken_by, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [title, description ?? null, module_id, exam_date, eval_type,
       eval_type === 'marks' ? (max_score ?? 100) : null,
       eval_type === 'marks' ? (passing_marks ?? null) : null,
       eval_type === 'grades' ? (pass_grade ?? null) : null,
       instructions ?? null, target_type, status,
       taken_by ?? req.user.userId, req.user.userId]
    );

    const examId = result.rows[0].id;

    if (target_type === 'class') {
      await syncExamCohorts(req.db, examId, cohort_ids);
    } else {
      const learnerIds = await resolveUserIdsToLearnerIds(req.db, student_user_ids);
      await syncTargetStudents(req.db, examId, learnerIds);
    }

    logAudit(req, 'exam.created', { exam_id: examId, title, status });
    res.status(201).json({ data: { id: examId } });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Subject or cohort does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── updateExam ──────────────────────────────────────────────────────────────

async function updateExam(req, res) {
  try {
    const { id } = req.params;
    const existing = await req.db.query('SELECT created_by, status FROM onec_exams WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && existing.rows[0].created_by !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to edit this exam' });
    }

    const parsed = examSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const {
      title, description, module_id, exam_date, eval_type,
      max_score, passing_marks, pass_grade, instructions,
      target_type, cohort_ids, student_user_ids, taken_by, status,
    } = parsed.data;

    await req.db.query(
      `UPDATE onec_exams SET
         title=$1, description=$2, module_id=$3, exam_date=$4, eval_type=$5,
         max_score=$6, passing_marks=$7, pass_grade=$8, instructions=$9,
         target_type=$10, status=$11, taken_by=$12
       WHERE id=$13`,
      [title, description ?? null, module_id, exam_date, eval_type,
       eval_type === 'marks' ? (max_score ?? 100) : null,
       eval_type === 'marks' ? (passing_marks ?? null) : null,
       eval_type === 'grades' ? (pass_grade ?? null) : null,
       instructions ?? null, target_type, status,
       taken_by ?? req.user.userId, id]
    );

    if (target_type === 'class') {
      await syncExamCohorts(req.db, id, cohort_ids);
    } else {
      const learnerIds = await resolveUserIdsToLearnerIds(req.db, student_user_ids);
      await syncTargetStudents(req.db, id, learnerIds);
    }

    logAudit(req, 'exam.updated', { exam_id: id, title });
    const updated = await req.db.query(
      `${BASE_SELECT} WHERE e.id = $1 GROUP BY e.id, m.name, u.username, inst.first_name, inst.last_name, tb_u.username, tb_inst.first_name, tb_inst.last_name`,
      [id]
    );
    res.json({ data: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── deleteExam ──────────────────────────────────────────────────────────────

async function deleteExam(req, res) {
  try {
    const { id } = req.params;
    const existing = await req.db.query('SELECT created_by, title FROM onec_exams WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && existing.rows[0].created_by !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this exam' });
    }
    await req.db.query('DELETE FROM onec_exams WHERE id = $1', [id]);
    logAudit(req, 'exam.deleted', { exam_id: id, title: existing.rows[0].title });
    res.json({ data: { id: Number(id) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── duplicateExam ───────────────────────────────────────────────────────────

async function duplicateExam(req, res) {
  try {
    const { id } = req.params;
    const src = await req.db.query('SELECT * FROM onec_exams WHERE id = $1', [id]);
    if (src.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const s = src.rows[0];

    const result = await req.db.query(
      `INSERT INTO onec_exams
         (title, description, module_id, exam_date, eval_type, max_score, passing_marks,
          pass_grade, instructions, target_type, status, taken_by, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11,$12) RETURNING id`,
      [`${s.title} (Copy)`, s.description, s.module_id, s.exam_date, s.eval_type,
       s.max_score, s.passing_marks, s.pass_grade, s.instructions, s.target_type,
       s.taken_by, req.user.userId]
    );
    const newId = result.rows[0].id;

    const cohorts = await req.db.query(
      'SELECT cohort_id FROM onec_exam_cohorts WHERE exam_id = $1', [id]
    );
    await syncExamCohorts(req.db, newId, cohorts.rows.map(r => r.cohort_id));

    const students = await req.db.query(
      'SELECT learner_id FROM onec_exam_target_students WHERE exam_id = $1', [id]
    );
    await syncTargetStudents(req.db, newId, students.rows.map(r => r.learner_id));

    logAudit(req, 'exam.duplicated', { source_id: id, new_id: newId });
    res.status(201).json({ data: { id: newId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── togglePublish ───────────────────────────────────────────────────────────

async function togglePublish(req, res) {
  try {
    const { id } = req.params;
    const { published } = req.body;
    if (typeof published !== 'boolean') {
      return res.status(400).json({ error: '`published` (boolean) is required' });
    }
    const result = await req.db.query(
      'UPDATE onec_exams SET publish_marks = $1 WHERE id = $2 RETURNING id, publish_marks, status',
      [published, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req, published ? 'exam.published' : 'exam.unpublished', { exam_id: id });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── getValuationStudents ────────────────────────────────────────────────────

async function getValuationStudents(req, res) {
  try {
    const { id } = req.params;
    const { cohort_id, search, page: rawPage, pageSize: rawSize } = req.query;
    const page = Math.max(1, parseInt(rawPage) || 1);
    const pageSize = Math.min(50, parseInt(rawSize) || 20);
    const offset = (page - 1) * pageSize;

    const exam = await req.db.query('SELECT target_type FROM onec_exams WHERE id = $1', [id]);
    if (exam.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const { target_type } = exam.rows[0];

    const params = [id];
    let fromJoins;
    let whereClause;

    if (target_type === 'specific_students') {
      fromJoins = `
        FROM onec_exam_target_students ets
        JOIN onec_learners l ON ets.learner_id = l.id
        LEFT JOIN onec_cohorts c ON c.id = l.cohort_id
      `;
      whereClause = `WHERE ets.exam_id = $1 AND l.status = 'active'`;
    } else {
      fromJoins = `
        FROM onec_learners l
        JOIN onec_exam_cohorts ec ON ec.cohort_id = l.cohort_id AND ec.exam_id = $1
        JOIN onec_cohorts c ON c.id = l.cohort_id
      `;
      if (cohort_id) {
        params.push(cohort_id);
        whereClause = `WHERE l.cohort_id = $2 AND l.status = 'active'`;
      } else {
        whereClause = `WHERE l.status = 'active'`;
      }
    }

    if (search) {
      params.push(`%${search}%`);
      const p = params.length;
      whereClause += ` AND (l.first_name ILIKE $${p} OR l.last_name ILIKE $${p} OR l.registry_no ILIKE $${p})`;
    }

    const countResult = await req.db.query(`SELECT COUNT(*) ${fromJoins} ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await req.db.query(
      `SELECT l.id AS learner_id, l.user_id, l.first_name, l.last_name, l.registry_no,
              c.name AS cohort_name,
              ROW_NUMBER() OVER (ORDER BY c.name, l.last_name, l.first_name) AS roll_no,
              s.id AS submission_id, s.score_obtained, s.grade_value, s.feedback,
              COALESCE(s.status, 'pending') AS status
       ${fromJoins}
       LEFT JOIN onec_exam_submissions s
         ON s.exam_id = $1 AND s.learner_id = l.id
       ${whereClause}
       ORDER BY c.name, l.last_name, l.first_name
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    res.json({ data: result.rows, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── upsertGrade ─────────────────────────────────────────────────────────────

async function upsertGrade(req, res) {
  try {
    const { id } = req.params;
    const parsed = gradeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { learner_id, score_obtained, grade_value, feedback } = parsed.data;
    const isGraded = score_obtained != null || (grade_value && grade_value.trim() !== '');

    const result = await req.db.query(
      `INSERT INTO onec_exam_submissions
         (exam_id, learner_id, score_obtained, grade_value, feedback, graded_by, graded_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
       ON CONFLICT (exam_id, learner_id) DO UPDATE SET
         score_obtained = EXCLUDED.score_obtained,
         grade_value    = EXCLUDED.grade_value,
         feedback       = EXCLUDED.feedback,
         graded_by      = EXCLUDED.graded_by,
         graded_at      = EXCLUDED.graded_at,
         status         = EXCLUDED.status
       RETURNING *`,
      [id, learner_id, score_obtained ?? null, grade_value ?? null, feedback ?? null,
       req.user.userId, isGraded ? 'graded' : 'pending']
    );

    await req.db.query(
      `UPDATE onec_exams SET status = 'grading_in_progress'
       WHERE id = $1 AND status = 'created'`,
      [id]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── completeValuation ───────────────────────────────────────────────────────

async function completeValuation(req, res) {
  try {
    const { id } = req.params;
    const exam = await req.db.query('SELECT target_type, status FROM onec_exams WHERE id = $1', [id]);
    if (exam.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const result = await req.db.query(
      `UPDATE onec_exams SET status = 'completed', publish_marks = TRUE
       WHERE id = $1 RETURNING id, status, publish_marks`,
      [id]
    );

    logAudit(req, 'exam.valuation_completed', { exam_id: id });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── listSubmissions (learner view) ──────────────────────────────────────────

async function listSubmissions(req, res) {
  try {
    const { id } = req.params;
    const role = req.user.role;
    const isGrader = role === 'admin' || role === 'staff' || role === 'instructor';

    let query = `SELECT s.*, l.first_name, l.last_name, l.registry_no, l.user_id AS learner_user_id
                 FROM onec_exam_submissions s
                 JOIN onec_learners l ON s.learner_id = l.id
                 WHERE s.exam_id = $1`;
    const params = [id];

    if (!isGrader) {
      const ownLearnerId = await getOwnLearnerId(req);
      params.push(ownLearnerId ?? -1);
      query += ' AND s.learner_id = $2';
    }
    query += ' ORDER BY l.last_name, l.first_name';

    const result = await req.db.query(query, params);

    if (!isGrader) {
      const examRes = await req.db.query('SELECT publish_marks FROM onec_exams WHERE id = $1', [id]);
      if (!examRes.rows[0]?.publish_marks) {
        result.rows.forEach(row => { row.score_obtained = null; row.grade_value = null; row.feedback = null; });
      }
    }

    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── getActivity ─────────────────────────────────────────────────────────────

async function getActivity(req, res) {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const result = await req.db.query(
      `SELECT al.id, al.action, al.details, al.created_at, u.username
       FROM onec_audit_logs al
       LEFT JOIN onec_users u ON u.id = al.user_id
       WHERE (al.details->>'exam_id')::int = $1
          OR (al.details->>'source_id')::int = $1
       ORDER BY al.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );
    res.json({ activity: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listExams, getExam, createExam, updateExam,
  deleteExam, duplicateExam, togglePublish, getValuationStudents,
  upsertGrade, completeValuation, getActivity, listSubmissions,
};
