import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Phone, MessageCircle, Calendar, User, Users, CheckCircle, TrendingUp, Trophy, Smile, Grid, BookOpen, MoreHorizontal, ChevronRight, FileText, Download } from 'lucide-react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader, useAutoBack } from '../../../components/PageHeader';
import { ProfilePictureUploader } from '../../profile/components/ProfilePictureUploader';
import { Avatar } from '../../../components/Avatar';
import { useLearnerProfile, useUpdateLearner, useDeleteLearner } from '../hooks/useLearners';
import { LearnerForm } from './LearnerForm';
import { certificatesApi } from '../../certificates/services/certificatesApi';
import toast from 'react-hot-toast';
import { evaluationsApi } from '../../evaluations/services/evaluationsApi';
import { ReportCardModal } from '../../evaluations/components/ReportCardModal';
import { idCardsApi } from '../../idCards/services/idCardsApi';
import { MarkAlumniModal } from '../../alumni/components/MarkAlumniModal';
import { LearnerGuardianLinksModal } from '../../guardians/components/LearnerGuardianLinksModal';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';

const STATUS_VARIANT = { active: 'active', pending: 'pending', inactive: 'inactive', alumni: 'pending' };
const ATTENDANCE_STATUS_ORDER = ['present', 'absent', 'late', 'excused'];

const TABS = [
  { key: 'overview', label: 'Overview', icon: Grid },
  { key: 'academics', label: 'Academics', icon: BookOpen },
  { key: 'attendance', label: 'Attendance', icon: Calendar },
  { key: 'behavior', label: 'Behavior', icon: Smile },
  { key: 'more', label: 'More', icon: MoreHorizontal }
];

// Simple SVG Line Chart for Academic Performance
function AcademicPerformanceChart({ scores }) {
  if (!scores || scores.length === 0) return <div className="h-40 flex items-center justify-center text-ink-400 text-sm">No trend data</div>;
  
  const width = 300;
  const height = 150;
  const padding = 20;
  
  // Group by evaluation to simulate a trend over time
  // For simplicity, we just plot the average score for each evaluation in chronological order
  const evals = {};
  scores.forEach(s => {
    if (!evals[s.evaluation_id]) evals[s.evaluation_id] = { name: s.evaluation_name, total: 0, count: 0, max: 0 };
    evals[s.evaluation_id].total += Number(s.score_obtained);
    evals[s.evaluation_id].max += Number(s.max_score);
    evals[s.evaluation_id].count += 1;
  });
  
  const pointsData = Object.values(evals).map(e => (e.total / e.max) * 100);
  if (pointsData.length === 0) pointsData.push(0);
  if (pointsData.length === 1) pointsData.unshift(0); // need at least 2 points for a line
  
  const minVal = 0;
  const maxVal = 100;
  
  const getX = (index) => padding + (index * (width - 2 * padding)) / (pointsData.length - 1);
  const getY = (val) => height - padding - ((val - minVal) / (maxVal - minVal)) * (height - 2 * padding);

  const pathD = `M ${pointsData.map((val, i) => `${getX(i)},${getY(val)}`).join(' L ')}`;

  return (
    <div className="w-full overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-ink-500 font-semibold">Performance Trend</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto drop-shadow-sm">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(val => (
          <g key={val}>
            <text x="0" y={getY(val) + 4} fontSize="10" fill="#a0aec0">{val}</text>
            <line x1={padding} y1={getY(val)} x2={width} y2={getY(val)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
          </g>
        ))}
        {/* Line */}
        <path d={pathD} fill="none" stroke="#6d4cea" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {pointsData.map((val, i) => (
          <circle key={i} cx={getX(i)} cy={getY(val)} r="4" fill="#6d4cea" stroke="#fff" strokeWidth="2" />
        ))}
        {/* Gradient Fill under line */}
        <path d={`${pathD} L ${width},${height - padding} L ${padding},${height - padding} Z`} fill="url(#gradient)" opacity="0.2" />
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6d4cea" stopOpacity="1" />
            <stop offset="100%" stopColor="#6d4cea" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Custom SVG Doughnut Chart for Attendance
