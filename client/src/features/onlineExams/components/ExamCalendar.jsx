import { useState } from 'react';

export function ExamCalendar({ exams = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getExamsForDate = (date) => {
    return exams.filter((exam) => {
      const examDate = new Date(exam.scheduled_date);
      return (
        examDate.getDate() === date &&
        examDate.getMonth() === currentDate.getMonth() &&
        examDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="rounded border border-border bg-surface p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-ink-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={previousMonth}
            className="rounded border border-border bg-surface px-2 py-1 text-sm hover:bg-surface-muted transition-colors"
          >
            ←
          </button>
          <button
            onClick={nextMonth}
            className="rounded border border-border bg-surface px-2 py-1 text-sm hover:bg-surface-muted transition-colors"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-bold uppercase text-ink-500 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const examsForDay = day ? getExamsForDate(day) : [];
          const isToday = day &&
            new Date().getDate() === day &&
            new Date().getMonth() === currentDate.getMonth() &&
            new Date().getFullYear() === currentDate.getFullYear();

          return (
            <div
              key={idx}
              className={`min-h-16 rounded border text-xs p-1 ${
                day
                  ? `border-border hover:bg-surface-muted cursor-pointer transition-colors ${
                      isToday ? 'bg-accent/10 border-accent' : 'bg-surface'
                    }`
                  : 'border-transparent bg-transparent'
              }`}
            >
              {day && (
                <>
                  <div className={`font-semibold mb-1 ${isToday ? 'text-accent' : 'text-ink-900'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {examsForDay.slice(0, 2).map((exam) => (
                      <div
                        key={exam.id}
                        className="truncate text-[10px] font-medium px-1 py-0.5 rounded bg-accent/20 text-accent hover:bg-accent hover:text-accent-ink transition-colors"
                        title={exam.title}
                      >
                        {exam.title}
                      </div>
                    ))}
                    {examsForDay.length > 2 && (
                      <div className="text-[9px] text-ink-500 px-1">+{examsForDay.length - 2} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-accent/20 border border-accent" />
          <span className="text-ink-500">Exam Day</span>
        </div>
      </div>
    </div>
  );
}
