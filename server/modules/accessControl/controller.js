const { z } = require('zod');
const { ALL_PERMISSIONS } = require('../../lib/permissions');
const { logAudit } = require('../../lib/audit');
const { listActiveUsers } = require('../../lib/userDirectory');

const ROLES = ['admin', 'staff', 'instructor', 'learner', 'guardian'];

const groupSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional().nullable(),
    permissions: z.array(z.enum(ALL_PERMISSIONS)).min(1, 'Choose at least one permission'),
    target_type: z.enum(['role', 'users']),
    target_role: z.enum(ROLES).optional().nullable(),
    user_ids: z.array(z.number().int()).optional().default([])
  })
  .refine((data) => data.target_type !== 'role' || !!data.target_role, {
    message: 'Choose which role this group applies to',
    path: ['target_role']
  })
  .refine((data) => data.target_type !== 'users' || data.user_ids.length > 0, {
    message: 'Choose at least one user',
    path: ['user_ids']
  });

async function listGroups(req, res) {
  try {
    const groups = await req.db.query(
      `SELECT g.*, u.username AS created_by_username
       FROM onec_access_groups g
       LEFT JOIN onec_users u ON g.created_by = u.id
       ORDER BY g.created_at DESC`
    );
    const members = await req.db.query(
      `SELECT m.group_id, m.user_id, u.username, u.role
       FROM onec_access_group_members m
       JOIN onec_users u ON m.user_id = u.id`
    );
    const membersByGroup = new Map();
    for (const row of members.rows) {
      if (!membersByGroup.has(row.group_id)) membersByGroup.set(row.group_id, []);
      membersByGroup.get(row.group_id).push({ id: row.user_id, username: row.username, role: row.role });
    }

    const data = groups.rows.map((g) => ({ ...g, members: membersByGroup.get(g.id) || [] }));
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Every active user — the picker for target_type='users'.
async function listUsers(req, res) {
  try {
    const users = await listActiveUsers(req);
    res.json({ data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function listPermissions(req, res) {
  res.json({ data: ALL_PERMISSIONS });
}

async function createGroup(req, res) {
  try {
    if (Array.isArray(req.body.permissions)) {
      req.body.permissions = req.body.permissions.filter(p => ALL_PERMISSIONS.includes(p));
    }
    const parsed = groupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const { name, description, permissions, target_type, target_role, user_ids } = parsed.data;

    await req.db.query('BEGIN');
    try {
      if (target_type === 'role') {
        const existingRoleGroup = await req.db.query('SELECT id FROM onec_access_groups WHERE target_type = $1 AND target_role = $2', ['role', target_role]);
        if (existingRoleGroup.rows.length > 0) {
          await req.db.query('ROLLBACK');
          return res.status(400).json({ error: `An access group already exists for the role '${target_role}'. Please edit the existing group.` });
        }
      } else if (target_type === 'users' && user_ids.length > 0) {
        const existingUsers = await req.db.query(
          `SELECT user_id FROM onec_access_group_members WHERE user_id = ANY($1::int[])`,
          [user_ids]
        );
        if (existingUsers.rows.length > 0) {
          await req.db.query('ROLLBACK');
          return res.status(400).json({ error: `User ID ${existingUsers.rows[0].user_id} already belongs to an access group. A user can only belong to one specific access group.` });
        }
      }

      const result = await req.db.query(
        `INSERT INTO onec_access_groups (name, description, permissions, target_type, target_role, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, description ?? null, JSON.stringify(permissions), target_type, target_type === 'role' ? target_role : null, req.user.userId]
      );
      const group = result.rows[0];

      if (target_type === 'users') {
        for (const userId of user_ids) {
          await req.db.query('INSERT INTO onec_access_group_members (group_id, user_id) VALUES ($1, $2)', [group.id, userId]);
        }
      }

      await req.db.query('COMMIT');
      logAudit(req, 'access_control.group_created', { group_id: group.id, name, target_type, target_role });
      res.status(201).json({ data: group });
    } catch (err) {
      await req.db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateGroup(req, res) {
  try {
    const { id } = req.params;
    if (Array.isArray(req.body.permissions)) {
      req.body.permissions = req.body.permissions.filter(p => ALL_PERMISSIONS.includes(p));
    }
    const parsed = groupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const { name, description, permissions, target_type, target_role, user_ids } = parsed.data;

    await req.db.query('BEGIN');
    try {
      if (target_type === 'role') {
        const existingRoleGroup = await req.db.query('SELECT id FROM onec_access_groups WHERE target_type = $1 AND target_role = $2 AND id != $3', ['role', target_role, id]);
        if (existingRoleGroup.rows.length > 0) {
          await req.db.query('ROLLBACK');
          return res.status(400).json({ error: `An access group already exists for the role '${target_role}'.` });
        }
      } else if (target_type === 'users' && user_ids.length > 0) {
        const existingUsers = await req.db.query(
          `SELECT user_id FROM onec_access_group_members WHERE user_id = ANY($1::int[]) AND group_id != $2`,
          [user_ids, id]
        );
        if (existingUsers.rows.length > 0) {
          await req.db.query('ROLLBACK');
          return res.status(400).json({ error: `User ID ${existingUsers.rows[0].user_id} already belongs to another access group.` });
        }
      }

      const result = await req.db.query(
        `UPDATE onec_access_groups SET name = $1, description = $2, permissions = $3, target_type = $4, target_role = $5
         WHERE id = $6 RETURNING *`,
        [name, description ?? null, JSON.stringify(permissions), target_type, target_type === 'role' ? target_role : null, id]
      );
      if (result.rows.length === 0) {
        await req.db.query('ROLLBACK');
        return res.status(404).json({ error: 'Not found' });
      }

      await req.db.query('DELETE FROM onec_access_group_members WHERE group_id = $1', [id]);
      if (target_type === 'users') {
        for (const userId of user_ids) {
          await req.db.query('INSERT INTO onec_access_group_members (group_id, user_id) VALUES ($1, $2)', [id, userId]);
        }
      }

      await req.db.query('COMMIT');
      logAudit(req, 'access_control.group_updated', { group_id: result.rows[0].id, name, target_type, target_role });
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

async function deleteGroup(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('DELETE FROM onec_access_groups WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    logAudit(req, 'access_control.group_deleted', { group_id: result.rows[0].id, name: result.rows[0].name });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { listGroups, listUsers, listPermissions, createGroup, updateGroup, deleteGroup };
