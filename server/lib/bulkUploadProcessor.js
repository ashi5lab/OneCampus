const crypto = require('crypto');
const bcrypt = require('bcrypt');
const XLSX = require('xlsx');
const db = require('../config/db');
const { ENTITY_FIELDS, normalizeHeader } = require('./bulkUploadFields');

const MAX_DATA_ROWS = 2000;

// header:1 (array-of-arrays) instead of the usual object mode — object mode
// derives its keys from row 1 too, but returns [] entirely for a file with
// headers and zero data rows, which would make an all-headers-no-rows
// upload silently report "0 rows" instead of the real "missing columns"
// or "empty file" error. blankrows:false drops the trailing fully-empty
// rows Excel often leaves at the end of a sheet.
function parseUploadedFile(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames.find((n) => n.trim().toLowerCase() !== 'instructions') || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { headers: [], rows: [] };

  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: false });
  if (grid.length === 0) return { headers: [], rows: [] };

  const headers = grid[0].map((h) => String(h || '').trim());
  const rows = grid.slice(1).map((rowArr) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = rowArr[idx] !== undefined && rowArr[idx] !== null ? String(rowArr[idx]).trim() : '';
    });
    return obj;
  });
  return { headers, rows };
}

// Matches the columns actually present in the uploaded file back to our
// canonical field keys (by exact header text or a known alias, both
// normalized) — admins renaming/reordering columns or exporting from
// different software (different capitalization/punctuation) still works.
function buildHeaderKeyMap(entityType, actualHeaders) {
  const fields = ENTITY_FIELDS[entityType];
  const map = {};
  for (const actualHeader of actualHeaders) {
    if (!actualHeader) continue;
    const norm = normalizeHeader(actualHeader);
    const col = fields.columns.find((c) => normalizeHeader(c.header) === norm || (c.aliases || []).includes(norm));
    if (col) map[actualHeader] = col.key;
  }
  return map;
}

function getMissingRequiredHeaders(entityType, headerKeyMap) {
  const fields = ENTITY_FIELDS[entityType];
  const mappedKeys = new Set(Object.values(headerKeyMap));
  return fields.columns.filter((c) => c.required && !mappedKeys.has(c.key)).map((c) => c.header);
}

function extractRowValues(headerKeyMap, rawRow) {
  const values = {};
  for (const [header, key] of Object.entries(headerKeyMap)) {
    values[key] = rawRow[header] || '';
  }
  return values;
}

// What gets written into a failed row's `data` for the downloadable
// failures workbook — canonical template header text, not our internal
// field keys, so it lines up with the columns the admin actually sees.
function buildExportData(entityType, values) {
  const fields = ENTITY_FIELDS[entityType];
  const data = {};
  for (const col of fields.columns) data[col.header] = values[col.key] || '';
  return data;
}

function validateLoginFields(values) {
  const given = [values.email, values.username, values.password].filter(Boolean);
  if (given.length === 0) return null;
  if (given.length < 3) {
    return 'To create a login for this person, fill in Login Email, Login Username, and Login Password together (or leave all three blank to skip creating a login).';
  }
  if (!/^\S+@\S+\.\S+$/.test(values.email)) return 'Login Email is not a valid email address.';
  if (values.password.length < 6) return 'Login Password must be at least 6 characters.';
  return null;
}

function validateLearnerRow(values, cohortMap) {
  if (!values.first_name) return { ok: false, error: 'First Name is required.' };
  if (!values.last_name) return { ok: false, error: 'Last Name is required.' };
  if (!values.mobile) return { ok: false, error: 'Mobile Number is required.' };
  if (!values.class_name) return { ok: false, error: 'Class is required.' };

  const norm = normalizeHeader(values.class_name);
  const matches = cohortMap.get(norm) || [];
  if (matches.length === 0) {
    return { ok: false, error: `Class "${values.class_name}" was not found — create it on the Cohorts page first, then re-upload this row.` };
  }
  if (matches.length > 1) {
    return { ok: false, error: `Multiple classes named "${values.class_name}" exist — rename them to be unique, then re-upload this row.` };
  }

  const loginError = validateLoginFields(values);
  if (loginError) return { ok: false, error: loginError };

  const registry_no = values.registry_no || `STU-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  return { ok: true, values: { ...values, cohort_id: matches[0], registry_no } };
}

function validateStaffLikeRow(values) {
  if (!values.first_name) return { ok: false, error: 'First Name is required.' };
  if (!values.last_name) return { ok: false, error: 'Last Name is required.' };
  if (!values.mobile) return { ok: false, error: 'Mobile Number is required.' };

  const loginError = validateLoginFields(values);
  if (loginError) return { ok: false, error: loginError };

  const staff_id = values.staff_id || `EMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  return { ok: true, values: { ...values, staff_id } };
}

