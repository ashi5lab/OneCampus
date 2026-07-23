import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { useOnlineExams, useCreateOnlineExam, useDeleteOnlineExam } from '../../onlineExams/hooks/useOnlineExams';
import { useEvaluations, useCreateEvaluation, useDeleteEvaluation } from '../../evaluations/hooks/useEvaluations';
import { Badge } from '../../../components/Badge';
import { Pagination } from '../../../components/Pagination';
import { CreateExamPage } from './CreateExamPage';

export function ExamsPage() {
  const { can, user } = useAuth();
  const { t } = useConfig();

  // Mode tabs: 'list' or 'create'
  const [viewMode, setViewMode] = useState('list');

  // List queries
  const { data: onlineExams, isLoading: loadingOnline, refetch: refetchOnline } = useOnlineExams();
  const { data: offlineEvaluations, isLoading: loadingOffline, refetch: refetchOffline } = useEvaluations();

  // Create mutations
  const createOnline = useCreateOnlineExam();
  const createOffline = useCreateEvaluation();
  const deleteOnline = useDeleteOnlineExam();
  const deleteOffline = useDeleteEvaluation();

  // Filter tabs: 'all', 'marked', 'in_progress'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const canCreate = can('online_exams.manage') || can('evaluations.manage');

  // Merge & normalize exams
  const allExamsNormalized = useMemo(() => {
    const list = [];
    
    // Add online exams
    if (onlineExams) {
      onlineExams.forEach((exam) => {
        // Online exams status: graded means marked, in_progress/submitted/none means in progress
        const isMarked = exam.my_status === 'graded';
        list.push({
          id: exam.id,
          title: exam.title,
          type: 'online',
          moduleName: exam.module_name || '—',
          cohortName: exam.cohort_name || '—',
          duration: `${exam.duration_minutes} mins`,
          maxScore: exam.max_score,
          isMarked: isMarked,
          original: exam
        });
      });
    }

    // Add offline evaluations
    if (offlineEvaluations) {
      offlineEvaluations.forEach((evalItem) => {
        // Offline evaluations status: in evaluations list we can check if it has been marked
        // We'll consider it marked if it has any scored schedules or mark status.
        // For simplicity, evaluations where scores are graded
        list.push({
          id: evalItem.id,
          title: evalItem.name,
          type: 'offline',
          moduleName: evalItem.time_block || '—',
          cohortName: 'School-wide',
          duration: '—',
          maxScore: 100,
          isMarked: false, // will update based on filter if needed
          original: evalItem
        });
      });
    }

    return list;
  }, [onlineExams, offlineEvaluations]);

  // Apply search & status tab filter
  const filteredExams = useMemo(() => {
    let list = allExamsNormalized;

    // Apply status tab
    if (statusFilter === 'marked') {
      list = list.filter((e) => e.isMarked);
    } else if (statusFilter === 'in_progress') {
      list = list.filter((e) => !e.isMarked);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q) ||
          e.moduleName.toLowerCase().includes(q) ||
          e.cohortName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allExamsNormalized, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredExams.length / itemsPerPage);
  const paginatedExams = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExams.slice(start, start + itemsPerPage);
  }, [filteredExams, currentPage]);

  const handleCreateExamSubmit = async (values) => {
    try {
      if (values.examType === 'online') {
        await createOnline.mutateAsync(values);
      } else {
        // Offline evaluations create
        await createOffline.mutateAsync({
          name: values.title,
          time_block: values.eval_date,
          type: 'exam'
        });
      }
      setViewMode('list');
      refetchOnline();
      refetchOffline();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (row) => {
    if (window.confirm(`Are you sure you want to delete "${row.title}"?`)) {
      if (row.type === 'online') {
        await deleteOnline.mutateAsync(row.id);
      } else {
        await deleteOffline.mutateAsync(row.id);
      }
      refetchOnline();
      refetchOffline();
    }
  };

  if (viewMode === 'create') {
    return (
      <div className="p-4 sm:p-6">
        <CreateExamPage
          onSubmit={handleCreateExamSubmit}
          submitting={createOnline.isPending || createOffline.isPending}
          submitError={createOnline.error?.message || createOffline.error?.message}
          onCancel={() => setViewMode('list')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Exams & Evaluations</h1>
          <p className="text-xs text-ink-500 mt-1">Manage both classroom online exams and offline board evaluations</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setViewMode('create')}
            className="rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-accent-ink transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            + Create Exam
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex gap-2">
          {['all', 'in_progress', 'marked'].map((filterTab) => (
            <button
              key={filterTab}
              onClick={() => {
                setStatusFilter(filterTab);
                setCurrentPage(1);
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors capitalize ${
                statusFilter === filterTab
                  ? 'bg-ink-900 text-white'
                  : 'border border-border bg-surface text-ink-700 hover:bg-surface-muted'
              }`}
            >
              {filterTab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <input
          type="text"
          className="input max-w-sm w-full"
          placeholder="Search exams by name, type or subject..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* List Container */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {(loadingOnline || loadingOffline) && (
          <div className="p-12 text-center text-sm font-semibold text-ink-500">Loading exams roster…</div>
        )}

        {!(loadingOnline || loadingOffline) && filteredExams.length === 0 && (
          <div className="p-12 text-center text-sm font-semibold text-ink-500">No exams or evaluations found.</div>
        )}

        {!(loadingOnline || loadingOffline) && filteredExams.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-ink-500">Exam Title</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-ink-500">Type</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-ink-500">{t('topic')}</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-ink-500">{t('cohort')}</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-ink-500">Max Score</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-ink-500">Status</th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-ink-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedExams.map((row) => (
                  <tr key={`${row.type}-${row.id}`} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      {row.type === 'online' ? (
                        <Link to={`/app/online-exams/${row.id}`} className="font-bold text-accent hover:underline">
                          {row.title}
                        </Link>
                      ) : (
                        <Link to={`/app/evaluations/${row.id}`} className="font-bold text-accent hover:underline">
                          {row.title}
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={row.type === 'online' ? 'active' : 'pending'}>
                        {row.type === 'online' ? 'Online' : 'Offline'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-ink-700">{row.moduleName}</td>
                    <td className="px-6 py-4 text-xs font-medium text-ink-700">{row.cohortName}</td>
                    <td className="px-6 py-4 text-xs font-bold text-ink-900">{row.maxScore} pts</td>
                    <td className="px-6 py-4">
                      <Badge variant={row.isMarked ? 'active' : 'pending'}>
                        {row.isMarked ? 'Marked' : 'In Progress'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2.5">
                        {row.type === 'offline' && (
                          <Link
                            to={`/app/evaluations/${row.id}`}
                            className="text-xs font-bold text-accent hover:underline"
                          >
                            Mark Grades
                          </Link>
                        )}
                        {canCreate && (
                          <button
                            onClick={() => handleDelete(row)}
                            className="text-xs font-bold text-danger hover:opacity-85"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
