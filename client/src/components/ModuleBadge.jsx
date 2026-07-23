import { colorForModule } from '../lib/moduleColors';
import {
  Users,
  UserCheck,
  BookOpen,
  MonitorPlay,
  Layers,
  GraduationCap,
  HeartHandshake,
  CheckSquare,
  FileSpreadsheet,
  Award,
  Baby,
  Bell,
  Library,
  FileText,
  MessageSquare,
  Radio,
  FileMinus,
  Calendar,
  Clock,
  BarChart3,
  Settings,
  ShieldCheck,
  UploadCloud,
  ClipboardList,
  AlertTriangle,
  FolderSync,
  Contact,
  Fingerprint
} from 'lucide-react';

const MODULE_ICONS = {
  learners: Users,
  instructors: UserCheck,
  cohorts: BookOpen,
  'class-channels': MonitorPlay,
  units: Layers,
  modules: GraduationCap,
  guardians: HeartHandshake,
  attendance: CheckSquare,
  exams: FileSpreadsheet,
  certificates: Award,
  'kindergarten-activity': Baby,
  notices: Bell,
  library: Library,
  assignments: FileText,
  messages: MessageSquare,
  broadcast: Radio,
  leave: FileMinus,
  calendar: Calendar,
  timetable: Clock,
  reports: BarChart3,
  'app-management': Settings,
  'access-control': ShieldCheck,
  'bulk-upload': UploadCloud,
  'staff-attendance': ClipboardList,
  discipline: AlertTriangle,
  ptm: FolderSync,
  alumni: Contact,
  visitors: Fingerprint,
};

export function ModuleBadge({ moduleKey, label, size = 38 }) {
  const { bg, fg } = colorForModule(moduleKey);
  const dimension = `${size}px`;
  
  // Find matching Lucide icon, fallback to first letter of label
  const IconComponent = MODULE_ICONS[moduleKey];

  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-xl font-bold transition-transform duration-200 group-hover:scale-105"
      style={{ width: dimension, height: dimension, backgroundColor: bg, color: fg }}
    >
      {IconComponent ? (
        <IconComponent size={Math.round(size * 0.52)} className="stroke-[2.2]" />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.45) }}>
          {(label || '?')[0]?.toUpperCase()}
        </span>
      )}
    </div>
  );
}

