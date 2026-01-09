import { addDays, format, isSameDay, isSameMonth, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '../lib/cn';
import { useHaptic } from '../hooks/useHaptic';

type MonthGridProps = {
  days: Date[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  taskDates: Set<string>;
};

const formatDateOnly = (value: Date) => format(value, 'yyyy-MM-dd');

export default function MonthGrid({
  days,
  selectedDate,
  onSelectDate,
  taskDates,
}: MonthGridProps) {
  const today = new Date();
  const { selection } = useHaptic();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const handleDateClick = (day: Date) => {
    if (!isSameDay(day, selectedDate)) {
      selection();
      onSelectDate(day);
    }
  };

  return (
    <div className="p-2">
      <div className="grid grid-cols-7 mb-3 text-center">
        {Array.from({ length: 7 }).map((_, i) => {
          const day = addDays(weekStart, i);
          return (
            <span
              key={format(day, 'EEE', { locale: ru })}
              className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] opacity-60"
            >
              {format(day, 'EE', { locale: ru })}
            </span>
          );
        })}
      </div>

      <div className="grid grid-cols-7 gap-y-1 gap-x-1">
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const isOutside = !isSameMonth(day, selectedDate);
          const hasTasks = taskDates.has(formatDateOnly(day));

          return (
            <button
              key={formatDateOnly(day)}
              type="button"
              onClick={() => handleDateClick(day)}
              aria-pressed={isSelected}
              aria-current={isSelected ? 'date' : undefined}
              aria-label={format(day, 'EEEE, d MMMM', { locale: ru })}
              className={cn(
                'relative flex h-9 w-full flex-col items-center justify-center rounded-[10px] text-[13px] transition-all duration-200 select-none',
                isSelected
                  ? 'bg-[var(--ink)] text-[var(--bg)] shadow-md font-bold scale-100 z-10'
                  : 'text-[var(--ink)] hover:bg-[var(--surface-2)] font-medium active:scale-95',
                isOutside && !isSelected && 'text-[var(--muted)] opacity-30',
                !isSelected &&
                  isToday &&
                  'text-[var(--accent)] font-bold bg-[var(--surface-2)] ring-1 ring-inset ring-[var(--accent)]/20'
              )}
            >
              <span className="relative z-10">{format(day, 'd')}</span>

              {hasTasks && !isSelected && (
                <span
                  className={cn(
                    'absolute bottom-1.5 w-1 h-1 rounded-full',
                    isOutside ? 'bg-[var(--muted)]' : 'bg-[var(--accent)]',
                    isToday && 'bg-[var(--accent)]'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
