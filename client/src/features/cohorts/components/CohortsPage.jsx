import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, BookOpen, ChevronRight } from 'lucide-react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader } from '../../../components/PageHeader';
import { useUnits } from '../../units/hooks/useUnits';
import { useCohorts, useCreateCohort, useUpdateCohort, useDeleteCohort } from '../hooks/useCohorts';
import { CohortFormModal } from './CohortFormModal';

export function CohortsPage() {
  const { t } = useConfig();
  const { can } = useAuth();
  const { data: cohorts, isLoading, error } = useCohorts();
  const { data: units } = useUnits({ enabled: can('units.view') });
  const createCohort = useCreateCohort();
  const updateCohort = useUpdateCohort();
  const deleteCohort = useDeleteCohort();

  const [showForm, setShowForm] = useState(false);
  const [editingCohort, setEditingCohort] = useState(null);
  const [search, setSearch] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterTerm, setFilterTerm] = useState('');

  function unitName(unitId) {
    if (!unitId) return '—';
    return (units || []).find((unit) => unit.id === unitId)?.name || `#${unitId}`;
  }

  const filteredCohorts = useMemo(() => {
    if (!cohorts) return [];
    return cohorts.filter((cohort) => {
      const matchSearch = cohort.name.toLowerCase().includes(search.toLowerCase()) ||
        `${cohort.advisor_first_name || ''} ${cohort.advisor_last_name || ''}`.toLowerCase().includes(search.toLowerCase());
      const matchUnit = !filterUnit || cohort.unit_id === parseInt(filterUnit);
      const matchTerm = !filterTerm || cohort.time_block === filterTerm;
      return matchSearch && matchUnit && matchTerm;
    });
  }, [cohorts, search, filterUnit, filterTerm]);

  const uniqueTerms = useMemo(() => {
    if (!cohorts) return [];
    return [...new Set(cohorts.map((c) => c.time_block))].filter(Boolean).sort();
  }, [cohorts]);

  const stats = useMemo(() => {
    if (!cohorts) return { total: 0, students: 0 };
    return {
      total: cohorts.length,
      students: cohorts.reduce((sum, c) => sum + (c.learner_count || 0), 0)
    };
  }, [cohorts]);

  return (
    <div>
      <PageHeader
        eyebrow={`Management / ${t('cohorts')}`}
        title={t('cohorts')}
        actions={
          can('cohorts.manage') && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink hover:bg-accent-dark transition"
            >
              + Add {t('cohort')}
            </button>
          )
        }
      />

      {cohorts && (
        <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light">
              <BookOpen className="h-5 w-5 text-accent" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Total Classes</div>
              <div className="text-2xl font-bold text-ink-900">{stats.total}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-info" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Total Students</div>
              <div className="text-2xl font-bold text-ink-900">{stats.students}</div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 space-y-3 rounded-lg border border-border bg-surface p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search classes or teachers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-border-subtle bg-surface-muted px-10 py-2.5 rounded-lg text-sm text-ink-900 placeholder:text-ink-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-20 transition"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {units && units.length > 0 && (
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="text-sm border border-border-subtle bg-surface-muted px-3 py-2 rounded-lg text-ink-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-20 transition"
            >
              <option value="">All Units</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          )}

          {uniqueTerms.length > 0 && (
            <select
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              className="text-sm border border-border-subtle bg-surface-muted px-3 py-2 rounded-lg text-ink-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-20 transition"
            >
              <option value="">All Terms</option>
              {uniqueTerms.map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-ink-500">
          Loading classes…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger bg-danger-light p-4 text-sm font-semibold text-danger">
          {error.message}
        </div>
      )}

      {cohorts && filteredCohorts.length === 0 && !isLoading && (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <BookOpen className="mx-auto mb-2 h-12 w-12 text-ink-300" strokeWidth={1.5} />
          <div className="text-sm font-semibold text-ink-900">No classes found</div>
          <div className="mt-1 text-xs text-ink-500">
            {search || filterUnit || filterTerm ? 'Try adjusting your search or filters' : 'No classes available'}
          </div>
        </div>
      )}

      {cohorts && filteredCohorts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCohorts.map((cohort) => (
            <CohortCard
              key={cohort.id}
              cohort={cohort}
              unitName={unitName(cohort.unit_id)}
              canManage={can('cohorts.manage')}
              onEdit={() => setEditingCohort(cohort)}
              onDelete={() => {
                if (window.confirm(`Are you sure you want to delete ${cohort.name}?`)) {
                  deleteCohort.mutate(cohort.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {showForm && (
        <CohortFormModal
          onClose={() => setShowForm(false)}
          submitting={createCohort.isPending}
          submitError={createCohort.error?.message}
          onSubmit={(values) =>
            createCohort.mutate(values, { onSuccess: () => setShowForm(false) })
          }
        />
      )}

      {editingCohort && (
        <CohortFormModal
          initialData={editingCohort}
          onClose={() => setEditingCohort(null)}
          submitting={updateCohort.isPending}
          submitError={updateCohort.error?.message}
          onSubmit={(values) =>
            updateCohort.mutate({ id: editingCohort.id, payload: values }, { onSuccess: () => setEditingCohort(null) })
          }
        />
      )}
    </div>
  );
}

function CohortCard({ cohort, unitName, canManage, onEdit, onDelete }) {
  return (
    <Link to={`/app/cohorts/${cohort.id}`}>
      <div className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition hover:border-accent hover:shadow-md active:scale-[0.99]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-ink-900 truncate">{cohort.name}</div>
            <div className="mt-1 text-xs text-ink-500 truncate">
              {cohort.advisor_first_name ? `${cohort.advisor_first_name} ${cohort.advisor_last_name}` : '—'}
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onEdit();
                }}
                className="text-xs font-semibold text-ink-500 hover:text-ink-900 transition"
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onDelete();
                }}
                className="text-xs font-semibold text-danger hover:opacity-80 transition"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 text-[12px]">
          <span className="inline-block px-2 py-1 rounded-full bg-accent-light text-accent font-semibold">
            {cohort.learner_count || 0} students
          </span>
          {cohort.time_block && (
            <span className="inline-block px-2 py-1 rounded-full bg-surface-muted text-ink-600 font-semibold">
              {cohort.time_block}
            </span>
          )}
        </div>

        {unitName && unitName !== '—' && (
          <div className="text-[11px] text-ink-500">Unit: {unitName}</div>
        )}

        <div className="mt-auto flex items-center gap-1 text-xs font-semibold text-accent group-hover:translate-x-0.5 transition">
          View Details
          <ChevronRight className="h-3 w-3" strokeWidth={2} />
        </div>
      </div>
    </Link>
  );
}
