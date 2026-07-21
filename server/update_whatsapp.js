const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function update() {
  const token = 'EAALkT0v65zMBSN58PeTslsZCxq31y8jUOzP5kTnB16C1TUsrwcVG0KzvfM8XHNaHQCGNGQOPspbm2w8lc72Xkf0ZCz98ca8OJlZBmDZBFYpx4ghMu2uSQ61LuxhVpO3NGUkZCWuEgM4QMUYZC0kMiJ2ZA4SW0z8po5WELE9YyzugAYdoBMUZAI6YRF32nETzevgp8eJcRC4Mi8GMoHvhjTGZCgQzaE2SBzfIZB8daeVYRZC57M7uunS7RZA2AwcVHY6FhaDx4UmknYbDyqtsnuHbZAjJb';
  
  const payload = {
    messaging_product: 'whatsapp',
    to: '{{phone}}',
    type: 'template',
    template: {
      name: 'hello_world',
      language: { code: 'en_US' }
    }
  };

  const url = 'https://graph.facebook.com/v25.0/1269942639527934/messages';
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  const variables = { 'test_phone': '918281129743' };

  const schemasRes = await pool.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'");
  const schemas = schemasRes.rows.map(r => r.schema_name);

  for (const schema of schemas) {
    console.log(`Updating schema ${schema}...`);
    await pool.query(
      `UPDATE ${schema}.onec_broadcast_configs 
       SET api_url = $1, 
           headers = $2, 
           payload_template = $3, 
           body_encoding = 'json',
           is_active = true,
           variables = $4
       WHERE channel IN ('whatsapp', 'whatsapp_absentee')`,
      [
        url,
        headers,
        payload,
        variables
      ]
    );
  }
  
  console.log('Whatsapp configs updated for all tenants');
  process.exit(0);
}
update().catch(console.error);
