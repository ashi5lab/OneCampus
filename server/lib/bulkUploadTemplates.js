const XLSX = require('xlsx');
const { ENTITY_FIELDS, SAMPLE_ROWS } = require('./bulkUploadFields');

// Builds the downloadable "fill this in" template: header row, one example
// row (clearly marked, first column prefixed), and an Instructions sheet.
// Returns a Buffer — the same shape works for both .xlsx (write straight
// out) and .csv (the caller re-encodes via XLSX.utils.sheet_to_csv on the
// first sheet, see controller.js's downloadTemplate).
function buildTemplateWorkbook(entityType) {
  const fields = ENTITY_FIELDS[entityType];
  const headers = fields.columns.map((c) => c.header);
  const sample = { ...SAMPLE_ROWS[entityType] };
  sample[headers[0]] = `SAMPLE — delete this row — ${sample[headers[0]]}`;

  const sheet = XLSX.utils.json_to_sheet([sample], { header: headers });
  sheet['!cols'] = headers.map((h) => ({ wch: Math.max(18, h.length + 2) }));

  const instructions = [
    [`${fields.label} bulk upload — instructions`],
    [''],
    ['Columns marked with * are required; every other column is optional.'],
    ['Delete the sample row on the "Data" sheet before adding your own rows — keep the header row as-is.'],
    ['You can upload this as .xlsx or save/export it as .csv — both are accepted.'],
    ['']
  ];
  if (entityType === 'learner') {
    instructions.push(
      ['"Class" must exactly match an existing class name from the Cohorts page (case-insensitive) — create the class first if it doesn\'t exist yet.'],
      ['"Guardian Mobile Number" can be left blank to reuse the student\'s own mobile number — common when a parent doesn\'t have a separate number on file.'],
      ['Guardian info is entirely optional — leave the guardian columns blank to skip creating a guardian link for that row.'],
      ['If a guardian with the same mobile number already exists, the student is linked to that existing guardian instead of creating a duplicate.']
    );
  }
  instructions.push(
    [''],
    ['A portal login (username + password) is created automatically for every row — you don\'t fill those in here. Download the results file after processing to get everyone\'s generated username and password.'],
    ['Email is optional — leave it blank and a placeholder is generated instead.']
  );
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  instructionsSheet['!cols'] = [{ wch: 100 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
  XLSX.utils.book_append_sheet(workbook, sheet, 'Data');
  return workbook;
}

function templateAsXlsxBuffer(entityType) {
  const workbook = buildTemplateWorkbook(entityType);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function templateAsCsvBuffer(entityType) {
  const workbook = buildTemplateWorkbook(entityType);
  const sheet = workbook.Sheets['Data'];
  return Buffer.from(XLSX.utils.sheet_to_csv(sheet), 'utf-8');
}

// Builds a downloadable workbook of just the rows that failed, with an
// added Error column — the admin fixes these in place and re-uploads the
// same file. `errors` is the onec_bulk_upload_jobs.errors jsonb array:
// [{ row, error, data: { <original header>: <original value> } }].
function failuresAsXlsxBuffer(entityType, errors) {
  const fields = ENTITY_FIELDS[entityType];
  const headers = fields.columns.map((c) => c.header);
  const rows = errors.map((e) => ({ Row: e.row, ...e.data, Error: e.error }));
  const sheet = XLSX.utils.json_to_sheet(rows, { header: ['Row', ...headers, 'Error'] });
  sheet['!cols'] = [{ wch: 6 }, ...headers.map((h) => ({ wch: Math.max(18, h.length + 2) })), { wch: 50 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Failed Rows');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// Builds the downloadable "here's everyone's login" workbook — one row per
// successfully-created person, generated username + password included.
// `credentials` is the onec_bulk_upload_jobs.credentials jsonb array (see
// server/lib/bulkUploadProcessor.js): [{ username, first_name, last_name,
// class_name | staff_id, password }]. This is the only place the plaintext
// passwords exist after processing — not stored anywhere else, so this
// download is the admin's one chance to retrieve them.
function credentialsAsXlsxBuffer(entityType, credentials) {
  const identifierHeader = entityType === 'learner' ? 'Class' : 'Staff / Employee ID';
  const identifierKey = entityType === 'learner' ? 'class_name' : 'staff_id';
  const headers = ['Username', 'First Name', 'Last Name', identifierHeader, 'Password'];

  const rows = credentials.map((c) => ({
    Username: c.username,
    'First Name': c.first_name,
    'Last Name': c.last_name,
    [identifierHeader]: c[identifierKey] || '',
    Password: c.password
  }));

  const sheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  sheet['!cols'] = headers.map((h) => ({ wch: Math.max(16, h.length + 2) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Credentials');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { templateAsXlsxBuffer, templateAsCsvBuffer, failuresAsXlsxBuffer, credentialsAsXlsxBuffer };
