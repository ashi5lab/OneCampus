import { Link } from 'react-router-dom';
import { BookOpen, Calendar, Users, ChevronRight, FlaskConical, FunctionSquare, Zap, Lightbulb } from 'lucide-react';

// Maps subjects to icons and colors — also used by ClassListRow.jsx (the
// flat-row rendering of the same data) so both stay visually in sync.
export const SUBJECT_MAP = [
  { icon: FlaskConical, color: 'text-purple-700 bg-purple-100', iconColor: 'text-purple-700' },
  { icon: Zap, color: 'text-blue-700 bg-blue-100', iconColor: 'text-blue-700' },
  { icon: FunctionSquare, color: 'text-emerald-700 bg-emerald-100', iconColor: 'text-emerald-700' },
  { icon: Lightbulb, color: 'text-rose-700 bg-rose-100', iconColor: 'text-rose-700' },
  { icon: BookOpen, color: 'text-orange-700 bg-orange-100', iconColor: 'text-orange-700' }
];

// Shared by ClassCard (grid) and ClassListRow (flat list) so both derive
// the same icon/color/section/subject from a cohort.
export function deriveClassMeta(cohort, index = 0) {
  const style = SUBJECT_MAP[index % SUBJECT_MAP.length];

  // Try to extract section or default to 'A'
  const sectionMatch = cohort.name.match(/\b([A-E])\b/i);
  const section = sectionMatch ? `Section ${sectionMatch[1].toUpperCase()}` : 'Section A';

  // Try to extract subject or just use name
  const subject = cohort.subject || (cohort.name.includes('Science') ? 'Science' : cohort.name.includes('Math') ? 'Mathematics' : cohort.name.includes('Physics') ? 'Physics' : 'Subject');

  return { style, Icon: style.icon, section, subject };
}

export function ClassCard({ cohort, to, index = 0 }) {
  const { style, Icon, section, subject } = deriveClassMeta(cohort, index);

  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-transform active:scale-[0.99] hover:shadow-md"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${style.color}`}>
        <Icon className={`w-7 h-7 ${style.iconColor}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <div className="text-[16px] font-bold text-gray-900 truncate">{cohort.name}</div>
          <div className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">
            {section}
          </div>
        </div>
        
        <div className={`text-[13px] font-semibold mb-2 ${style.iconColor}`}>{subject}</div>
        
        <div className="flex items-center justify-between text-[11px] font-medium text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Mon, Tue, Wed, Thu
          </div>
          <div className="flex items-center gap-1 text-gray-700 font-semibold">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            {cohort.learner_count || 30} Students
          </div>
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
    </Link>
  );
}
