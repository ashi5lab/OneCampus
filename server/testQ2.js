const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:YTmKPZPXRhGBSLCwqcFcmCSRtbqWnQUd@switchback.proxy.rlwy.net:34002/railway' });
async function run() {
  await client.connect();
  try {
    await client.query('SET search_path TO tenant_qschool_onecampus_local');
    const q = `SELECT l.id AS learner_id, l.user_id, l.first_name, l.last_name, l.registry_no,
              c.name AS cohort_name,
              ROW_NUMBER() OVER (ORDER BY c.name, l.last_name, l.first_name) AS roll_no,
              s.id AS submission_id, s.score_obtained, s.grade_value, s.feedback,
              COALESCE(s.status, 'pending') AS status
        FROM onec_learners l
        JOIN onec_exam_cohorts ec ON ec.cohort_id = l.cohort_id AND ec.exam_id = $1
        JOIN onec_cohorts c ON c.id = l.cohort_id
       LEFT JOIN onec_exam_submissions s
         ON s.exam_id = $1 AND s.learner_id = l.id
       WHERE l.status = 'active'
       ORDER BY c.name, l.last_name, l.first_name
       LIMIT $2 OFFSET $3`;
    const res = await client.query(q, [1, 20, 0]);
    console.log('exams success', res.rowCount);
  } catch(e) {
    console.log('ERROR:', e.message);
  }
  await client.end();
}
run().catch(console.error);
