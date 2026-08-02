import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, AlertCircle, AlertTriangle, Shield, Calendar, Filter, ArrowDownUp, Trophy, MinusCircle } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Avatar } from '../../../components/Avatar';
import { Card } from '../../../components/Card';
import { useLearnerProfile } from '../hooks/useLearners';
import { useDisciplineRecords } from '../../discipline/hooks/useDiscipline';

const SEVERITY_META = {
  positive: {
    pts: 5,
    ptsStr: '+5 pts',
    label: 'Positive',
    icon: Trophy,
    color: 'text-success',
    bg: 'bg-success-light',
    dot: 'bg-success',
    badge: 'text-success bg-success-light'
  },
  minor: {
    pts: -2,
    ptsStr: '-2 pts',
    label: 'Warning',
    icon: AlertCircle,
    color: 'text-warning',
    bg: 'bg-warning-light',
    dot: 'bg-warning',
    badge: 'text-warning bg-warning-light'
  },
  major: {
    pts: -10,
    ptsStr: '-10 pts',
    label: 'Negative',
    icon: AlertTriangle,
    color: 'text-danger',
    bg: 'bg-danger-light',
    dot: 'bg-danger',
    badge: 'text-danger bg-danger-light'
  }
};

const TABS = [
  { id: 'all', label: 'All Records' },
  { id: 'positive', label: 'Positive' },
  { id: 'major', label: 'Negative' },
  { id: 'minor', label: 'Warnings' }
];

