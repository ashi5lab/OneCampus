import { useState } from 'react';
import { UserSearchSelect } from '../../../components/UserSearchSelect';
import { useAllPermissions, useAccessControlUsers, useCreateAccessGroup, useUpdateAccessGroup } from '../hooks/useAccessControl';

const ROLES = ['admin', 'staff', 'instructor', 'learner', 'guardian'];

// Groups the flat ALL_PERMISSIONS list ("learners.view", "learners.manage",
// "library.view", ...) by their module prefix, purely for laying out the
// checkbox grid in digestible sections — the prefix has no meaning to the
// backend beyond being part of the permission string itself.
function groupByModule(permissions) {
  const groups = new Map();
  for (const permission of permissions) {
    const [module] = permission.split('.');
    if (!groups.has(module)) groups.set(module, []);
    groups.get(module).push(permission);
  }
  return Array.from(groups.entries());
}

export function AccessGroupFormModal({ onClose, initialData = null }) {
  const isEdit = !!initialData;
  const { data: allPermissions } = useAllPermissions();
  const { data: users } = useAccessControlUsers();
  const createGroup = useCreateAccessGroup();
  const updateGroup = useUpdateAccessGroup();
  const mutation = isEdit ? updateGroup : createGroup;

  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [permissions, setPermissions] = useState(new Set(initialData?.permissions || []));
  const [targetType, setTargetType] = useState(initialData?.target_type || 'role');
  const [targetRole, setTargetRole] = useState(initialData?.target_role || '');
  const [userIds, setUserIds] = useState((initialData?.members || []).map((m) => m.id));
  const [formError, setFormError] = useState('');

  const usersById = new Map((users || []).map((u) => [u.id, u]));
  const permissionGroups = groupByModule(allPermissions || []);

  function togglePermission(permission) {
    setPermissions((prev) => {
      const next = new Set(prev);
      next.has(permission) ? next.delete(permission) : next.add(permission);
      return next;
    });
  }

  function addUser(userId) {
    if (!userIds.includes(userId)) setUserIds((prev) => [...prev, userId]);
  }
  function removeUser(userId) {
    setUserIds((prev) => prev.filter((id) => id !== userId));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) return setFormError('Name is required.');
    if (permissions.size === 0) return setFormError('Choose at least one permission.');
    if (targetType === 'role' && !targetRole) return setFormError('Choose which role this applies to.');
    if (targetType === 'users' && userIds.length === 0) return setFormError('Choose at least one user.');

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      permissions: Array.from(permissions),
      target_type: targetType,
      target_role: targetType === 'role' ? targetRole : undefined,
      user_ids: targetType === 'users' ? userIds : undefined
    };

    if (isEdit) {
      updateGroup.mutate({ id: initialData.id, payload }, { onSuccess: onClose });
    } else {
      createGroup.mutate(payload, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-ink-900/40 p-4">
      <form onSubmit={handleSubmit} className="my-8 w-full max-w-[640px] rounded border border-border bg-surface p-6">
        <div className="mb-4 text-base font-bold text-ink-900">{isEdit ? 'Edit' : 'Create'} Access Group</div>

        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Name</div>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Library Coordinators" />
        </label>
        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Description (optional)</div>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="mb-3">
          <div className="mb-1.5 text-xs font-semibold text-ink-700">Applies to</div>
          <div className="mb-2 flex gap-4">
            <label className="flex items-center gap-1.5 text-[13px] text-ink-700">
              <input type="radio" checked={targetType === 'role'} onChange={() => setTargetType('role')} />
              A role
            </label>
            <label className="flex items-center gap-1.5 text-[13px] text-ink-700">
              <input type="radio" checked={targetType === 'users'} onChange={() => setTargetType('users')} />
              Specific user(s)
            </label>
          </div>

          {targetType === 'role' && (
            <select className="input" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
              <option value="" disabled>
                Choose a role…
              </option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role[0].toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          )}

          {targetType === 'users' && (
            <div>
              <UserSearchSelect users={users || []} value={null} onChange={addUser} placeholder="Search and add users…" />
              {userIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {userIds.map((id) => (
                    <span key={id} className="flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[11.5px] font-semibold text-ink-700">
                      {usersById.get(id)?.username || `#${id}`}
                      <button type="button" onClick={() => removeUser(id)} className="text-danger">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-3">
          <div className="mb-1.5 text-xs font-semibold text-ink-700">
            Permissions ({permissions.size} selected)
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto rounded border border-border bg-surface-muted p-3">
            {permissionGroups.map(([module, perms]) => (
              <div key={module}>
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-500">{module.replace(/_/g, ' ')}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {perms.map((permission) => (
                    <label key={permission} className="flex items-center gap-1.5 text-[12.5px] text-ink-700">
                      <input type="checkbox" checked={permissions.has(permission)} onChange={() => togglePermission(permission)} />
                      {permission.split('.')[1]}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {(formError || mutation.error) && (
          <div className="mb-3 text-xs font-semibold text-danger">{formError || mutation.error.message}</div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