async function insertLearnerRow(client, values) {
  await client.query('BEGIN');
  try {
    let userId = null;
    if (values.password) {
      const password_hash = await bcrypt.hash(values.password, 10);
      const userResult = await client.query(
        `INSERT INTO onec_users (username, email, password_hash, role) VALUES ($1, $2, $3, 'learner') RETURNING id`,
        [values.username, values.email, password_hash]
      );
      userId = userResult.rows[0].id;
    }

    const meta = { phone: values.mobile };
    if (values.gender) meta.gender = values.gender;
    if (values.dob) meta.dob = values.dob;
    if (values.address) meta.address = values.address;

    const learnerResult = await client.query(
      `INSERT INTO onec_learners (user_id, registry_no, first_name, last_name, cohort_id, status, meta)
       VALUES ($1, $2, $3, $4, $5, 'active', $6) RETURNING id`,
      [userId, values.registry_no, values.first_name, values.last_name, values.cohort_id, meta]
    );
    const learnerId = learnerResult.rows[0].id;

    const hasGuardianInfo = values.guardian_phone || values.guardian_first_name || values.guardian_last_name;
    if (hasGuardianInfo) {
      const phone = values.guardian_phone || values.mobile;
      const existing = await client.query('SELECT id FROM onec_guardians WHERE phone = $1 LIMIT 1', [phone]);

      let guardianId;
      if (existing.rows.length > 0) {
        guardianId = existing.rows[0].id;
      } else {
        const guardianMeta = values.guardian_email ? { email: values.guardian_email } : {};
        const gInsert = await client.query(
          `INSERT INTO onec_guardians (user_id, first_name, last_name, phone, address, whatsapp_opt_in, meta)
           VALUES (NULL, $1, $2, $3, $4, false, $5) RETURNING id`,
          [values.guardian_first_name || 'Guardian', values.guardian_last_name || values.last_name, phone, values.guardian_address || '', guardianMeta]
        );
        guardianId = gInsert.rows[0].id;
      }

      await client.query(
        `INSERT INTO onec_learner_guardian_map (learner_id, guardian_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [learnerId, guardianId]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function insertStaffLikeRow(client, entityType, values) {
  const table = entityType === 'instructor' ? 'onec_instructors' : 'onec_staff';
  await client.query('BEGIN');
  try {
    let userId = null;
    if (values.password) {
      const password_hash = await bcrypt.hash(values.password, 10);
      const userResult = await client.query(
        `INSERT INTO onec_users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`,
        [values.username, values.email, password_hash, entityType]
      );
      userId = userResult.rows[0].id;
    }

    const meta = {};
    if (values.gender) meta.gender = values.gender;

    await client.query(
      `INSERT INTO ${table} (user_id, staff_id, first_name, last_name, phone, meta) VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, values.staff_id, values.first_name, values.last_name, values.mobile, meta]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

function friendlyDbError(err) {
  if (err.code === '23505') {
    const detail = err.detail || '';
    if (/username/.test(detail)) return 'Username is already in use.';
    if (/email/.test(detail)) return 'Email is already in use.';
    if (/registry_no/.test(detail)) return 'Registry/Roll number is already in use.';
    if (/staff_id/.test(detail)) return 'Staff/Employee ID is already in use.';
    return 'A unique value on this row (username, email, or ID) is already in use.';
  }
  return err.message || 'Unknown error while saving this row.';
}

async function updateJobProgress(client, jobId, successCount, failureCount) {
  await client.query('UPDATE onec_bulk_upload_jobs SET success_count = $1, failure_count = $2 WHERE id = $3', [
    successCount,
    failureCount,
    jobId
  ]);
}

// Runs on its own dedicated pool connection, not the request's req.db —
// req.db is released back to the pool as soon as the response finishes
// (see middleware/tenantDb.js), and this can easily still be inserting rows
// hundreds of milliseconds to minutes after that response was sent. Reusing
// req.db here would race a completely different request's tenantDb setup
// for the same pooled connection (wrong search_path, cross-tenant writes) —
// this opens and pins its own connection to `schemaName` for the whole job
// and releases it only when done, exactly like tenantDb.js does per-request.
async function processJob({ jobId, entityType, schemaName, headerKeyMap, rawRows }) {
  const client = await db.getPool().connect();
  const errors = [];
  let successCount = 0;

  try {
    await client.query(`SET search_path TO "${schemaName}"`);

    let cohortMap = null;
    if (entityType === 'learner') {
      const cohorts = await client.query('SELECT id, name FROM onec_cohorts');
      cohortMap = new Map();
      for (const c of cohorts.rows) {
        const norm = normalizeHeader(c.name);
        if (!cohortMap.has(norm)) cohortMap.set(norm, []);
        cohortMap.get(norm).push(c.id);
      }
    }

    for (let i = 0; i < rawRows.length; i++) {
      const rowNumber = i + 2; // row 1 is the header in the spreadsheet the admin is looking at
      const values = extractRowValues(headerKeyMap, rawRows[i]);
      const exportData = buildExportData(entityType, values);

      const validation =
        entityType === 'learner' ? validateLearnerRow(values, cohortMap) : validateStaffLikeRow(values);

      if (!validation.ok) {
        errors.push({ row: rowNumber, error: validation.error, data: exportData });
      } else {
        try {
          if (entityType === 'learner') await insertLearnerRow(client, validation.values);
          else await insertStaffLikeRow(client, entityType, validation.values);
          successCount++;
        } catch (err) {
          errors.push({ row: rowNumber, error: friendlyDbError(err), data: exportData });
        }
      }

      const isLast = i === rawRows.length - 1;
      if (isLast || (successCount + errors.length) % 10 === 0) {
        await updateJobProgress(client, jobId, successCount, errors.length);
      }
    }

    const status = errors.length === 0 ? 'completed' : successCount === 0 ? 'failed' : 'completed_with_errors';
    await client.query(
      `UPDATE onec_bulk_upload_jobs SET status = $1, success_count = $2, failure_count = $3, errors = $4, completed_at = CURRENT_TIMESTAMP WHERE id = $5`,
      [status, successCount, errors.length, JSON.stringify(errors), jobId]
    );
  } catch (err) {
    console.error('Bulk upload job failed unexpectedly:', err);
    // Reuse whatever per-row errors/successes were already accumulated in
    // the loop above (e.g. the crash happened in the final status UPDATE,
    // after every row was already processed) instead of discarding them —
    // only synthesize a generic entry if nothing had been recorded yet.
    const finalErrors = errors.length > 0 || successCount > 0
      ? [...errors, { row: 0, error: `Processing stopped unexpectedly: ${err.message}`, data: {} }]
      : [{ row: 0, error: `Processing stopped unexpectedly: ${err.message}`, data: {} }];
    try {
      await client.query(
        `UPDATE onec_bulk_upload_jobs SET status = 'failed', success_count = $1, failure_count = $2, errors = $3, completed_at = CURRENT_TIMESTAMP WHERE id = $4`,
        [successCount, finalErrors.length, JSON.stringify(finalErrors), jobId]
      );
    } catch (updateErr) {
      console.error('Failed to record bulk upload job failure:', updateErr);
    }
  } finally {
    client.release();
  }
}

module.exports = {
  MAX_DATA_ROWS,
  parseUploadedFile,
  buildHeaderKeyMap,
  getMissingRequiredHeaders,
  processJob
};
