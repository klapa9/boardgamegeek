'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import GameCollectionPicker from './GameCollectionPicker';

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
const SESSION_DRAFT_KEY = 'gsk-session-draft';

type CreateSessionFormMode = 'details' | 'games' | 'full';
type SessionDraft = {
  title: string;
  dateOptions: string[];
};

function dateParts(date: string) {
  const value = new Date(`${date}T12:00:00`);
  return {
    full: new Intl.DateTimeFormat('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' }).format(value)
  };
}

function localDateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthDateKey(value: Date) {
  return `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, '0')}`;
}

function buildCalendarMonth(visibleMonth: Date, todayKey: string) {
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

function readSessionDraft(): SessionDraft | null {
  try {
    const raw = localStorage.getItem(SESSION_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionDraft>;
    if (typeof parsed.title !== 'string' || !Array.isArray(parsed.dateOptions)) return null;
    return {
      title: parsed.title,
      dateOptions: parsed.dateOptions.filter((date): date is string => typeof date === 'string')
    };
  } catch {
    return null;
  }
}

export default function CreateSessionForm({ mode = 'full' }: { mode?: CreateSessionFormMode }) {
  const router = useRouter();
  const [title, setTitle] = useState('Spelavond');
  const [dateOptions, setDateOptions] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleMonthDate, setVisibleMonthDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const todayKey = useMemo(() => localDateKey(), []);
  const currentMonthKey = useMemo(() => monthDateKey(new Date()), []);
  const visibleMonth = useMemo(() => buildCalendarMonth(visibleMonthDate, todayKey), [todayKey, visibleMonthDate]);

  useEffect(() => {
    if (mode === 'details') {
      localStorage.removeItem(SESSION_DRAFT_KEY);
      setTitle('Spelavond');
      setDateOptions([]);
      setSelectedIds([]);
      return;
    }

    if (mode !== 'games') return;
    const draft = readSessionDraft();
    if (!draft || !draft.dateOptions.length) {
      router.replace('/spelavond?nieuw=1');
      return;
    }
    setTitle(draft.title.trim() || 'Spelavond');
    setDateOptions(draft.dateOptions);
  }, [mode, router]);

  function toggleDate(date: string) {
    setDateOptions((current) => (
      current.includes(date)
        ? current.filter((item) => item !== date)
        : Array.from(new Set([...current, date])).sort()
    ));
  }

  function confirmDetails(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!dateOptions.length) {
      setError('Voeg minstens een datum toe.');
      return;
    }
    localStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify({ title, dateOptions }));
    router.push('/spelkeuze');
  }

  async function createSession(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api<{ session: { id: string }; admin_token: string }>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          title,
          date_options: dateOptions,
          collection_game_ids: selectedIds
        })
      });
      localStorage.setItem(`gsk-admin-${data.session.id}`, data.admin_token);
      localStorage.removeItem(SESSION_DRAFT_KEY);
      router.push(`/s/${data.session.id}?admin=${data.admin_token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sessie maken mislukt.');
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = mode === 'details' ? confirmDetails : createSession;

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      {mode !== 'games' && (
        <>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Naam van de spelavond</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
              placeholder="Spelavond vrijdag"
              required
            />
          </div>

          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <div className="max-w-xl">
              {visibleMonth && (
                <div className="rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibleMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                      disabled={visibleMonth.key === currentMonthKey}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 disabled:opacity-40"
                      title="Vorige maand"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <h3 className="text-xs font-black capitalize text-slate-900">{visibleMonth.label}</h3>
                    <button
                      type="button"
                      onClick={() => setVisibleMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 disabled:opacity-40"
                      title="Volgende maand"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400">
                    {WEEKDAY_LABELS.map((label) => <span key={label} className="py-1">{label}</span>)}
                  </div>
                  <div className="mt-1 space-y-1">
                    {visibleMonth.weeks.map((week, index) => (
                      <div key={`${visibleMonth.key}-week-${index}`} className="grid grid-cols-7 gap-1">
                        {week.map((cell) => {
                          if (!cell.date) {
                            return <div key={cell.key} className="aspect-square rounded-xl bg-transparent" aria-hidden="true" />;
                          }

                          const selected = dateOptions.includes(cell.date);
                          const display = dateParts(cell.date);

                          return (
                            <button
                              key={cell.key}
                              type="button"
                              disabled={!cell.isSelectable}
                              onClick={() => toggleDate(cell.date!)}
                              title={display.full}
                              className={[
                                'relative aspect-square rounded-lg border text-left transition',
                                cell.isSelectable ? 'border-slate-200 bg-white hover:border-slate-300' : 'border-transparent bg-slate-100/70 text-slate-300',
                                selected ? 'border-emerald-500 bg-emerald-100 text-emerald-950' : '',
                                cell.isToday ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white' : ''
                              ].join(' ')}
                            >
                              <span className="flex h-full flex-col justify-between p-1.5">
                                <span className="flex items-start justify-between gap-1">
                                  <span className={`text-xs font-black ${cell.isSelectable ? '' : 'text-slate-300'}`}>{cell.dayNumber}</span>
                                  {selected ? <Check size={13} className="shrink-0" /> : null}
                                </span>
                                <span className="text-[10px] leading-none text-transparent" aria-hidden="true">.</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="mt-3 text-sm text-slate-500">Selecteer een of meerdere datums die je wil voorstellen.</p>
          </div>
        </>
      )}

      {mode !== 'details' && (
        <div>
          {mode === 'games' && (
            <div className="mb-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <b className="text-slate-900">{title}</b>
              <span className="block">{dateOptions.length} datum{dateOptions.length === 1 ? '' : 's'} gekozen</span>
            </div>
          )}
          <GameCollectionPicker
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            title="Kies spellen uit je lokale lijst"
            subtitle="Dit is dezelfde spelkiezer die deelnemers later kunnen gebruiken om extra spellen toe te voegen."
          />
        </div>
      )}

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <button disabled={loading || !dateOptions.length} className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-60">
        {mode === 'details' ? 'Bevestig' : loading ? 'Spelavond maken...' : 'Spelavond maken'}
      </button>
    </form>
  );
}