function AttendanceDoughnutChart({ attendanceRate, counts }) {
  const size = 120;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  
  const presentRate = attendanceRate || 0;
  const presentOffset = circumference - (presentRate / 100) * circumference;
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle (absent/late) */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        {/* Present circle */}
        <circle 
          cx={center} cy={center} r={radius} fill="none" stroke="#10b981" 
          strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={presentOffset}
          strokeLinecap="round" 
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-ink-900">{presentRate}%</span>
        <span className="text-[9px] text-ink-400 font-bold uppercase tracking-wider">Attendance</span>
      </div>
    </div>
  );
}

export function LearnerProfilePage() {
  const { id } = useParams();
  const learnerId = Number(id);
  const navigate = useNavigate();
  const { t } = useConfig();
  const { profile: ownProfile, can } = useAuth();
  const { data, isLoading, error } = useLearnerProfile(learnerId);
  const updateLearner = useUpdateLearner();
  const deleteLearner = useDeleteLearner();
  const [tab, setTab] = useState('overview');
  const [viewingEvaluationId, setViewingEvaluationId] = useState(null);
  const [showMarkAlumni, setShowMarkAlumni] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showGuardianLinks, setShowGuardianLinks] = useState(false);

  const isOwnProfile = ownProfile?.learnerId === learnerId;
  const canManage = can('learners.manage');
  const canManageGuardianLinks = can('guardian_links.manage');

  // Get subjects overview for the academic performance card
  const subjectScores = useMemo(() => {
    if (!data?.scores) return [];
    const subs = {};
    data.scores.forEach(s => {
      if (!subs[s.module_name]) subs[s.module_name] = { score: 0, max: 0 };
      subs[s.module_name].score += Number(s.score_obtained);
      subs[s.module_name].max += Number(s.max_score);
    });
    return Object.entries(subs).map(([name, d]) => ({
      name,
      pct: Math.round((d.score / d.max) * 100)
    })).slice(0, 5); // show top 5 for the card
  }, [data?.scores]);

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="rounded border border-border bg-surface p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  const { learner, guardians, attendance, scores, certificates } = data;
  
  const attendanceCounts = Object.fromEntries(attendance.summary.map((row) => [row.status, row.count]));
  const totalAttendance = attendance.summary.reduce((sum, row) => sum + row.count, 0);
  const attendanceRate = totalAttendance > 0 ? Math.round(((attendanceCounts.present ?? 0) / totalAttendance) * 100) : null;
  const avgScorePct = scores.length > 0
    ? Math.round((scores.reduce((sum, s) => sum + Number(s.score_obtained) / Number(s.max_score), 0) / scores.length) * 100)
    : null;

  const primaryGuardian = guardians.length > 0 ? guardians[0] : null;

  function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${learner.first_name} ${learner.last_name}?`)) return;
    deleteLearner.mutate(learnerId, { onSuccess: () => navigate('/app/learners') });
  }

  return (
    <div className="pb-10 max-w-[1200px] mx-auto space-y-6">
      {/* 
        This will configure the global Topbar automatically. 
        It replaces the inline header for the profile redesign.
      */}
      <PageHeader 
        title="Student Profile" 
        actions={
          canManage && (
            <button
              onClick={() => setShowEdit(true)}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-ink hover:opacity-90 transition-opacity"
            >
              Edit Profile
            </button>
          )
        }
      />

      {showEdit ? (
        <div className="py-4 bg-surface rounded-2xl shadow-sm border border-border p-6">
          <LearnerForm
            initialData={learner}
            onClose={() => setShowEdit(false)}
            submitting={updateLearner.isPending}
            submitError={updateLearner.error?.message}
            onSubmit={(values) =>
              updateLearner.mutate({ id: learnerId, payload: values }, { 
                onSuccess: () => {
                  setShowEdit(false);
                  toast.success(`${t('learner')} updated successfully!`);
                } 
              })
            }
          />
        </div>
      ) : (
        <>
          {/* Header Card (Avatar, Contact, Info) */}
          <div className="bg-surface rounded-[24px] shadow-sm border border-border overflow-hidden">
            <div className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
              {/* Avatar Section */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-indigo-50 shadow-sm overflow-hidden bg-surface-muted flex items-center justify-center">
                  {isOwnProfile ? (
                    <ProfilePictureUploader
                      name={`${learner.first_name} ${learner.last_name}`}
                      pictureUrl={learner.profile_picture_url}
                      invalidateKey={['learners', learnerId, 'profile']}
                    />
                  ) : (
                    <Avatar name={`${learner.first_name} ${learner.last_name}`} src={learner.profile_picture_url} size={128} className="w-full h-full" />
                  )}
                </div>
              </div>

              {/* Info Section */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-ink-900 flex items-center justify-center md:justify-start gap-3">
                      {learner.first_name} {learner.last_name}
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                        {learner.registry_no}
                      </span>
                    </h1>
                    <p className="text-ink-500 text-sm mt-1 font-medium">
                      {learner.cohort_name || 'No Class Assigned'} • Roll No. {learner.id}
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-center md:justify-end gap-3">
                    {primaryGuardian?.phone && (
                      <>
                        <a href={`tel:${primaryGuardian.phone}`} className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-bold transition-colors">
                          <Phone className="w-4 h-4 fill-current" />
                          <span>Call</span>
                        </a>
                        <a href={`https://wa.me/${primaryGuardian.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-bold transition-colors">
                          <MessageCircle className="w-4 h-4 fill-current" />
                          <span>WhatsApp</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>

                <hr className="my-5 border-border" />

                {/* Quick Details Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-ink-400 font-bold uppercase tracking-wider">DOB</p>
                      <p className="text-sm font-semibold text-ink-900">{learner.meta?.date_of_birth ? new Date(learner.meta.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-ink-400 font-bold uppercase tracking-wider">Gender</p>
                      <p className="text-sm font-semibold text-ink-900">{learner.meta?.gender ? learner.meta.gender.charAt(0).toUpperCase() + learner.meta.gender.slice(1) : '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-ink-400 font-bold uppercase tracking-wider">Guardian</p>
                      <p className="text-sm font-semibold text-ink-900 truncate max-w-[150px]" title={primaryGuardian ? `${primaryGuardian.first_name} ${primaryGuardian.last_name}` : '—'}>
                        {primaryGuardian ? `${primaryGuardian.first_name} ${primaryGuardian.last_name}` : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-surface rounded-2xl shadow-sm border border-border p-4 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <CheckCircle className="w-4 h-4" />
              </div>
              <p className="text-xs text-ink-500 font-semibold mb-1">Attendance</p>
              <p className="text-xl font-extrabold text-ink-900">{attendanceRate != null ? `${attendanceRate}%` : '—'}</p>
              <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{attendanceRate >= 90 ? 'Excellent' : attendanceRate >= 75 ? 'Good' : 'Needs Impr.'}</p>
            </div>
            
            <div className="bg-surface rounded-2xl shadow-sm border border-border p-4 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-xs text-ink-500 font-semibold mb-1">Avg Score</p>
              <p className="text-xl font-extrabold text-ink-900">{avgScorePct != null ? `${avgScorePct}%` : '—'}</p>
              <p className="text-[11px] font-bold text-indigo-600 mt-0.5">{avgScorePct >= 80 ? 'Excellent' : 'Average'}</p>
            </div>

            <div className="bg-surface rounded-2xl shadow-sm border border-border p-4 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <Trophy className="w-4 h-4" />
              </div>
              <p className="text-xs text-ink-500 font-semibold mb-1">Class Rank</p>
              <p className="text-xl font-extrabold text-ink-900">N/A</p>
              <p className="text-[11px] font-bold text-blue-600 mt-0.5">Not Ranked</p>
            </div>

            <div className="bg-surface rounded-2xl shadow-sm border border-border p-4 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-2">
                <Smile className="w-4 h-4" />
              </div>
              <p className="text-xs text-ink-500 font-semibold mb-1">Behavior Score</p>
              <p className="text-xl font-extrabold text-ink-900">4.8 <span className="text-sm font-medium text-ink-400">/ 5</span></p>
              <p className="text-[11px] font-bold text-emerald-600 mt-0.5">Good</p>
            </div>
          </div>

          {/* Main Layout (Grid on Desktop, Stacked on Mobile) */}
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left Content Area */}
            <div className="flex-1 space-y-6">
              
              {/* Tab Bar */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const isActive = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${
                        isActive 
                          ? 'bg-indigo-50 text-indigo-700' 
                          : 'bg-transparent text-ink-500 hover:bg-surface-muted hover:text-ink-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-ink-400'}`} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Contents */}
              {tab === 'overview' && (
                <div className="space-y-6">
                  
                  {/* Academic Performance */}
                  <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-extrabold text-ink-900">Academic Performance</h2>
                      <button onClick={() => setTab('academics')} className="text-xs font-bold text-indigo-600 flex items-center hover:underline">
                        View all <ChevronRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Subject List */}
                      <div className="space-y-4">
                        {subjectScores.length > 0 ? subjectScores.map((sub, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-sm font-semibold text-ink-800">
                              <div className={`w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                              {sub.name}
                            </div>
                            <span className={`text-sm font-bold ${sub.pct >= 80 ? 'text-emerald-600' : sub.pct >= 50 ? 'text-orange-500' : 'text-danger'}`}>
                              {sub.pct}/100
                            </span>
                          </div>
                        )) : (
                          <div className="text-sm text-ink-400 font-medium">No subject data recorded yet.</div>
                        )}
                      </div>
                      
                      {/* Chart Area */}
                      <div className="bg-surface-muted/50 rounded-xl p-4 border border-border/50">
                        <AcademicPerformanceChart scores={scores} />
                      </div>
                    </div>
                  </div>

                  {/* Attendance Overview */}
                  <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-extrabold text-ink-900">Attendance Overview</h2>
                      <button onClick={() => setTab('attendance')} className="text-xs font-bold text-indigo-600 flex items-center hover:underline">
                        View all <ChevronRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                      <AttendanceDoughnutChart attendanceRate={attendanceRate} counts={attendanceCounts} />
                      
                      <div className="flex-1 space-y-3 w-full">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-ink-700 font-medium"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Present</div>
                          <span className="font-bold text-ink-900">{attendanceCounts.present || 0} Days</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-ink-700 font-medium"><div className="w-2 h-2 rounded-full bg-red-500"></div> Absent</div>
                          <span className="font-bold text-ink-900">{attendanceCounts.absent || 0} Days</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-ink-700 font-medium"><div className="w-2 h-2 rounded-full bg-orange-400"></div> Late</div>
                          <span className="font-bold text-ink-900">{attendanceCounts.late || 0} Days</span>
                        </div>
                      </div>
                      
                      <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 min-w-[140px] text-center w-full sm:w-auto">
                        <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider mb-2">Overall Total</p>
                        <p className="text-2xl font-extrabold text-indigo-900">{totalAttendance}</p>
                        <p className="text-[11px] font-semibold text-indigo-500 mt-1">Days Logged</p>
                      </div>
                    </div>
                  </div>

                  {/* Behavior Summary */}
                  <div className="bg-surface rounded-2xl shadow-sm border border-border p-5 flex items-center justify-between cursor-pointer hover:bg-surface-muted transition-colors">
                    <div>
                      <h2 className="text-base font-extrabold text-ink-900 mb-1">Behavior Summary</h2>
                      <div className="flex items-center gap-3">
                        <span className="bg-emerald-50 text-emerald-700 text-sm font-bold px-2 py-1 rounded-md flex items-center gap-1.5">
                          <Smile className="w-4 h-4" /> 4.8 / 5 Good
                        </span>
                        <span className="text-xs text-ink-500 font-medium hidden sm:inline-block">No incidents reported this month.</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-ink-400" />
                  </div>
                </div>
              )}

              {/* Other Tabs (Re-used from old layout but restyled into cards) */}
              {tab === 'academics' && (
                <div className="space-y-5 bg-surface rounded-2xl shadow-sm border border-border p-5">
                  <div>
                    <h3 className="mb-3 text-sm font-extrabold text-ink-900">Exam Scores</h3>
                    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
                      <DataTable
                        columns={[
                          { key: 'module', header: t('topic'), render: (row) => <span className="font-semibold text-ink-800">{row.module_name}</span> },
                          { key: 'evaluation', header: 'Exam', render: (row) => row.evaluation_name },
                          { key: 'date', header: 'Date', render: (row) => <span className="text-ink-500">{new Date(row.eval_date).toLocaleDateString()}</span> },
                          {
                            key: 'score',
                            header: 'Score',
                            render: (row) => (
                              <span className={Number(row.score_obtained) < Number(row.passing_score) ? 'font-bold text-danger' : 'font-bold text-success'}>
                                {row.score_obtained} / {row.max_score}
                              </span>
                            )
                          }
                        ]}
                        rows={scores}
                        rowKey={(row) => row.id}
                        emptyMessage="No exam scores yet."
                      />
                    </div>
                  </div>
                </div>
              )}

              {tab === 'attendance' && (
                <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
                  <h3 className="mb-3 text-sm font-extrabold text-ink-900">Recent Attendance</h3>
                  <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
                    <DataTable
                      columns={[
                        { key: 'date', header: 'Date', render: (row) => <span className="font-medium">{new Date(row.date).toLocaleDateString()}</span> },
                        {
                          key: 'status',
                          header: 'Status',
                          render: (row) => <Badge variant={row.status === 'present' ? 'active' : row.status === 'absent' ? 'inactive' : 'pending'}>{row.status.toUpperCase()}</Badge>
                        },
                        { key: 'remarks', header: 'Remarks', render: (row) => <span className="text-ink-500 text-sm">{row.remarks || '—'}</span> }
                      ]}
                      rows={attendance.recent}
                      rowKey={(row) => row.id}
                      emptyMessage="No attendance records yet."
                    />
                  </div>
                </div>
              )}
              
              {tab === 'more' && (
                <div className="space-y-4">
                  <button onClick={() => idCardsApi.downloadLearnerCard(learnerId, learner.registry_no)} className="w-full bg-surface rounded-xl shadow-sm border border-border p-4 flex items-center justify-between hover:bg-surface-muted transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center"><User className="w-5 h-5" /></div>
                      <div><p className="font-bold text-ink-900">Download ID Card</p><p className="text-xs text-ink-500">Get a PDF copy of the student ID</p></div>
                    </div>
                    <Download className="w-5 h-5 text-ink-400" />
                  </button>
                  {canManage && learner.status !== 'alumni' && (
                    <button onClick={() => setShowMarkAlumni(true)} className="w-full bg-surface rounded-xl shadow-sm border border-border p-4 flex items-center justify-between hover:bg-surface-muted transition-colors text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center"><Trophy className="w-5 h-5" /></div>
                        <div><p className="font-bold text-ink-900">Mark as Alumni</p><p className="text-xs text-ink-500">Graduation or leaving the institution</p></div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-ink-400" />
                    </button>
                  )}
                  {canManage && (
                    <button onClick={handleDelete} className="w-full bg-red-50 rounded-xl border border-red-100 p-4 flex items-center justify-between hover:bg-red-100 transition-colors text-left">
                      <div className="flex items-center gap-3 text-red-700">
                        <div className="w-10 h-10 rounded-full bg-white text-red-600 flex items-center justify-center shadow-sm"><User className="w-5 h-5" /></div>
                        <div><p className="font-bold">Delete Profile</p><p className="text-xs opacity-80">Permanently remove this record</p></div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Column / Sidebar */}
            <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-5">
              
              {/* Parent & Guardian */}
              <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" /> Parent & Guardian
                  </h3>
                  {canManageGuardianLinks && (
                    <button onClick={() => setShowGuardianLinks(true)} className="text-ink-400 hover:text-ink-900"><MoreHorizontal className="w-4 h-4" /></button>
                  )}
                </div>
                
                {guardians.length === 0 ? (
                  <p className="text-sm text-ink-500 text-center py-4 bg-surface-muted rounded-xl">No guardians linked.</p>
                ) : (
                  <div className="space-y-4">
                    {guardians.map(g => (
                      <div key={g.id} className="text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-ink-500 font-medium">Name</span>
                          <span className="font-bold text-ink-900">{g.first_name} {g.last_name}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-ink-500 font-medium">Phone</span>
                          <span className="font-bold text-ink-900">{g.phone || '—'}</span>
                        </div>
                        {g.email && (
                          <div className="flex justify-between items-center">
                            <span className="text-ink-500 font-medium">Email</span>
                            <span className="font-bold text-ink-900 truncate max-w-[120px]">{g.email}</span>
                          </div>
                        )}
                        <hr className="my-3 border-surface-muted" />
                      </div>
                    ))}
                    <button onClick={() => setShowGuardianLinks(true)} className="w-full text-center text-xs font-bold text-indigo-600 hover:underline">
                      View Full Details →
                    </button>
                  </div>
                )}
              </div>

              {/* Academic Details */}
              <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" /> Academic Details
                  </h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-ink-500 font-medium">Class</span>
                    <span className="font-bold text-ink-900">{learner.cohort_name || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink-500 font-medium">Admission No.</span>
                    <span className="font-bold text-ink-900">{learner.registry_no}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink-500 font-medium">Admitted</span>
                    <span className="font-bold text-ink-900">{learner.meta?.admission_date ? new Date(learner.meta.admission_date).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2 mb-4">
                  <Grid className="w-4 h-4 text-indigo-500" /> Quick Links
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setTab('academics')} className="bg-surface-muted hover:bg-indigo-50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-center transition-colors border border-transparent hover:border-indigo-100">
                    <FileText className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs font-bold text-ink-700">Report Card</span>
                  </button>
                  <button className="bg-surface-muted hover:bg-indigo-50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-center transition-colors border border-transparent hover:border-indigo-100 opacity-60 cursor-not-allowed">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    <span className="text-xs font-bold text-ink-700">Time Table</span>
                  </button>
                  <button className="bg-surface-muted hover:bg-indigo-50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-center transition-colors border border-transparent hover:border-indigo-100 opacity-60 cursor-not-allowed">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    <span className="text-xs font-bold text-ink-700">Exam Schedule</span>
                  </button>
                  <button className="bg-surface-muted hover:bg-indigo-50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-center transition-colors border border-transparent hover:border-indigo-100 opacity-60 cursor-not-allowed">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <span className="text-xs font-bold text-ink-700">Fee Receipts</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {viewingEvaluationId && (
        <ReportCardModal evaluationId={viewingEvaluationId} learnerId={learnerId} onClose={() => setViewingEvaluationId(null)} />
      )}
      {showMarkAlumni && <MarkAlumniModal learner={learner} onClose={() => setShowMarkAlumni(false)} />}
      {showGuardianLinks && <LearnerGuardianLinksModal learner={learner} onClose={() => setShowGuardianLinks(false)} />}
    </div>
  );
}
