import { useConfig } from '../../../contexts/ConfigContext';
import { SearchSelect } from '../../../components/SearchSelect';
import { UserSearchSelect } from '../../../components/UserSearchSelect';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useBroadcastUsers } from '../hooks/useBroadcast';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All users' },
  { value: 'cohort', label: 'A class / group' },
  { value: 'users', label: 'Specific users' }
];

// Shared audience selection for SMS sends and voicemail shares:
// { audience_type: 'all' | 'cohort' | 'users', audience_ids: number[] }.
// Controlled component — parent owns the value.
export function AudiencePicker({ value, onChange }) {
  const { t } = useConfig();
  const { data: cohorts } = useCohorts();
  const { data: users } = useBroadcastUsers({ enabled: value.audience_type === 'users' });

  function setType(audience_type) {
    onChange({ audience_type, audience_ids: [] });
  }

  function addUser(userId) {
    if (!value.audience_ids.includes(userId)) {
      onChange({ ...value, audience_ids: [...value.audience_ids, userId] });
    }
  }

  function removeUser(userId) {
    onChange({ ...value, audience_ids: value.audience_ids.filter((id) => id !== userId) });
  }

  const usersById = new Map((users || []).map((u) => [u.id, u]));

  return (
    <div>
      <div className="mb-2 flex gap-4">
        {AUDIENCE_OPTIONS.map((option) => (
          <label key={option.value} className="flex items-center gap-1.5 text-[13px] text-ink-700">
            <input
              type="radio"
              checked={value.audience_type === option.value}
              onChange={() => setType(option.value)}
            />
            {option.value === 'cohort' ? t('cohort') : option.label}
          </label>
        ))}
      </div>

      {value.audience_type === 'cohort' && (
        <SearchSelect
          options={(cohorts || []).map((c) => ({ value: c.id, label: c.name }))}
          value={value.audience_ids[0]}
          onChange={(id) => onChange({ ...value, audience_ids: [id] })}
          placeholder={`Search ${t('cohort').toLowerCase()}…`}
        />
      )}

      {value.audience_type === 'users' && (
        <div>
          <UserSearchSelect users={users || []} value={null} onChange={addUser} placeholder="Search and add users…" />
          {value.audience_ids.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {value.audience_ids.map((id) => (
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
  );
}
