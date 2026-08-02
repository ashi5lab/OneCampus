import { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function DatePicker({ value, onChange, max }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  
  // value is ISO string (YYYY-MM-DD)
  const selectedDate = value ? new Date(`${value}T00:00:00`) : new Date();
  
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleSelectDate = (day) => {
    const iso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(iso);
    setIsOpen(false);
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const maxDateObj = max ? new Date(`${max}T00:00:00`) : null;

  const isDateDisabled = (day) => {
    if (!maxDateObj) return false;
    const dateObj = new Date(currentYear, currentMonth, day);
    return dateObj > maxDateObj;
  };

  const displayString = useMemo(() => {
    if (!value) return 'Select date';
    const d = new Date(`${value}T00:00:00`);
    return `${d.toLocaleDateString('en-US', { weekday: 'long' })}, ${d.toLocaleDateString('en-US', { month: 'long' })} ${d.getDate()}, ${d.getFullYear()}`;
  }, [value]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-surface rounded-2xl px-4 py-3 shadow-sm border flex items-center gap-3 transition-all cursor-pointer ${
          isOpen ? 'ring-2 ring-accent border-accent' : 'border-border-subtle hover:border-border'
        }`}
      >
        <CalendarIcon className="w-5 h-5 text-accent flex-shrink-0" />
        <div className="flex-1 text-[14px] font-medium text-ink-900 select-none">
          {displayString}
        </div>
      </div>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 mt-2 bg-surface rounded-2xl shadow-xl border border-border-subtle p-4 z-50 w-72 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-surface-muted rounded-full transition-colors text-ink-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="font-semibold text-ink-900 text-[15px]">
              {MONTHS[currentMonth]} {currentYear}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-surface-muted rounded-full transition-colors text-ink-700"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {DAYS.map(d => (
              <div key={d} className="text-[12px] font-medium text-ink-300">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const disabled = isDateDisabled(day);
              const isSelected = value === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();
              
              return (
                <button
                  key={day}
                  disabled={disabled}
                  onClick={(e) => { e.stopPropagation(); handleSelectDate(day); }}
                  className={`
                    h-9 w-9 rounded-full flex items-center justify-center text-[13px] transition-all
                    ${disabled ? 'text-ink-300 cursor-not-allowed' : 'hover:bg-surface-muted cursor-pointer'}
                    ${isSelected ? 'bg-accent text-white hover:bg-accent-dark font-medium shadow-md' : 'text-ink-700'}
                    ${isToday && !isSelected ? 'border border-accent text-accent font-medium' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
