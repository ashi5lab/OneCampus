import { SearchSelect } from './SearchSelect';
import { RoleBadge } from './RoleBadge';

// Reusable "search across all users, optionally filtered by role" picker —
// used anywhere a form needs to pick a person (library borrower, message
// recipient, and any future feature needing the same). `roles` narrows the
// pool (e.g. ['learner'] for students-only, ['instructor'] for
// teachers-only); omit it (or pass an empty array) to search every active
// user regardless of role.
//
// Each user needs {id, username, role} and may optionally carry `name`
// (the person's actual first+last name, joined server-side from whichever
// profile table applies — see server/lib/userDirectory.js). Admin/any user
// with no such row falls back to username-only.
export function UserSearchSelect({ users, roles, value, onChange, placeholder = 'Search by name…', disabled = false }) {
  const pool = roles?.length ? users.filter((u) => roles.includes(u.role)) : users;
  const options = pool.map((u) => ({
    value: u.id,
    // Plain-text label — this is what the closed input displays and what
    // typing filters against, so it has to carry the same information the
    // colored badge conveys visually (never rely on the dropdown-only
    // color+letter as the sole way to tell users apart).
    label: u.name && u.name !== u.username ? `${u.name} (${u.username})` : u.username,
    role: u.role
  }));

  return (
    <SearchSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      emptyMessage="No matching users."
      renderOption={(option) => (
        <span className="flex items-center justify-between gap-2">
          <span className="truncate">{option.label}</span>
          <RoleBadge role={option.role} />
        </span>
      )}
    />
  );
}
