import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { instructorFormSchema, instructorUpdateSchema } from '../types';
import { useConfig } from '../../../contexts/ConfigContext';
import { useModules } from '../../modules/hooks/useModules';
import { useInstructorModules, useCreateInstructorModule, useRemoveInstructorModule } from '../hooks/useInstructorModules';
import { apiClient } from '../../../lib/apiClient';

export function InstructorForm({ onClose, onSubmit, submitting, submitError, initialData = null }) {
  const { t } = useConfig();
  const isEdit = !!initialData;
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(isEdit ? instructorUpdateSchema : instructorFormSchema),
    defaultValues: initialData ? { ...initialData, gender: initialData.meta?.gender || '' } : {}
  });

  const firstName = useWatch({ control, name: 'first_name', defaultValue: '' });
  const staffId = useWatch({ control, name: 'staff_id', defaultValue: '' });
  const username = useWatch({ control, name: 'username', defaultValue: '' });

  const [suggestedUsername, setSuggestedUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('idle');

  // Debounced effect for suggesting username
  useEffect(() => {
    if (isEdit) return;

    const handler = setTimeout(async () => {
      if (firstName.length > 0 && staffId.length > 0 && !suggestedUsername) {
        try {
          const res = await apiClient.get('/auth/suggest-username', { first_name: firstName, id_seed: staffId });
          if (res?.data?.username) {
            setSuggestedUsername(res.data.username);
            setValue('username', res.data.username, { shouldValidate: true });
            setUsernameStatus('available');
          }
        } catch (e) {
          // ignore error
        }
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [firstName, staffId, isEdit, suggestedUsername, setValue]);

  const handleUsernameChange = (e) => {
    setValue('username', e.target.value, { shouldValidate: true });
    if (e.target.value !== suggestedUsername) {
      setUsernameStatus('idle');
    }
  };

  const handleCheckAvailability = async () => {
    if (!username) return;
    setUsernameStatus('checking');
    try {
      const res = await apiClient.get('/auth/check-username', { username });
      if (res?.data?.available) {
        setUsernameStatus('available');
        setValue('username', res.data.formattedUsername);
      } else {
        setUsernameStatus('unavailable');
      }
    } catch (e) {
      setUsernameStatus('unavailable');
    }
  };

  // Instructor-specific modules linkage
  const { data: modules } = useModules();
  const { data: moduleLinks } = useInstructorModules({ enabled: isEdit });
  const createModuleLink = useCreateInstructorModule();
  const removeModuleLink = useRemoveInstructorModule();
  const [selectedModuleIds, setSelectedModuleIds] = useState([]);

  useEffect(() => {
    if (!isEdit || !moduleLinks) return;
    setSelectedModuleIds(
      moduleLinks.filter((link) => link.instructor_id === initialData.id).map((link) => link.module_id)
    );
  }, [isEdit, moduleLinks, initialData?.id]);

  function toggleModule(moduleId) {
    setSelectedModuleIds((current) =>
      current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId]
    );
  }

  async function handleFormSubmit({ gender, username: submittedUsername, ...values }) {
    if (isEdit) {
      const currentLinkedIds = (moduleLinks || [])
        .filter((link) => link.instructor_id === initialData.id)
        .map((link) => link.module_id);
      const toAdd = selectedModuleIds.filter((id) => !currentLinkedIds.includes(id));
      const toRemove = currentLinkedIds.filter((id) => !selectedModuleIds.includes(id));
      await Promise.all([
        ...toAdd.map((module_id) => createModuleLink.mutateAsync({ instructor_id: initialData.id, module_id })),
        ...toRemove.map((module_id) => removeModuleLink.mutateAsync({ instructorId: initialData.id, moduleId: module_id }))
      ]);
    }

    onSubmit({
      ...values,
      username: submittedUsername || undefined,
      meta: { ...(initialData?.meta || {}), gender: gender || undefined },
      ...(isEdit ? {} : { module_ids: selectedModuleIds })
    });
  }

  const isSubmitDisabled = submitting || (!isEdit && usernameStatus !== 'available');

  return (
    <div className="bg-surface rounded border border-border p-6 shadow-sm">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="w-full max-w-[600px]">
        <div className="mb-6 pb-4 border-b border-border flex items-center justify-between">
          <div className="text-lg font-bold text-ink-900">
            {isEdit ? 'Edit' : 'Add'} {t('instructor')}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-ink-500 hover:text-ink-900"
          >
            Back
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="First Name" error={errors.first_name}>
            <input className="input w-full" {...register('first_name')} />
          </Field>
          <Field label="Last Name" error={errors.last_name}>
            <input className="input w-full" {...register('last_name')} />
          </Field>
          <Field label="Staff ID" error={errors.staff_id}>
            <input className="input w-full" {...register('staff_id')} />
          </Field>
          <Field label="Phone (optional)" error={errors.phone}>
            <input className="input w-full" {...register('phone')} />
          </Field>
          <Field label="Gender (optional)" error={errors.gender}>
            <select className="input w-full" {...register('gender')}>
              <option value="">Unspecified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Email (optional)" error={errors.email}>
            <input type="email" className="input w-full" {...register('email')} />
          </Field>
        </div>

        <div className="mt-4 mb-4">
          <div className="mb-1.5 text-xs font-semibold text-ink-700">{t('topics')} (optional)</div>
          <div className="max-h-[160px] overflow-y-auto rounded border border-border p-2">
            {(modules || []).length === 0 && (
              <div className="px-2 py-1.5 text-[12.5px] text-ink-500">No {t('topics').toLowerCase()} set up yet.</div>
            )}
            {(modules || []).map((module) => (
              <label key={module.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-[13px] text-ink-900 hover:bg-surface-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedModuleIds.includes(module.id)}
                  onChange={() => toggleModule(module.id)}
                />
                {module.name}
              </label>
            ))}
          </div>
        </div>

        {!isEdit && (
          <div className="mt-6 p-4 rounded bg-surface-muted border border-border">
            <div className="mb-2 text-[13px] font-semibold text-ink-900">Account Username</div>
            <div className="mb-3 text-[12px] text-ink-500">
              Type the first name and staff ID to auto-generate a username, or type a custom one. A password will be generated automatically.
            </div>
            
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <div className="flex-1 w-full relative">
                <input 
                  type="text" 
                  className="input w-full pr-10" 
                  value={username} 
                  onChange={handleUsernameChange}
                  placeholder="Username"
                />
                {usernameStatus === 'available' && (
                  <div className="absolute right-3 top-2.5 text-success">✓</div>
                )}
                {usernameStatus === 'unavailable' && (
                  <div className="absolute right-3 top-2.5 text-danger">✗</div>
                )}
              </div>
              <button
                type="button"
                onClick={handleCheckAvailability}
                disabled={!username || usernameStatus === 'checking'}
                className="rounded border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-50 whitespace-nowrap"
              >
                {usernameStatus === 'checking' ? 'Checking...' : 'Check Availability'}
              </button>
            </div>
            {usernameStatus === 'unavailable' && (
              <div className="mt-2 text-[11px] font-semibold text-danger">This username is already taken or invalid.</div>
            )}
            {usernameStatus === 'idle' && username.length > 0 && (
              <div className="mt-2 text-[11px] font-semibold text-warning">Please check availability before saving.</div>
            )}
          </div>
        )}

        {submitError && (
          <div className="mt-4 p-3 rounded bg-danger/10 text-xs font-semibold text-danger">{submitError}</div>
        )}

        <div className="mt-6 pt-4 border-t border-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="rounded bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-60"
          >
            {submitting ? 'Saving...' : `Save ${t('instructor')}`}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold text-ink-700">{label}</div>
      {children}
      {error && <div className="mt-1 text-[11px] font-semibold text-danger">{error.message}</div>}
    </label>
  );
}
