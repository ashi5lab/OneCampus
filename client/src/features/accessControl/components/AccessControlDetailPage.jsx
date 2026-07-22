import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserSearchSelect } from '../../../components/UserSearchSelect';
import { PageHeader, BackButton } from '../../../components/PageHeader';
import { useAllPermissions, useAccessControlUsers, useCreateAccessGroup, useUpdateAccessGroup, useAccessGroups } from '../hooks/useAccessControl';
import { useConfig } from '../../../contexts/ConfigContext';

const ROLES = ['admin', 'staff', 'instructor', 'learner', 'guardian'];

const MODULE_LABELS = {
  'modules': 'Subjects / Courses',
  'guardian_links': 'Guardians',
  'instructor_modules': 'Subjects of Teachers',
  'instructor_cohorts': 'Add teacher to class',
  'cohorts': 'Manage Class',
  'class': 'Class Channel'
};

function groupByModule(permissions) {
  const groups = new Map();
  for (const permission of permissions) {
    const [module] = permission.split('.');
    if (!groups.has(module)) groups.set(module, []);
    groups.get(module).push(permission);
  }
  return Array.from(groups.entries());
}

export function AccessControlDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id !== 'new';
  const { config } = useConfig();

  const { data: groups, isLoading: groupsLoading } = useAccessGroups();
  const { data: allPermissions } = useAllPermissions();
  const { data: users } = useAccessControlUsers();
  const createGroup = useCreateAccessGroup();
  const updateGroup = useUpdateAccessGroup();
  const mutation = isEdit ? updateGroup : createGroup;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState(new Set());
  const [targetType, setTargetType] = useState('role');
  const [targetRole, setTargetRole] = useState('');
  const [userIds, setUserIds] = useState([]);
  const [formError, setFormError] = useState('');

  // Hydrate initial data if editing
  useEffect(() => {
    if (isEdit && groups) {
      const group = groups.find((g) => String(g.id) === id);
      if (group) {
        setName(group.name || '');
        setDescription(group.description || '');
        setPermissions(new Set(group.permissions || []));
        setTargetType(group.target_type || 'role');
        setTargetRole(group.target_role || '');
        setUserIds((group.members || []).map((m) => m.id));
      }
    }
  }, [id, isEdit, groups]);

  const usersById = new Map((users || []).map((u) => [u.id, u]));
  
  // Filter out kindergarten_activity if the tenant doesn't have it enabled
  const isKindergartenActive = config?.active_modules?.includes('kindergarten_activity');
  const filteredPermissions = (allPermissions || []).filter(p => {
    if (p.startsWith('kindergarten_activity') && !isKindergartenActive) return false;
    return true;
  });

  const permissionGroups = groupByModule(filteredPermissions);

  function togglePermission(permission) {
    setPermissions((prev) => {
      const next = new Set(prev);
      next.has(permission) ? next.delete(permission) : next.add(permission);
      return next;
    });
  }

  function toggleModule(modulePerms, checked) {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (checked) {
        modulePerms.forEach(p => next.add(p));
      } else {
        modulePerms.forEach(p => next.delete(p));
      }
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
      updateGroup.mutate({ id: Number(id), payload }, { onSuccess: () => navigate('/app/access-control') });
    } else {
      createGroup.mutate(payload, { onSuccess: () => navigate('/app/access-control') });
    }
  }

  if (isEdit && groupsLoading) {
    return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  }

  return (
    <div className="max-w-[860px] pb-12">
      <div className="mb-6 flex items-center gap-2 text-[13px] font-semibold text-ink-500">
        <BackButton onClick={() => navigate('/app/access-control')} />
        Back to Access Control
      </div>

      <PageHeader title={isEdit ? 'Edit Access Group' : 'New Access Group'} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded border border-border bg-surface p-5">
          <div className="mb-4 text-[15px] font-bold text-ink-900">Group Details</div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-xs font-semibold text-ink-700">Name</div>
              <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Library Coordinators" />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-semibold text-ink-700">Description (optional)</div>
              <input className="input w-full" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this group do?" />
            </label>
          </div>
        </div>

        <div className="rounded border border-border bg-surface p-5">
          <div className="mb-4 text-[15px] font-bold text-ink-900">Applies To</div>
          
          <div className="mb-4 flex gap-6">
            <label className="flex items-center gap-2 text-[13px] text-ink-900">
              <input type="radio" checked={targetType === 'role'} onChange={() => setTargetType('role')} className="accent-accent" />
              All users in a role
            </label>
            <label className="flex items-center gap-2 text-[13px] text-ink-900">
              <input type="radio" checked={targetType === 'users'} onChange={() => setTargetType('users')} className="accent-accent" />
              Specific user(s)
            </label>
          </div>

          {targetType === 'role' && (
            <div className="max-w-sm">
              <div className="mb-1 text-xs font-semibold text-ink-700">Target Role</div>
              <select className="input w-full" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
                <option value="" disabled>Choose a role…</option>
                {ROLES.map((role) => (
                  <option key={role} value={role}>{role[0].toUpperCase() + role.slice(1)}</option>
                ))}
              </select>
              <div className="mt-2 text-[11.5px] text-ink-500">
                You can only have one access group per role. This will grant additional permissions to everyone with this role.
              </div>
            </div>
          )}

          {targetType === 'users' && (
            <div className="max-w-md">
              <div className="mb-1 text-xs font-semibold text-ink-700">Select Users</div>
              <UserSearchSelect users={users || []} value={null} onChange={addUser} placeholder="Search and add users…" />
              
              {userIds.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {userIds.map((uid) => (
                    <span key={uid} className="flex items-center gap-1.5 rounded bg-surface-muted px-2.5 py-1 text-[12px] font-semibold text-ink-900 border border-border">
                      {usersById.get(uid)?.username || `#${uid}`}
                      <button type="button" onClick={() => removeUser(uid)} className="text-ink-400 hover:text-danger">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 text-[11.5px] text-ink-500">
                A user can only belong to one specific access group. Specific user permissions override role-based permissions.
              </div>
            </div>
          )}
        </div>

        <div className="rounded border border-border bg-surface p-5">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[15px] font-bold text-ink-900">Permissions</div>
            <div className="text-[12px] font-semibold text-ink-500">{permissions.size} selected</div>
          </div>
          <div className="mb-5 text-[12px] text-ink-500">
            Check the modules and specific actions this group should have access to.
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {permissionGroups.map(([module, perms]) => {
              const allChecked = perms.every(p => permissions.has(p));
              const someChecked = perms.some(p => permissions.has(p)) && !allChecked;
              
              return (
                <div key={module} className="rounded-lg border border-border bg-surface-muted p-4 shadow-sm">
                  <label className="mb-3 flex items-center justify-between border-b border-border pb-2">
                    <span className="text-[13px] font-bold uppercase tracking-wide text-ink-900">
                      {MODULE_LABELS[module] || module.replace(/_/g, ' ')}
                    </span>
                    <input 
                      type="checkbox" 
                      className="accent-accent"
                      checked={allChecked}
                      ref={input => { if (input) input.indeterminate = someChecked; }}
                      onChange={(e) => toggleModule(perms, e.target.checked)} 
                    />
                  </label>
                  <div className="flex flex-col gap-2">
                    {perms.map((permission) => (
                      <label key={permission} className="flex items-center gap-2 text-[13px] text-ink-700 hover:text-ink-900 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="accent-accent"
                          checked={permissions.has(permission)} 
                          onChange={() => togglePermission(permission)} 
                        />
                        {permission.split('.')[1]}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {(formError || mutation.error) && (
          <div className="mb-3 text-xs font-semibold text-danger">{formError || mutation.error.message}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-accent-ink disabled:opacity-60"
          >
            {mutation.isPending ? 'Saving…' : 'Save Access Group'}
          </button>
          <button type="button" onClick={() => navigate('/app/access-control')} className="rounded border border-border px-6 py-2.5 text-[13.5px] font-semibold text-ink-700 hover:bg-surface-muted">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
