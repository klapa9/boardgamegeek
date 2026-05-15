'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type CalendarCell = {
  key: string;
  date: string | null;
  dayNumber: string;
  isSelectable: boolean;
  isToday: boolean;
};

type CalendarMonth = {
  key: string;
  label: string;
  weeks: CalendarCell[][];
};

const WEEKDAY_LABELS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'] as const;

function localDateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthDateKey(value: Date) {
  return `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, '0')}`;
}

function buildCalendarMonth(visibleMonth: Date, todayKey: string): CalendarMonth {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth() + 1;
  const monthKey = `${year}-${`${month}`.padStart(2, '0')}`;
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const cells: CalendarCell[] = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({
      key: `${monthKey}-blank-start-${index}`,
      date: null,
      dayNumber: '',
      isSelectable: false,
      isToday: false
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${monthKey}-${`${day}`.padStart(2, '0')}`;
    cells.push({
      key: date,
      date,
      dayNumber: `${day}`,
      isSelectable: date >= todayKey,
      isToday: date === todayKey
    });
  }

  while (cells.length % 7 !== 0) {
    const index = cells.length;
    cells.push({
      key: `${monthKey}-blank-end-${index}`,
      date: null,
      dayNumber: '',
      isSelectable: false,
      isToday: false
    });
  }

  const weeks: CalendarCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return {
    key: monthKey,
    label: new Intl.DateTimeFormat('nl-BE', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1)),
    weeks
  };
}

function dateTitle(date: string) {
  return new Intl.DateTimeFormat('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`));
}

export default function DateOptionCalendar({
  selectedDates,
  highlightedDates = [],
  onToggleDate,
  disabled = false,
  selectedClassName = 'border-slate-950 bg-[#84d7ff] text-slate-950 shadow-sm shadow-sky-200/80',
  highlightedClassName = 'border-slate-950/40 bg-[#84d7ff]/45 text-slate-950',
  nonInteractiveDates = [],
  selectionMode = 'multiple'
}: {
  selectedDates: string[];
  highlightedDates?: string[];
  onToggleDate: (date: string) => void;
  disabled?: boolean;
  selectedClassName?: string;
  highlightedClassName?: string;
  nonInteractiveDates?: string[];
  selectionMode?: 'single' | 'multiple';
}) {
  const [visibleMonthDate, setVisibleMonthDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const todayKey = useMemo(() => localDateKey(), []);
  const currentMonthKey = useMemo(() => monthDateKey(new Date()), []);
  const visibleMonth = useMemo(() => buildCalendarMonth(visibleMonthDate, todayKey), [todayKey, visibleMonthDate]);
  const selectedDatesSet = useMemo(() => new Set(selectedDates), [selectedDates]);
  const highlightedDatesSet = useMemo(() => new Set(highlightedDates), [highlightedDates]);
  const nonInteractiveDatesSet = useMemo(() => new Set(nonInteractiveDates), [nonInteractiveDates]);

  return (
    <div className="max-w-xl">
      <div className="page-subcard-soft p-2.5 sm:p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setVisibleMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            disabled={disabled || visibleMonth.key === currentMonthKey}
            className="neo-button neo-button-ghost h-8 w-8 rounded-full p-0 text-slate-600 disabled:opacity-40"
            title="Vorige maand"
          >
            <ChevronLeft size={16} />
          </button>
          <h3 className="text-xs font-black capitalize text-slate-900">{visibleMonth.label}</h3>
          <button
            type="button"
            onClick={() => setVisibleMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            disabled={disabled}
            className="neo-button neo-button-ghost h-8 w-8 rounded-full p-0 text-slate-600 disabled:opacity-40"
            title="Volgende maand"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400">
          {WEEKDAY_LABELS.map((label) => <span key={label} className="py-1">{label}</span>)}
        </div>
        <div
          className="mt-1 space-y-1"
          aria-label={selectionMode === 'single' ? 'Kies 1 datum' : 'Kies 1 of meerdere datums'}
        >
          {visibleMonth.weeks.map((week, index) => (
            <div key={`${visibleMonth.key}-week-${index}`} className="grid grid-cols-7 gap-1">
              {week.map((cell) => {
                if (!cell.date) {
                  return <div key={cell.key} className="aspect-square rounded-xl bg-transparent" aria-hidden="true" />;
                }

                const cellDate = cell.date;
                const selected = selectedDatesSet.has(cellDate);
                const highlighted = !selected && highlightedDatesSet.has(cellDate);
                const nonInteractive = nonInteractiveDatesSet.has(cellDate);
                const isDisabled = disabled || !cell.isSelectable || nonInteractive;

                return (
                  <label
                    key={cell.key}
                    title={dateTitle(cellDate)}
                    className={[
                      'relative block aspect-square w-full overflow-hidden rounded-lg border-2 text-left transition',
                      !cell.isSelectable
                        ? 'cursor-not-allowed border-transparent bg-slate-100/70 text-slate-300'
                        : selected
                          ? `cursor-pointer ${selectedClassName}`
                          : highlighted
                            ? `cursor-default ${highlightedClassName}`
                          : 'cursor-pointer border-slate-950/10 bg-white hover:border-slate-950/30 hover:bg-sky-50/70',
                      cell.isToday ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white' : '',
                      disabled ? 'opacity-70' : ''
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={selected || highlighted}
                      disabled={isDisabled}
                      onChange={() => onToggleDate(cellDate)}
                      className="sr-only"
                      aria-label={dateTitle(cellDate)}
                    />
                    <span className="flex h-full w-full flex-col justify-between p-1.5">
                      <span className={`text-xs font-black ${cell.isSelectable ? '' : 'text-slate-300'}`}>{cell.dayNumber}</span>
                      <span className="text-[10px] leading-none text-transparent" aria-hidden="true">.</span>
                    </span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
