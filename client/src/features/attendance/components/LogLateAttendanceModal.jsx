import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAllUsers } from '../../profile/hooks/useProfile';
import { useMarkLateAttendance } from '../hooks/useAttendance';
import { UserSearchSelect } from '../../../components/UserSearchSelect';

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function nowParts() {
  const now = new Date();
  const hour24 = now.getHours();
  const hour = ((hour24 + 11) % 12) + 1; // 0 -> 12, 13 -> 1, etc.
  return {
    hour,
    minute: now.getMinutes(),
    period: hour24 >= 12 ? 'PM' : 'AM'
  };
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

// Dashboard quick action: log a single student as late for a given
// date/time in one step, optionally raising a minor discipline incident in
// the same request (see server/modules/attendance/controller.js#markLate).
export function LogLateAttendanceModal({ onClose }) {
  const { data: users } = useAllUsers();
  const markLate = useMarkLateAttendance();

  const initialTime = nowParts();
  const [userId, setUserId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [hour, setHour] = useState(initialTime.hour);
  const [minute, setMinute] = useState(initialTime.minute);
  const [period, setPeriod] = useState(initialTime.period);
  const [logDiscipline, setLogDiscipline] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const time = `${hour}:${String(minute).padStart(2, '0')} ${period}`;
    markLate.mutate(
      { user_id: Number(userId), date, time, log_discipline: logDiscipline },
      {
        onSuccess: () => {
          toast.success('Late attendance logged.');
          onClose();
        }
      }
    );
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end md:items-center justify-center bg-ink-900/40 p-0 md:p-4">
      <div className="w-full md:max-w-[440px] rounded-t-2xl md:rounded border border-border bg-surface p-6">
        <div className="mb-1 text-base font-bold text-ink-900">Log Late Attendance</div>
        <div className="mb-5 text-[12px] text-ink-500">
          Mark a student late and, optionally, raise a discipline incident for it.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="mb-1.5 text-xs font-semibold text-ink-700">Date</div>
              <input type="date" className="input w-full" required value={date} onChange={(e) => setDate(e.target.value)} />
            </label>

            <label className="block">
              <div className="mb-1.5 text-xs font-semibold text-ink-700">Time</div>
              <div className="flex gap-1.5">
                <select className="input w-full" value={hour} onChange={(e) => setHour(Number(e.target.value))}>
                  {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <select className="input w-full" value={minute} onChange={(e) => setMinute(Number(e.target.value))}>
                  {MINUTES.map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                </select>
                <select className="input w-full" value={period} onChange={(e) => setPeriod(e.target.value)}>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </label>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={logDiscipline}
              onChange={(e) => setLogDiscipline(e.target.checked)}
            />
            <span className="text-[13px] text-ink-700">
              Also log a minor discipline incident for this
            </span>
          </label>

          {markLate.error && (
            <div className="text-sm font-semibold text-danger">{markLate.error.message}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border px-5 py-2.5 text-[13.5px] font-semibold text-ink-700 hover:bg-surface-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={markLate.isPending || !userId}
              className="rounded-full bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-accent-ink disabled:opacity-60 transition-colors"
            >
              {markLate.isPending ? 'Saving…' : 'Log Late Attendance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
