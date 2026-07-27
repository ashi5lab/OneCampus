import { MultiSearchSelect } from '../../../components/MultiSearchSelect';
import { RoleBadge } from '../../../components/RoleBadge';

const ROLE_GROUPS = ['learner', 'instructor', 'guardian', 'staff', 'admin'];

function groupLabel(role, t) {
  if (role === 'learner') return t('learners');
  if (role === 'instructor') return t('instructors');
  if (role === 'guardian') return 'Guardians';
  if (role === 'staff') return 'Staff';
  if (role === 'admin') return 'Admins';
  return role;
}

// Combines three kinds of selectable tokens into one chip-based multi-select:
//   'all'          — every user in the tenant (mutually exclusive with everything else)
//   'group:<role>' — every user with that role (Students / Teachers / Guardians / Staff / Admins)
//   'user:<id>'    — one specific person
// The caller owns `value` (array of tokens) and resolves it to actual user
// ids via `resolveAudienceIds()` below — this component only manages the
// token selection + mutual-exclusivity UX, not id expansion.
export function AudienceMultiSelect({ users, value, onChange, t = (k) => k, placeholder = 'Search groups or users…' }) {
  const roleCounts = ROLE_GROUPS.reduce((acc, role) => {
    acc[role] = users.filter((u) => u.role === role).length;
    return acc;
  }, {});

  const options = [
    { value: 'all', type: 'all', label: `All Users (${users.length})` },
    ...ROLE_GROUPS.map((role) => ({
      value: `group:${role}`,
      type: 'group',
      role,
      label: `All ${groupLabel(role, t)} (${roleCounts[role]})`
    })),
    ...users.map((u) => ({
      value: `user:${u.id}`,
      type: 'user',
      role: u.role,
      label: u.name || u.username,
      username: u.username
    }))
  ];

  function handleChange(newValues) {
    const added = newValues.filter((v) => !value.includes(v));

    // Picking "All Users" (from any state) collapses the selection to just that.
    if (added.includes('all')) {
      onChange(['all']);
      return;
    }

    // Picking anything else while "All Users" was selected replaces it —
    // "All Users" + a specific person doesn't mean anything more than "all".
    if (value.includes('all') && added.length > 0) {
      onChange(newValues.filter((v) => v !== 'all'));
      return;
    }

    onChange(newValues);
  }

  return (
    <MultiSearchSelect
      options={options}
      values={value}
      onChange={handleChange}
      placeholder={placeholder}
      emptyMessage="No matching groups or users."
      renderOption={(option) => {
        if (option.type === 'all') {
          return <span className="font-semibold text-ink-900">🌐 {option.label}</span>;
        }
        if (option.type === 'group') {
          return <span className="font-semibold text-ink-900">👥 {option.label}</span>;
        }
        return (
          <span className="flex w-full items-center justify-between gap-2">
            <span className="flex flex-col truncate">
              <span className="truncate">{option.label}</span>
              {option.username && option.username !== option.label && (
                <span className="truncate text-[11px] font-medium text-ink-500">{option.username}</span>
              )}
            </span>
            <RoleBadge role={option.role} />
          </span>
        );
      }}
    />
  );
}

// Expands the selected tokens into a flat, de-duplicated list of user ids —
// call this right before sending, not on every render of the picker.
export function resolveAudienceIds(selection, users) {
  if (selection.includes('all')) return users.map((u) => u.id);

  const ids = new Set();
  for (const token of selection) {
    if (token.startsWith('group:')) {
      const role = token.slice('group:'.length);
      users.filter((u) => u.role === role).forEach((u) => ids.add(u.id));
    } else if (token.startsWith('user:')) {
      ids.add(Number(token.slice('user:'.length)));
    }
  }
  return Array.from(ids);
}