export function LearnerBehaviourPage({ learnerId: propLearnerId, asTab = false }) {
  const { id } = useParams();
  const learnerId = propLearnerId || Number(id);

  const { data: profileData, isLoading: profileLoading } = useLearnerProfile(learnerId);
  const { data: recordsData, isLoading: recordsLoading } = useDisciplineRecords(learnerId);

  const [activeTab, setActiveTab] = useState('all');

  const learner = profileData?.learner;
  const records = Array.isArray(recordsData) ? recordsData : recordsData?.data || [];

  const stats = useMemo(() => {
    let positive = 0;
    let negative = 0;
    let warnings = 0;
    let score = 800;

    records.forEach(r => {
      const meta = SEVERITY_META[r.severity];
      if (meta) {
        score += meta.pts;
        if (r.severity === 'positive') positive++;
        if (r.severity === 'minor') warnings++;
        if (r.severity === 'major') negative++;
      }
    });

    score = Math.max(300, Math.min(850, score));

    return { positive, negative, warnings, score };
  }, [records]);

  const filteredRecords = useMemo(() => {
    let result = [...records];
    if (activeTab !== 'all') {
      result = result.filter(r => r.severity === activeTab || (activeTab === 'negative' && r.severity === 'major') || (activeTab === 'warnings' && r.severity === 'minor') || (activeTab === 'positive' && r.severity === 'positive'));
    }
    // Sort latest first (assuming id or incident_date)
    return result.sort((a, b) => new Date(b.incident_date) - new Date(a.incident_date));
  }, [records, activeTab]);

  if (profileLoading || recordsLoading) {
    return <div className="p-8 text-center text-sm text-ink-500">Loading behaviour data...</div>;
  }

  if (!learner) return null;

  return (
    <div className={`pb-12 max-w-4xl mx-auto space-y-6 font-body ${asTab ? '' : ''}`}>
      {!asTab && <PageHeader title="Behaviour" backTo={`/app/learners/${learnerId}`} />}


      {/* Stats Grid */}
      <Card padding="p-0" className="grid grid-cols-4 gap-0 overflow-hidden divide-x divide-border">
        <div className="p-4 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-success-light text-success flex items-center justify-center mb-2">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="text-xl font-extrabold text-success leading-none mb-1">{stats.positive}</div>
          <div className="text-[10px] font-bold text-ink-900 mb-0.5">Positive</div>
          <div className="text-[9px] text-ink-400 font-medium">This Term</div>
        </div>

        <div className="p-4 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-danger-light text-danger flex items-center justify-center mb-2">
            <MinusCircle className="w-4 h-4" />
          </div>
          <div className="text-xl font-extrabold text-danger leading-none mb-1">{stats.negative}</div>
          <div className="text-[10px] font-bold text-ink-900 mb-0.5">Negative</div>
          <div className="text-[9px] text-ink-400 font-medium">This Term</div>
        </div>

        <div className="p-4 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-warning-light text-warning flex items-center justify-center mb-2">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-xl font-extrabold text-warning leading-none mb-1">{stats.warnings}</div>
          <div className="text-[10px] font-bold text-ink-900 mb-0.5">Warnings</div>
          <div className="text-[9px] text-ink-400 font-medium">This Term</div>
        </div>

        <div className="p-4 text-center flex flex-col items-center justify-center relative bg-accent-light">
          <div className="w-8 h-8 rounded-full bg-accent-light text-accent flex items-center justify-center mb-2">
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-xl font-extrabold text-accent-dark leading-none mb-1">{stats.score}%</div>
          <div className="text-[10px] font-bold text-ink-900 mb-0.5">Behaviour Score</div>
          <div className="text-[9px] text-ink-400 font-medium flex items-center justify-center gap-1">
            This Term <AlertCircle className="w-2.5 h-2.5 opacity-60" />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-bold transition-colors relative ${
              activeTab === tab.id ? 'text-accent' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-accent rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface text-ink-700 font-semibold text-xs shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-ink-500" />
            All Time
            <ArrowDownUp className="w-3 h-3 text-ink-400 ml-1" />
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface text-ink-700 font-semibold text-xs shadow-sm">
            <Filter className="w-3.5 h-3.5 text-ink-500" />
            All Types
            <ArrowDownUp className="w-3 h-3 text-ink-400 ml-1" />
          </button>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface text-ink-700 font-semibold text-xs shadow-sm">
          <ArrowDownUp className="w-3.5 h-3.5 text-ink-500" />
          Latest First
        </button>
      </div>

      {/* Timeline */}
      <div className="relative pt-2 pb-6">
        <div className="absolute left-6 top-6 bottom-4 w-px bg-border z-0" />
        
        {filteredRecords.length === 0 ? (
          <div className="text-center py-10 text-sm font-medium text-ink-500">No records yet.</div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((r) => {
              const meta = SEVERITY_META[r.severity] || SEVERITY_META.minor;
              const Icon = meta.icon;

              return (
                <div key={r.id} className="relative z-10 flex gap-4 items-center">
                  <div className="w-[50px] flex justify-center shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full border-2 border-surface ${meta.dot}`} />
                  </div>
                  
                  <Card padding="p-4" className="flex-1 flex flex-col sm:flex-row gap-4 sm:items-center">
                    <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center ${meta.bg} ${meta.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-[14px] font-bold text-ink-900 truncate">
                          {r.severity === 'positive' ? 'Positive Note' : r.severity === 'major' ? 'Major Incident' : 'Minor Incident'}
                        </h3>
                        <span className="text-[11px] font-semibold text-ink-500 whitespace-nowrap ml-2">
                          {new Date(r.incident_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      
                      <p className="text-[13px] text-ink-700 leading-relaxed mb-3 pr-4">
                        {r.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${meta.badge}`}>
                          {meta.label}
                        </span>
                        
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] font-medium text-ink-500 leading-none mb-1">
                            {r.reported_by_username || 'Staff'}
                          </span>
                          <span className={`text-[12px] font-extrabold ${meta.color}`}>
                            {meta.ptsStr}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-accent-light/50 rounded-2xl p-4 border border-accent-light flex items-center gap-3 mt-4">
        <div className="w-10 h-10 rounded-full bg-surface text-accent flex items-center justify-center shrink-0 shadow-sm border border-accent-light">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2v1"/><path d="M12 7a5 5 0 0 0-5 5c0 2 1.5 3 2 5h6c.5-2 2-3 2-5a5 5 0 0 0-5-5Z"/></svg>
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-bold text-accent-dark">About Behaviour Score</div>
          <div className="text-[11px] font-medium text-accent-dark/80 mt-0.5">Score is calculated based on positive and negative behaviour records.</div>
        </div>
      </div>

    </div>
  );
}
