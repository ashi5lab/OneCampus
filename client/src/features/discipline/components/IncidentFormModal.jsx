import { useState } from 'react';
import { useLearners } from '../../learners/hooks/useLearners';
import { useCreateDisciplineRecord, useUpdateDisciplineRecord } from '../hooks/useDiscipline';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
const SEVERITY_OPTIONS = [
  { value: 'positive', label: 'Positive note' },
  { value: 'minor', label: 'Minor incident' },
  { value: 'major', label: 'Major incident' }
];

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function IncidentFormModal({ initialData, onClose }) {
  useBodyScrollLock();
  const { data: learners } = useLearners();
  const createRecord = useCreateDisciplineRecord();
  const updateRecord = useUpdateDisciplineRecord();

  const isEdit = !!initialData;
  const [learnerId, setLearnerId] = useState(initialData?.learner_id ? String(initialData.learner_id) : '');
  const [incidentDate, setIncidentDate] = useState(initialData?.incident_date || todayIso());
  const [severity, setSeverity] = useState(initialData?.severity || 'minor');
  const [description, setDescription] = useState(initialData?.description || '');
  const [actionTaken, setActionTaken] = useState(initialData?.action_taken || '');

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      learner_id: Number(learnerId),
      incident_date: incidentDate,
      severity,
      description,
      action_taken: actionTaken || null
    };

    if (isEdit) {
      updateRecord.mutate(
        { id: initialData.id, payload },
        { onSuccess: () => onClose() }
      );
    } else {
      createRecord.mutate(payload, { onSuccess: () => onClose() });
    }
  }

  const isPending = isEdit ? updateRecord.isPending : createRecord.isPending;
  const errorMsg = isEdit ? updateRecord.error?.message : createRecord.error?.message;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="w-full max-w-[440px] rounded border-2 border-accent bg-surface p-6 my-auto">
        <div className="mb-4 text-base font-bold text-ink-900">{isEdit ? 'Edit Incident' : 'Log Incident'}</div>

        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Student</div>
          <select className="input w-full" required value={learnerId} onChange={(e) => setLearnerId(e.target.value)}>
            <option value="">Select…</option>
            {(learners || []).map((l) => (
              <option key={l.id} value={l.id}>{l.first_name} {l.last_name} ({l.registry_no})</option>
            ))}
          </select>
        </label>

        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Date</div>
          <input type="date" className="input w-full" required value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
        </label>

        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Severity</div>
          <select className="input w-full" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Description</div>
          <textarea className="input w-full" rows={3} required value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <label className="mb-4 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Action Taken (optional)</div>
          <textarea className="input w-full" rows={2} value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} />
        </label>

        {errorMsg && <div className="mb-3 text-xs font-semibold text-danger">{errorMsg}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !learnerId}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
