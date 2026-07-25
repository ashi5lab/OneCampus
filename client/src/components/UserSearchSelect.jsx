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
export function UserSearchSelect({ 
  users, 
  roles, 
  value, 
  onChange, 
  placeholder = 'Search by name…', 
  disabled = false,
  showUsername = true,
  showClass = true,
  showRole = true
}) {
  const pool = roles?.length ? users.filter((u) => roles.includes(u.role)) : users;
  const options = pool.map((u) => {
    let nameStr = u.name || u.username;
    if (showClass && u.cohort_name) {
      nameStr += ` (${u.cohort_name})`;
    }
    
    return {
      value: u.id,
      label: nameStr,
      username: u.username,
      role: u.role
    };
  });

  return (
    <SearchSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      emptyMessage="No matching users."
      renderOption={(option) => (
        <span className="flex items-center justify-between gap-2 w-full">
          <span className="flex flex-col truncate">
            <span className="truncate">{option.label}</span>
            {showUsername && option.username !== option.label && (
              <span className="text-[11px] text-ink-500 font-medium truncate">{option.username}</span>
            )}
          </span>
          {showRole && <RoleBadge role={option.role} />}
        </span>
      )}
    />
  );
}
