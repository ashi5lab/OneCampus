import { SearchSelect } from './SearchSelect';

// Reusable "search across all users, optionally filtered by role" picker —
// used anywhere a form needs to pick a person (library borrower, message
// recipient, and any future feature needing the same). `roles` narrows the
// pool (e.g. ['learner'] for students-only, ['instructor'] for
// teachers-only); omit it (or pass an empty array) to search every active
// user regardless of role.
export function UserSearchSelect({ users, roles, value, onChange, placeholder = 'Search by name…', disabled = false }) {
  const pool = roles?.length ? users.filter((u) => roles.includes(u.role)) : users;
  const options = pool.map((u) => ({ value: u.id, label: `${u.username} (${u.role})` }));

  return (
    <SearchSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      emptyMessage="No matching users."
    />
  );
}
