const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:YTmKPZPXRhGBSLCwqcFcmCSRtbqWnQUd@switchback.proxy.rlwy.net:34002/railway' });

async function run() {
  await client.connect();
  try {
    const res = await client.query('SELECT * FROM public.onec_tenants');
    for (const t of res.rows) {
      const schema = t.schema_name;
      console.log('Renaming online exam tables in', schema);
      
      // We check if the tables exist to avoid crashing
      const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name IN ('onec_exam_questions', 'onec_exam_submissions', 'onec_exam_answers')
      `, [schema]);
      
      const tables = tablesRes.rows.map(r => r.table_name);
      
      if (tables.includes('onec_exam_questions')) {
        await client.query(`ALTER TABLE ${schema}.onec_exam_questions RENAME TO onec_online_exam_questions`);
        // Rename constraint on id if needed? Postgres renames the table, the constraints stay attached.
      }
      if (tables.includes('onec_exam_submissions')) {
        // Since we are renaming it to onec_online_exam_submissions, check if that already exists (unlikely)
        await client.query(`ALTER TABLE ${schema}.onec_exam_submissions RENAME TO onec_online_exam_submissions`);
      }
      if (tables.includes('onec_exam_answers')) {
        await client.query(`ALTER TABLE ${schema}.onec_exam_answers RENAME TO onec_online_exam_answers`);
      }
    }
    console.log('Renames complete.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
