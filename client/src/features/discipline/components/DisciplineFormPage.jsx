import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAllUsers } from '../../profile/hooks/useProfile';
import { useDisciplineRecords, useCreateDisciplineRecord, useUpdateDisciplineRecord } from '../hooks/useDiscipline';
import { PageHeader } from '../../../components/PageHeader';
import { UserSearchSelect } from '../../../components/UserSearchSelect';

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

export function DisciplineFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: users } = useAllUsers();
  const { data: records, isLoading: recordsLoading } = useDisciplineRecords();
  
  const createRecord = useCreateDisciplineRecord();
  const updateRecord = useUpdateDisciplineRecord();

  // userId holds onec_users.id — the value UserSearchSelect always returns.
  // The server resolves this to onec_learners.id before inserting.
  const [userId, setUserId] = useState('');
  const [incidentDate, setIncidentDate] = useState(todayIso());
  const [severity, setSeverity] = useState('minor');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  // Populate data on edit mode — use learner_user_id (onec_users.id) so the
  // UserSearchSelect can match the correct option by user_id, not learner_id.
  useEffect(() => {
    if (isEdit && records) {
      const record = records.find(r => String(r.id) === id);
      if (record) {
        setUserId(record.learner_user_id ?? record.learner_id);
        setIncidentDate(record.incident_date);
        setSeverity(record.severity);
        setDescription(record.description || '');
        setActionTaken(record.action_taken || '');
      }
    }
  }, [isEdit, id, records]);

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      user_id: Number(userId),
      incident_date: incidentDate,
      severity,
      description,
      action_taken: actionTaken || null
    };

    if (isEdit) {
      updateRecord.mutate(
        { id: Number(id), payload },
        { onSuccess: () => navigate('/app/discipline') }
      );
    } else {
      createRecord.mutate(payload, { onSuccess: () => navigate('/app/discipline') });
    }
  }

  const isPending = isEdit ? updateRecord.isPending : createRecord.isPending;
  const errorMsg = isEdit ? updateRecord.error?.message : createRecord.error?.message;

  if (isEdit && recordsLoading) {
    return <div className="p-8 text-center text-sm text-ink-500">Loading record...</div>;
  }

  return (
    <div className="pb-12 max-w-3xl mx-auto">
      <PageHeader 
        title={isEdit ? 'Edit Record' : 'Log New Record'} 
        backTo="/app/discipline" 
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Incident Information Section */}
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
          <h2 className="text-[15px] font-bold text-ink-900 mb-5">Incident Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <label className="block">
              <div className="mb-1.5 text-xs font-semibold text-ink-700">Student</div>
              <UserSearchSelect
                users={users?.data || users || []}
                roles={['learner']}
                value={userId}
                onChange={setUserId}
                placeholder="Search by name…"
              />
            </label>

            <label className="block">
              <div className="mb-1.5 text-xs font-semibold text-ink-700">Date</div>
              <input type="date" className="input w-full" required value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="block">
              <div className="mb-1.5 text-xs font-semibold text-ink-700">Severity</div>
              <select className="input w-full" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                {SEVERITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Incident Details Section */}
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
          <h2 className="text-[15px] font-bold text-ink-900 mb-5">Incident Details</h2>
          
          <label className="block mb-5">
            <div className="mb-1.5 text-xs font-semibold text-ink-700">Description</div>
            <textarea 
              className="input w-full" 
              rows={4} 
              required 
              placeholder="Describe the incident in detail..."
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </label>

          <label className="block">
            <div className="mb-1.5 text-xs font-semibold text-ink-700">Action Taken (Optional)</div>
            <textarea 
              className="input w-full" 
              rows={3} 
              placeholder="What action was taken?"
              value={actionTaken} 
              onChange={(e) => setActionTaken(e.target.value)} 
            />
          </label>
        </div>

        {errorMsg && <div className="text-sm font-semibold text-danger">{errorMsg}</div>}

        <div className="flex justify-end gap-3 pt-4">
          <button 
            type="button" 
            onClick={() => navigate('/app/discipline')} 
            className="rounded-full border border-border px-6 py-2.5 text-[13.5px] font-semibold text-ink-700 hover:bg-surface-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !learnerId}
            className="rounded-full bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-accent-ink disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Saving…' : isEdit ? 'Update Record' : 'Save Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
