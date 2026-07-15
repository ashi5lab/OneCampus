// All read-only aggregation queries — no writes, no zod body schemas.
// Every endpoint is gated by reports.view (admin/staff only, see
// server/lib/permissions.js), since this is a cross-cohort/school-wide
// operational view, not something to row-scope per learner/instructor.

async function overview(req, res) {
  try {
    const [
      learners,
      instructors,
      guardians,
      cohorts,
      units,
      modules,
      attendance30d,
      assignmentsOpen,
      examsPendingGrade,
      examsPublished,
      library,
      libraryOverdue,
      notices30d,
      certificates
    ] = await Promise.all([
      req.db.query(`SELECT COUNT(*) FROM onec_learners WHERE status = 'active'`),
      req.db.query('SELECT COUNT(*) FROM onec_instructors'),
      req.db.query('SELECT COUNT(*) FROM onec_guardians'),
      req.db.query('SELECT COUNT(*) FROM onec_cohorts'),
      req.db.query('SELECT COUNT(*) FROM onec_units'),
      req.db.query('SELECT COUNT(*) FROM onec_modules'),
      req.db.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'present') AS present,
           COUNT(*) AS total
         FROM onec_attendance WHERE date >= CURRENT_DATE - INTERVAL '30 days'`
      ),
      req.db.query(`SELECT COUNT(*) FROM onec_assignments WHERE due_date >= CURRENT_DATE`),
      req.db.query(`SELECT COUNT(*) FROM onec_exam_submissions WHERE status = 'submitted'`),
      req.db.query(`SELECT COUNT(*) FROM onec_online_exams WHERE published = true`),
      req.db.query(
        `SELECT COUNT(*) AS total_books, COALESCE(SUM(total_copies), 0) AS total_copies FROM onec_library_books`
      ),
      req.db.query(`SELECT COUNT(*) FROM onec_library_loans WHERE returned_date IS NULL AND due_date < CURRENT_DATE`),
      req.db.query(`SELECT COUNT(*) FROM onec_notices WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`),
      req.db.query('SELECT COUNT(*) FROM onec_certificates')
    ]);

    const attendanceTotal = Number(attendance30d.rows[0].total);
    const attendancePresent = Number(attendance30d.rows[0].present);

    res.json({
      data: {
        totalLearners: Number(learners.rows[0].count),
        totalInstructors: Number(instructors.rows[0].count),
        totalGuardians: Number(guardians.rows[0].count),
        totalCohorts: Number(cohorts.rows[0].count),
        totalUnits: Number(units.rows[0].count),
        totalModules: Number(modules.rows[0].count),
        attendanceRateLast30Days: attendanceTotal > 0 ? Math.round((attendancePresent / attendanceTotal) * 1000) / 10 : null,
        assignmentsOpen: Number(assignmentsOpen.rows[0].count),
        onlineExamsPendingGrade: Number(examsPendingGrade.rows[0].count),
        onlineExamsPublished: Number(examsPublished.rows[0].count),
        libraryTotalTitles: Number(library.rows[0].total_books),
        libraryTotalCopies: Number(library.rows[0].total_copies),
        libraryOverdueLoans: Number(libraryOverdue.rows[0].count),
        noticesLast30Days: Number(notices30d.rows[0].count),
        certificatesIssued: Number(certificates.rows[0].count)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function attendance(req, res) {
  try {
    const { cohort_id, from, to } = req.query;
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const toDate = to || new Date().toISOString().slice(0, 10);

    const params = [fromDate, toDate];
    let cohortFilter = '';
    if (cohort_id) {
      params.push(cohort_id);
      cohortFilter = ` AND l.cohort_id = $${params.length}`;
    }

    const result = await req.db.query(
      `SELECT l.id AS learner_id, l.first_name, l.last_name, l.registry_no, c.name AS cohort_name,
              COUNT(a.*) FILTER (WHERE a.status = 'present') AS present_count,
              COUNT(a.*) FILTER (WHERE a.status = 'absent') AS absent_count,
              COUNT(a.*) FILTER (WHERE a.status = 'late') AS late_count,
              COUNT(a.*) FILTER (WHERE a.status = 'excused') AS excused_count,
              COUNT(a.*) AS total_marked
       FROM onec_learners l
       JOIN onec_cohorts c ON l.cohort_id = c.id
       LEFT JOIN onec_attendance a ON a.learner_id = l.id AND a.date BETWEEN $1 AND $2
       WHERE l.status = 'active'${cohortFilter}
       GROUP BY l.id, l.first_name, l.last_name, l.registry_no, c.name
       ORDER BY c.name, l.last_name`,
      params
    );

    const data = result.rows.map((row) => ({
      ...row,
      attendance_rate: row.total_marked > 0 ? Math.round((row.present_count / row.total_marked) * 1000) / 10 : null
    }));

    res.json({ data, from: fromDate, to: toDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function academicPerformance(req, res) {
  try {
    const { cohort_id, module_id } = req.query;
    const params = [];
    const filters = [];
    if (cohort_id) {
      params.push(cohort_id);
      filters.push(`l.cohort_id = $${params.length}`);
    }
    if (module_id) {
      params.push(module_id);
      filters.push(`es.module_id = $${params.length}`);
    }
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const result = await req.db.query(
      `SELECT l.id AS learner_id, l.first_name, l.last_name, l.registry_no, c.name AS cohort_name,
              COUNT(s.*) AS evaluations_taken,
              ROUND(AVG(s.score_obtained / NULLIF(es.max_score, 0) * 100)::numeric, 1) AS avg_percentage
       FROM onec_learners l
       JOIN onec_cohorts c ON l.cohort_id = c.id
       JOIN onec_learner_scores s ON s.learner_id = l.id
       JOIN onec_evaluation_schedules es ON s.eval_schedule_id = es.id
       ${whereClause}
       GROUP BY l.id, l.first_name, l.last_name, l.registry_no, c.name
       ORDER BY avg_percentage DESC NULLS LAST`,
      params
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function assignmentsReport(req, res) {
  try {
    const result = await req.db.query(
      `SELECT a.id, a.title, a.due_date, m.name AS module_name, c.name AS cohort_name, a.max_score,
              (SELECT COUNT(*) FROM onec_learners l WHERE l.cohort_id = a.cohort_id AND l.status = 'active') AS cohort_size,
              COUNT(sub.*) AS submissions_count,
              COUNT(sub.*) FILTER (WHERE sub.score_obtained IS NOT NULL) AS graded_count,
              ROUND(AVG(sub.score_obtained)::numeric, 1) AS avg_score
       FROM onec_assignments a
       JOIN onec_modules m ON a.module_id = m.id
       JOIN onec_cohorts c ON a.cohort_id = c.id
       LEFT JOIN onec_assignment_submissions sub ON sub.assignment_id = a.id
       GROUP BY a.id, a.title, a.due_date, m.name, c.name, a.max_score, a.cohort_id
       ORDER BY a.due_date DESC`
    );
    const data = result.rows.map((row) => ({
      ...row,
      completion_rate: row.cohort_size > 0 ? Math.round((row.submissions_count / row.cohort_size) * 1000) / 10 : null
    }));
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function onlineExamsReport(req, res) {
  try {
    const result = await req.db.query(
      `SELECT e.id, e.title, e.grading_type, e.published, e.max_score, m.name AS module_name, c.name AS cohort_name,
              (SELECT COUNT(*) FROM onec_learners l WHERE l.cohort_id = e.cohort_id AND l.status = 'active') AS cohort_size,
              COUNT(s.*) AS started_count,
              COUNT(s.*) FILTER (WHERE s.status IN ('submitted', 'graded')) AS submitted_count,
              COUNT(s.*) FILTER (WHERE s.status = 'graded') AS graded_count,
              ROUND(AVG(s.total_score) FILTER (WHERE s.status = 'graded')::numeric, 1) AS avg_score,
              ROUND((COUNT(s.*) FILTER (WHERE s.status = 'graded' AND s.total_score >= e.max_score * 0.4)::numeric
                     / NULLIF(COUNT(s.*) FILTER (WHERE s.status = 'graded'), 0) * 100), 1) AS pass_rate
       FROM onec_online_exams e
       JOIN onec_modules m ON e.module_id = m.id
       JOIN onec_cohorts c ON e.cohort_id = c.id
       LEFT JOIN onec_exam_submissions s ON s.exam_id = e.id
       GROUP BY e.id, e.title, e.grading_type, e.published, e.max_score, m.name, c.name, e.cohort_id
       ORDER BY e.id DESC`
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function libraryReport(req, res) {
  try {
    const [books, overdue] = await Promise.all([
      req.db.query(
        `SELECT b.id, b.title, b.author, b.total_copies, b.available_copies, COUNT(l.*) AS times_borrowed
         FROM onec_library_books b
         LEFT JOIN onec_library_loans l ON l.book_id = b.id
         GROUP BY b.id, b.title, b.author, b.total_copies, b.available_copies
         ORDER BY times_borrowed DESC`
      ),
      req.db.query(
        `SELECT l.id, b.title AS book_title, u.username AS borrower_username, l.due_date,
                CURRENT_DATE - l.due_date AS days_overdue
         FROM onec_library_loans l
         JOIN onec_library_books b ON l.book_id = b.id
         JOIN onec_users u ON l.borrower_id = u.id
         WHERE l.returned_date IS NULL AND l.due_date < CURRENT_DATE
         ORDER BY l.due_date ASC`
      )
    ]);
    res.json({ data: { books: books.rows, overdueLoans: overdue.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function certificatesReport(req, res) {
  try {
    const [byType, recent] = await Promise.all([
      req.db.query('SELECT type, COUNT(*) AS count FROM onec_certificates GROUP BY type ORDER BY count DESC'),
      req.db.query(
        `SELECT cert.id, cert.type, cert.certificate_no, cert.issue_date, l.first_name, l.last_name, l.registry_no
         FROM onec_certificates cert
         JOIN onec_learners l ON cert.learner_id = l.id
         ORDER BY cert.issue_date DESC
         LIMIT 50`
      )
    ]);
    res.json({ data: { byType: byType.rows, recent: recent.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  overview,
  attendance,
  academicPerformance,
  assignmentsReport,
  onlineExamsReport,
  libraryReport,
  certificatesReport
};
