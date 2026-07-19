import { useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useModules } from '../../modules/hooks/useModules';
import { useInstructorModules, useCreateInstructorModule, useRemoveInstructorModule } from '../hooks/useInstructorModules';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

// Manages onec_instructor_modules for one teacher — same relationship
// InstructorFormModal seeds at creation time, just editable afterward from
// the Teacher Subjects tab. Mirrors GuardianLinksModal's shape exactly.
export function InstructorModulesModal({ instructor, onClose }) {
  useBodyScrollLock();
  const { t } = useConfig();
  const { data: modules, isLoading: modulesLoading } = useModules();
  const { data: links, isLoading: linksLoading } = useInstructorModules();
  const createLink = useCreateInstructorModule();
  const removeLink = useRemoveInstructorModule();
  const [selectedModuleId, setSelectedModuleId] = useState('');

  const isLoading = modulesLoading || linksLoading;
  const linkedModuleIds = (links || [])
    .filter((link) => link.instructor_id === instructor.id)
    .map((link) => link.module_id);
  const linkedModules = (modules || []).filter((module) => linkedModuleIds.includes(module.id));
  const unlinkedModules = (modules || []).filter((module) => !linkedModuleIds.includes(module.id));

  function handleAdd() {
    if (!selectedModuleId) return;
    createLink.mutate(
      { instructor_id: instructor.id, module_id: Number(selectedModuleId) },
      { onSuccess: () => setSelectedModuleId('') }
    );
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40">
      <div className="w-[440px] rounded border-2 border-accent bg-surface p-6">
        <div className="mb-1 text-base font-bold text-ink-900">
          {t('topics')} — {instructor.first_name} {instructor.last_name}
        </div>
        <div className="mb-4 text-[11.5px] text-ink-500">
          {t('topics')} this {t('instructor').toLowerCase()} teaches.
        </div>

        {isLoading && <div className="py-4 text-center text-sm text-ink-500">Loading…</div>}

        {!isLoading && (
          <>
            {linkedModules.length === 0 && (
              <div className="mb-3 rounded border border-border bg-surface-muted p-3 text-[12.5px] text-ink-500">
                No {t('topics').toLowerCase()} assigned yet.
              </div>
            )}
            {linkedModules.length > 0 && (
              <ul className="mb-3 divide-y divide-surface-muted rounded border border-border">
                {linkedModules.map((module) => (
                  <li key={module.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-[13px] text-ink-900">
                      {module.name}
                      {module.code && <span className="ml-1.5 font-mono text-[11px] text-ink-500">{module.code}</span>}
                    </span>
                    <button
                      onClick={() => removeLink.mutate({ instructorId: instructor.id, moduleId: module.id })}
                      disabled={removeLink.isPending}
                      className="text-[11.5px] font-semibold text-danger disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <select
                className="input flex-1"
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
              >
                <option value="">Select a {t('topic').toLowerCase()}…</option>
                {unlinkedModules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                disabled={!selectedModuleId || createLink.isPending}
                className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
              >
                Add
              </button>
            </div>
            {(createLink.error || removeLink.error) && (
              <div className="mt-2 text-[11px] font-semibold text-danger">
                {createLink.error?.message || removeLink.error?.message}
              </div>
            )}
          </>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
