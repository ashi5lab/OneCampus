import { useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { PageHeader } from '../../../components/PageHeader';

// Optional modules that can be toggled by the tenant admin
const OPTIONAL_MODULES = [
  { key: 'library', label: 'Library', description: 'Enable book catalogue and lending management.' },
  { key: 'ptm', label: 'Parent-Teacher Meetings (PTM)', description: 'Enable scheduling for parent-teacher meetings.' },
  { key: 'certificates', label: 'Certificates', description: 'Enable issuing and printing of certificates.' },
  { key: 'messaging', label: 'Messaging', description: 'Enable direct messaging between users.' },
  { key: 'attendance', label: 'Attendance', description: 'Enable daily attendance tracking.' },
  { key: 'exams', label: 'Exams', description: 'Enable exam scheduling and results.' },
  { key: 'kindergarten_activity', label: 'Kindergarten Activity', description: 'Enable daily activity logging for kindergarten.' }
];

export function AppManagementPage() {
  const { config, reloadConfig, hasModule } = useConfig();
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeModules = config?.active_modules || [];
  const isGlobalVisible = config?.rules?.global_teacher_visibility || false;

  async function handleModuleToggle(moduleKey, checked) {
    setIsUpdating(true);
    setErrorMsg('');
    try {
      const nextModules = checked
        ? [...activeModules, moduleKey]
        : activeModules.filter((m) => m !== moduleKey);
        
      const { apiClient } = await import('../../../lib/apiClient');
      await apiClient.patch('/tenant/config/active-modules', { active_modules: nextModules });
      await reloadConfig();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update modules');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleRuleToggle(ruleKey, checked) {
    setIsUpdating(true);
    setErrorMsg('');
    try {
      const { apiClient } = await import('../../../lib/apiClient');
      await apiClient.patch('/tenant/config/rules', { rules: { [ruleKey]: checked } });
      await reloadConfig();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update rules');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="max-w-[860px]">
      <PageHeader eyebrow="Settings" title="App Management" />

      <div className="mb-6 rounded border border-border bg-surface p-5">
        <div className="mb-1 text-[15px] font-bold text-ink-900">Optional Features</div>
        <div className="mb-5 text-[12px] text-ink-500">
          Enable or disable optional modules for your institution. This takes effect immediately for all users.
        </div>

        <div className="divide-y divide-surface-muted border-t border-surface-muted">
          {OPTIONAL_MODULES.map((mod) => {
            const on = hasModule(mod.key);
            return (
              <div key={mod.key} className="flex items-center justify-between gap-3 py-3.5">
                <div>
                  <div className="text-[13px] font-semibold text-ink-900">{mod.label}</div>
                  <div className="text-[11.5px] text-ink-500">{mod.description}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={isUpdating}
                  onClick={() => handleModuleToggle(mod.key, !on)}
                  className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-surface-muted'}`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-transform ${
                      on ? 'translate-x-[18px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded border border-border bg-surface p-5">
        <div className="mb-1 text-[15px] font-bold text-ink-900">Tenant Rules</div>
        <div className="mb-5 text-[12px] text-ink-500">
          Configure global access overrides and policies.
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-surface-muted py-3.5">
          <div>
            <div className="text-[13px] font-semibold text-ink-900">Global Teacher Visibility</div>
            <div className="mt-0.5 text-[11.5px] text-ink-500 max-w-sm">
              If enabled, teachers can view classes, assignments, and exams for cohorts they do not teach. If disabled, teachers only see content for their assigned cohorts.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isGlobalVisible}
            disabled={isUpdating}
            onClick={() => handleRuleToggle('global_teacher_visibility', !isGlobalVisible)}
            className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${isGlobalVisible ? 'bg-accent' : 'bg-surface-muted'}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-transform ${
                isGlobalVisible ? 'translate-x-[18px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {errorMsg && <div className="mt-3 text-xs font-semibold text-danger">{errorMsg}</div>}
    </div>
  );
}
