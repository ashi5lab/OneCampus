const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:YTmKPZPXRhGBSLCwqcFcmCSRtbqWnQUd@switchback.proxy.rlwy.net:34002/railway' });
async function run() {
  await client.connect();
  try {
    await client.query('SET search_path TO tenant_qschool_onecampus_local');
    const q = \SELECT a.id, a.title, a.description, a.module_id, a.due_date::text AS due_date, a.max_score, a.passing_marks, a.pass_grade, a.eval_type, a.status, a.target_type, a.instructions, a.publish_marks, a.created_at, a.created_by, a.taken_by, m.name AS subject_name, u.username AS created_by_username, COALESCE(inst.first_name || ' ' || inst.last_name, u.username) AS created_by_name, COALESCE(tb_inst.first_name || ' ' || tb_inst.last_name, tb_u.username) AS taken_by_name, STRING_AGG(DISTINCT c.name, ', ' ORDER BY c.name) AS class_names, ARRAY_AGG(DISTINCT ac.cohort_id) FILTER (WHERE ac.cohort_id IS NOT NULL) AS cohort_ids FROM onec_assignments a LEFT JOIN onec_modules m ON a.module_id = m.id LEFT JOIN onec_users u ON a.created_by = u.id LEFT JOIN onec_instructors inst ON inst.user_id = a.created_by LEFT JOIN onec_users tb_u ON a.taken_by = tb_u.id LEFT JOIN onec_instructors tb_inst ON tb_inst.user_id = a.taken_by LEFT JOIN onec_assignment_cohorts ac ON ac.assignment_id = a.id LEFT JOIN onec_cohorts c ON ac.cohort_id = c.id GROUP BY a.id, m.name, u.username, inst.first_name, inst.last_name, tb_u.username, tb_inst.first_name, tb_inst.last_name ORDER BY a.created_at DESC LIMIT 20 OFFSET 0\;
    const res = await client.query(q);
    console.log('success', res.rowCount);
  } catch(e) {
    console.log('ERROR:', e.message);
  }
  await client.end();
}
run().catch(console.error);
