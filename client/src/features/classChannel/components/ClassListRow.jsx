import { Calendar, Users } from 'lucide-react';
import { FlatRow } from '../../../components/FlatList';
import { deriveClassMeta } from './ClassCard';

// Flat-row rendering of the same cohort data as ClassCard — for contexts
// where classes are never a multi-column grid (a single teacher's own "My
// Classes" list) or where the grid only applies at wider breakpoints (the
// admin Class Channels picker shows this on mobile, ClassCard's grid on
// desktop). Same icon/section/subject derivation as ClassCard via
// deriveClassMeta, so switching between the two breakpoints doesn't change
// which icon/color a class gets.
export function ClassListRow({ cohort, to, index = 0 }) {
  const { style, Icon, section, subject } = deriveClassMeta(cohort, index);

  return (
    <FlatRow to={to} chevron>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${style.color}`}>
        <Icon className={`w-5 h-5 ${style.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="text-[14.5px] font-bold text-ink-900 truncate">{cohort.name}</div>
          <span className="bg-accent-light text-accent-dark px-1.5 py-0.5 rounded-full text-[9.5px] font-bold whitespace-nowrap">
            {section}
          </span>
        </div>
        <div className={`text-[12px] font-semibold ${style.iconColor}`}>{subject}</div>
        <div className="mt-0.5 flex items-center gap-3 text-[11px] font-medium text-ink-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Mon, Tue, Wed, Thu
          </span>
          <span className="flex items-center gap-1 text-ink-700 font-semibold">
            <Users className="w-3 h-3 text-ink-300" />
            {cohort.learner_count || 30} Students
          </span>
        </div>
      </div>
    </FlatRow>
  );
}
