import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Phone, MessageCircle, Calendar, User, Users, CheckCircle, TrendingUp, Trophy, Smile, Grid, BookOpen, MoreHorizontal, ChevronRight, FileText, Download } from 'lucide-react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader, useAutoBack } from '../../../components/PageHeader';
import { ProfilePictureUploader } from '../../profile/components/ProfilePictureUploader';
import { Avatar } from '../../../components/Avatar';
import { useLearnerProfile, useUpdateLearner, useDeleteLearner } from '../hooks/useLearners';
import { useDisciplineRecords } from '../../discipline/hooks/useDiscipline';
import { LearnerBehaviourPage } from './LearnerBehaviourPage';
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
  const { data: disciplineRecords } = useDisciplineRecords(learnerId);
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

  const behaviorStats = useMemo(() => {
    const records = Array.isArray(disciplineRecords) ? disciplineRecords : disciplineRecords?.data || [];
    if (records.length === 0) return { score: 800, count: 0 };
    
    let score = 800;
    records.forEach(r => {
      if (r.severity === 'positive') score += 5;
      if (r.severity === 'minor') score -= 2;
      if (r.severity === 'major') score -= 10;
    });
    return { 
      score: Math.max(300, Math.min(850, score)),
      count: records.length
    };
  }, [disciplineRecords]);

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
  const primaryGuardianPhone = primaryGuardian?.phone;
  const primaryGuardianWhatsapp = primaryGuardian?.meta?.whatsapp || primaryGuardian?.phone;
  const sameNumber = primaryGuardianPhone === primaryGuardianWhatsapp;

  function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${learner.first_name} ${learner.last_name}?`)) return;
    deleteLearner.mutate(learnerId, { onSuccess: () => navigate('/app/learners') });
  }

  return (
    <div className="pb-10 space-y-6">
      {/* 
        This will configure the global Topbar automatically. 
        It replaces the inline header for the profile redesign.
      */}
      <PageHeader title="Student Profile" />

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
          <div className="bg-[#4b43c4] rounded-[24px] shadow-sm overflow-hidden text-white mb-6 bg-gradient-to-br from-[#4b43c4] to-[#3a34a8] relative">
            {canManage && (
              <button
                onClick={() => setShowEdit(true)}
                className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-full text-xs font-bold transition-colors shadow-sm z-10"
              >
                <User className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                
                {/* Left: Avatar & Info */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 md:w-[104px] md:h-[104px] rounded-full border-[3px] border-white shadow-md overflow-hidden flex items-center justify-center bg-white/10 relative mt-4 md:mt-0">
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
                  <div className="text-center md:text-left pt-2">
                    <h1 className="text-2xl md:text-[28px] font-extrabold flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3 mb-1">
                      {learner.first_name} {learner.last_name}
                      <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide whitespace-nowrap">
                        {learner.registry_no}
                      </span>
                    </h1>
                    <p className="text-indigo-100/90 text-[13px] font-medium leading-relaxed">
                      {learner.cohort_name || 'No Class Assigned'}
                    </p>
                    <p className="text-indigo-100/90 text-[13px] font-medium leading-relaxed mb-2">
                      Roll No. {learner.id}
                    </p>
                    <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
                      <Smile className="w-3.5 h-3.5" />
                      Behavior Score: {behaviorStats.score}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0">
                  <div className="flex flex-wrap justify-center md:justify-end items-center gap-3 md:mt-12">
                    {(primaryGuardianPhone || primaryGuardianWhatsapp) && (
                      <div className="flex flex-col gap-2 mt-4 md:mt-0">
                        {sameNumber ? (
                          <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full border border-white/10 shadow-sm">
                            <div className="flex items-center gap-2">
                              <a href={`tel:${primaryGuardianPhone}`} className="flex items-center justify-center w-7 h-7 bg-white text-[#4b43c4] rounded-full transition-colors shadow-sm hover:bg-indigo-50" title="Call">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                              </a>
                              <a href={`https://wa.me/${primaryGuardianWhatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-center w-7 h-7 bg-[#25D366] text-white rounded-full transition-colors shadow-sm hover:bg-[#20b858]" title="WhatsApp">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                              </a>
                            </div>
                            <div className="w-px h-4 bg-white/20"></div>
                            <span className="text-xs font-bold tracking-wide">{primaryGuardianPhone}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {primaryGuardianPhone && (
                              <div className="flex items-center gap-3 bg-white/10 px-4 py-1.5 rounded-full border border-white/10 shadow-sm">
                                <a href={`tel:${primaryGuardianPhone}`} className="flex items-center justify-center w-6 h-6 bg-white text-[#4b43c4] rounded-full transition-colors shadow-sm hover:bg-indigo-50" title="Call">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                </a>
                                <span className="text-[11px] font-bold tracking-wide">{primaryGuardianPhone}</span>
                              </div>
                            )}
                            {primaryGuardianWhatsapp && (
                              <div className="flex items-center gap-3 bg-white/10 px-4 py-1.5 rounded-full border border-white/10 shadow-sm">
                                <a href={`https://wa.me/${primaryGuardianWhatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-center w-6 h-6 bg-[#25D366] text-white rounded-full transition-colors shadow-sm hover:bg-[#20b858]" title="WhatsApp">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                </a>
                                <span className="text-[11px] font-bold tracking-wide">{primaryGuardianWhatsapp}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Grid inside banner */}
              <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 pt-8 border-t border-white/10 relative">
                
                {/* Stat 1: CGPA */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white text-[#4b43c4] flex items-center justify-center shrink-0 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                  </div>
                  <div>
                    <p className="text-[11px] text-indigo-100/90 font-medium mb-0.5">CGPA</p>
                    <p className="text-xl font-extrabold leading-none mb-1">{avgScorePct != null ? `${(avgScorePct/10).toFixed(1)}/10` : '—'}</p>
                    <p className="text-[11px] font-bold text-emerald-400">{avgScorePct >= 80 ? 'Excellent' : 'Average'}</p>
                  </div>
                </div>

                {/* Stat 2: Class Rank */}
                <div className="flex items-center gap-4 relative">
                  <div className="hidden lg:block absolute -left-4 lg:-left-6 top-1/2 -translate-y-1/2 w-px h-12 bg-white/10"></div>
                  <div className="w-12 h-12 rounded-full bg-white text-[#4b43c4] flex items-center justify-center shrink-0 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/><polyline points="16 6 22 6 22 12"/></svg>
                  </div>
                  <div>
                    <p className="text-[11px] text-indigo-100/90 font-medium mb-0.5">Class Rank</p>
                    <p className="text-xl font-extrabold leading-none mb-1">{learner.meta?.rank || 'N/A'} <span className="text-sm font-medium text-indigo-200">/ {learner.meta?.total_students || '—'}</span></p>
                    <p className="text-[11px] font-bold text-[#b4c6fa]">Top 11%</p>
                  </div>
                </div>

                {/* Stat 3: Attendance */}
                <div className="flex items-center gap-4 relative">
                  <div className="hidden lg:block absolute -left-4 lg:-left-6 top-1/2 -translate-y-1/2 w-px h-12 bg-white/10"></div>
                  <div className="w-12 h-12 rounded-full bg-white text-[#4b43c4] flex items-center justify-center shrink-0 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>
                  </div>
                  <div>
                    <p className="text-[11px] text-indigo-100/90 font-medium mb-0.5">Attendance</p>
                    <p className="text-xl font-extrabold leading-none mb-1">{attendanceRate != null ? `${attendanceRate}%` : '—'}</p>
                    <p className="text-[11px] font-bold text-[#b4c6fa]">{attendanceRate >= 90 ? 'Good' : 'Needs Impr.'}</p>
                  </div>
                </div>

                {/* Stat 4: Days Present */}
                <div className="flex items-center gap-4 relative">
                  <div className="hidden lg:block absolute -left-4 lg:-left-6 top-1/2 -translate-y-1/2 w-px h-12 bg-white/10"></div>
                  <div className="w-12 h-12 rounded-full bg-white text-[#4b43c4] flex items-center justify-center shrink-0 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/></svg>
                  </div>
                  <div>
                    <p className="text-[11px] text-indigo-100/90 font-medium mb-0.5">Days Present</p>
                    <p className="text-xl font-extrabold leading-none mb-1">{attendanceCounts.present || 0} <span className="text-sm font-medium text-indigo-200">/ {totalAttendance}</span></p>
                    <p className="text-[11px] font-bold text-indigo-200">This Month</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Main Layout (Grid on Desktop, Stacked on Mobile) */}
          <div className="flex flex-col xl:flex-row gap-6">
            
            {/* Left Content Area */}
            <div className="flex-1 min-w-0 space-y-6">
              
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
                      <div className="divide-y divide-border/50">
                        {scores.length > 0 ? scores.slice(0, 5).map((sub, i) => (
                          <div key={i} className="flex items-center justify-between py-3 px-2 -mx-2 hover:bg-surface-muted/30 transition-colors rounded-lg">
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
                      
                      <div className="flex-1 divide-y divide-border/50 w-full text-sm">
                        <div className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-2 text-ink-700 font-medium"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Present</div>
                          <span className="font-bold text-ink-900">{attendanceCounts.present || 0} Days</span>
                        </div>
                        <div className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-2 text-ink-700 font-medium"><div className="w-2 h-2 rounded-full bg-red-500"></div> Absent</div>
                          <span className="font-bold text-ink-900">{attendanceCounts.absent || 0} Days</span>
                        </div>
                        <div className="flex items-center justify-between py-2.5">
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
                  <div onClick={() => setTab('behavior')} className="bg-surface rounded-2xl shadow-sm border border-border p-5 flex items-center justify-between cursor-pointer hover:bg-surface-muted transition-colors">
                    <div>
                      <h2 className="text-base font-extrabold text-ink-900 mb-1">Behavior Summary</h2>
                      <div className="flex items-center gap-3">
                        {behaviorStats.count === 0 ? (
                          <span className="bg-surface-muted text-ink-600 border border-border text-sm font-bold px-2 py-1 rounded-md flex items-center gap-1.5">
                            No records yet.
                          </span>
                        ) : (
                          <span className={`text-sm font-bold px-2 py-1 rounded-md flex items-center gap-1.5 ${
                            behaviorStats.score >= 90 ? 'bg-emerald-50 text-emerald-700' :
                            behaviorStats.score >= 70 ? 'bg-orange-50 text-orange-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            <Smile className="w-4 h-4" /> {behaviorStats.score}% {behaviorStats.score >= 90 ? 'Good' : behaviorStats.score >= 70 ? 'Average' : 'Poor'}
                          </span>
                        )}
                        <span className="text-xs text-ink-500 font-medium hidden sm:inline-block">View detailed behaviour and discipline records.</span>
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
                    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
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
                  <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
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
              
              {tab === 'behavior' && (
                <LearnerBehaviourPage learnerId={learnerId} asTab={true} />
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
            <div className={`w-full xl:w-[320px] shrink-0 flex-col gap-5 ${tab === 'overview' ? 'flex' : 'hidden xl:flex'}`}>
              
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
                  <div className="divide-y divide-border/50">
                    {guardians.map(g => (
                      <React.Fragment key={g.id}>
                        <div className="flex justify-between items-center py-3 text-sm">
                          <span className="text-ink-500 font-medium">Name</span>
                          <span className="font-bold text-ink-900">{g.first_name} {g.last_name}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 text-sm">
                          <span className="text-ink-500 font-medium">Phone</span>
                          <span className="font-bold text-ink-900">{g.phone || '—'}</span>
                        </div>
                        {g.email && (
                          <div className="flex justify-between items-center py-3 text-sm">
                            <span className="text-ink-500 font-medium">Email</span>
                            <span className="font-bold text-ink-900 truncate max-w-[120px]">{g.email}</span>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                    <div className="pt-3">
                      <button onClick={() => setShowGuardianLinks(true)} className="w-full text-center text-xs font-bold text-indigo-600 hover:underline">
                        View Full Details →
                      </button>
                    </div>
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
                <div className="divide-y divide-border/50 text-sm">
                  <div className="flex justify-between items-center py-3">
                    <span className="text-ink-500 font-medium">Class</span>
                    <span className="font-bold text-ink-900">{learner.cohort_name || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-ink-500 font-medium">Admission No.</span>
                    <span className="font-bold text-ink-900">{learner.registry_no}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
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
