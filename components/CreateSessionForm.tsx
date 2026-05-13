'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, loadSessionBundle } from '@/lib/api';
import { sessionPath } from '@/lib/session-link';
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

type CreateSessionFormMode = 'details' | 'planning' | 'games';
type PlanningMode = 'fixed_day' | 'vote_dates';
type GameSelectionMode = 'no_preselect' | 'host_pick' | 'players_pick';

type SessionDraft = {
  title: string;
  planningMode: PlanningMode;
  gameSelectionMode: GameSelectionMode;
  meetingTime: string;
  dateOptions: string[];
};

const WEEKDAY_LABELS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'] as const;
const SESSION_DRAFT_KEY = 'gsk-session-draft';
const LAST_MEETING_TIME_KEY = 'gsk-last-meeting-time';
const DEFAULT_MEETING_TIME = '20:00';

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

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function readLastMeetingTime() {
  try {
    const raw = localStorage.getItem(LAST_MEETING_TIME_KEY);
    return raw && isValidTime(raw) ? raw : DEFAULT_MEETING_TIME;
  } catch {
    return DEFAULT_MEETING_TIME;
  }
}

function sessionDraftKey(editSessionId?: string | null) {
  return editSessionId ? `${SESSION_DRAFT_KEY}-${editSessionId}` : SESSION_DRAFT_KEY;
}

function inferPlanningMode(dateOptions: string[]) {
  return dateOptions.length === 1 ? 'fixed_day' : 'vote_dates';
}

function inferGameSelectionMode(gameCount: number, chosenGameId: string | null): GameSelectionMode {
  if (!gameCount) return 'no_preselect';
  if (gameCount === 1 && chosenGameId) return 'host_pick';
  return 'players_pick';
}

function readSessionDraft(draftKey: string): SessionDraft | null {
  try {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionDraft>;
    if (typeof parsed.title !== 'string') return null;
    if (parsed.planningMode !== 'fixed_day' && parsed.planningMode !== 'vote_dates') return null;
    if (parsed.gameSelectionMode !== 'no_preselect' && parsed.gameSelectionMode !== 'host_pick' && parsed.gameSelectionMode !== 'players_pick') return null;
    if (typeof parsed.meetingTime !== 'string' || !isValidTime(parsed.meetingTime)) return null;
    if (!Array.isArray(parsed.dateOptions)) return null;
    return {
      title: parsed.title,
      planningMode: parsed.planningMode,
      gameSelectionMode: parsed.gameSelectionMode,
      meetingTime: parsed.meetingTime,
      dateOptions: parsed.dateOptions.filter((date): date is string => typeof date === 'string')
    };
  } catch {
    return null;
  }
}

function writeSessionDraft(draftKey: string, draft: SessionDraft) {
  localStorage.setItem(draftKey, JSON.stringify(draft));
}

function formatMeetingTime(value: string) {
  const [hours, minutes] = value.split(':');
  if (!hours || !minutes) return value;
  return minutes === '00' ? `${Number(hours)}u` : `${Number(hours)}u${minutes}`;
}

export default function CreateSessionForm({
  mode = 'details',
  resetDraftOnLoad = false,
  editSessionId = null
}: {
  mode?: CreateSessionFormMode;
  resetDraftOnLoad?: boolean;
  editSessionId?: string | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('Spelavond');
  const [planningMode, setPlanningMode] = useState<PlanningMode>('vote_dates');
  const [gameSelectionMode, setGameSelectionMode] = useState<GameSelectionMode>('players_pick');
  const [meetingTime, setMeetingTime] = useState(DEFAULT_MEETING_TIME);
  const [dateOptions, setDateOptions] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [initialGameTitles, setInitialGameTitles] = useState<string[]>([]);
  const [initialGameBggIds, setInitialGameBggIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleMonthDate, setVisibleMonthDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const todayKey = useMemo(() => localDateKey(), []);
  const currentMonthKey = useMemo(() => monthDateKey(new Date()), []);
  const visibleMonth = useMemo(() => buildCalendarMonth(visibleMonthDate, todayKey), [todayKey, visibleMonthDate]);
  const draftKey = useMemo(() => sessionDraftKey(editSessionId), [editSessionId]);
  const backToPlanningHref = editSessionId ? `/planning?bewerk=${editSessionId}` : '/planning';

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setInitializing(true);
      setError(null);

      if (mode === 'details' && editSessionId) {
        try {
          const data = await loadSessionBundle(editSessionId);
          if (cancelled) return;
          if (!data.viewer_is_organizer) {
            setError('Alleen de organisator kan deze spelavond wijzigen.');
            setInitializing(false);
            return;
          }
          const defaultMeetingTime = readLastMeetingTime();
          const nextDateOptions = data.session.date_options.map((option) => option.date);
          setTitle(data.session.title.trim() || 'Spelavond');
          setPlanningMode(inferPlanningMode(nextDateOptions));
          setGameSelectionMode(inferGameSelectionMode(data.games.length, data.session.chosen_game_id));
          setMeetingTime(defaultMeetingTime);
          setDateOptions(nextDateOptions);
          setSelectedIds([]);
          setInitialGameTitles(data.games.map((game) => game.title));
          setInitialGameBggIds(data.games.map((game) => game.bgg_id).filter((id): id is number => id !== null));
        } catch (err) {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : 'Sessie laden mislukt.');
        } finally {
          if (!cancelled) setInitializing(false);
        }
        return;
      }

      if (mode === 'details') {
        if (resetDraftOnLoad) localStorage.removeItem(draftKey);
        const draft = resetDraftOnLoad ? null : readSessionDraft(draftKey);
        const defaultMeetingTime = readLastMeetingTime();
        setTitle(draft?.title.trim() || 'Spelavond');
        setPlanningMode(draft?.planningMode ?? 'vote_dates');
        setGameSelectionMode(draft?.gameSelectionMode ?? 'players_pick');
        setMeetingTime(draft?.meetingTime ?? defaultMeetingTime);
        setDateOptions(draft?.dateOptions ?? []);
        setSelectedIds([]);
        setInitialGameTitles([]);
        setInitialGameBggIds([]);
        if (!cancelled) setInitializing(false);
        return;
      }

      const draft = readSessionDraft(draftKey);
      if (!draft) {
        router.replace(editSessionId ? `/spelavond?bewerk=${editSessionId}` : '/spelavond?nieuw=1');
        return;
      }

      if (mode === 'games' && draft.gameSelectionMode === 'no_preselect') {
        router.replace(backToPlanningHref);
        return;
      }

      setTitle(draft.title.trim() || 'Spelavond');
      setPlanningMode(draft.planningMode);
      setGameSelectionMode(draft.gameSelectionMode);
      setMeetingTime(draft.meetingTime);
      setDateOptions(draft.dateOptions);
      setSelectedIds([]);

      if (mode === 'games' && editSessionId) {
        try {
          const data = await loadSessionBundle(editSessionId);
          if (cancelled) return;
          if (!data.viewer_is_organizer) {
            setError('Alleen de organisator kan deze spelavond wijzigen.');
            setInitializing(false);
            return;
          }
          setInitialGameTitles(data.games.map((game) => game.title));
          setInitialGameBggIds(data.games.map((game) => game.bgg_id).filter((id): id is number => id !== null));
        } catch (err) {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : 'Sessie laden mislukt.');
        }
      } else {
        setInitialGameTitles([]);
        setInitialGameBggIds([]);
      }

      if (!cancelled) setInitializing(false);
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [backToPlanningHref, draftKey, editSessionId, mode, resetDraftOnLoad, router]);

  function toggleDate(date: string) {
    setDateOptions((current) => {
      if (planningMode === 'fixed_day') {
        return current[0] === date ? [] : [date];
      }

      return current.includes(date)
        ? current.filter((item) => item !== date)
        : Array.from(new Set([...current, date])).sort();
    });
  }

  async function submitSession(selectedGameIds: string[], customDraft?: SessionDraft) {
    const draft = customDraft ?? {
      title: title.trim() || 'Spelavond',
      planningMode,
      gameSelectionMode,
      meetingTime,
      dateOptions
    };

    setLoading(true);
    setError(null);

    try {
      const payloadDateOptions = draft.planningMode === 'fixed_day'
        ? (draft.dateOptions[0] ? [draft.dateOptions[0]] : [])
        : draft.dateOptions;

      if (editSessionId) {
        await api(`/api/sessions/${editSessionId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: draft.title,
            date_options: payloadDateOptions,
            collection_game_ids: selectedGameIds,
            planning_mode: draft.planningMode,
            game_selection_mode: draft.gameSelectionMode,
            meeting_time: draft.meetingTime
          })
        });
      } else {
        const data = await api<{ session: { id: string } }>('/api/sessions', {
          method: 'POST',
          body: JSON.stringify({
            title: draft.title,
            date_options: payloadDateOptions,
            collection_game_ids: selectedGameIds,
            planning_mode: draft.planningMode,
            game_selection_mode: draft.gameSelectionMode,
            meeting_time: draft.meetingTime
          })
        });

        router.push(`${sessionPath(data.session.id, draft.title)}?share=invite`);
      }

      localStorage.setItem(LAST_MEETING_TIME_KEY, draft.meetingTime);
      localStorage.removeItem(draftKey);
      if (editSessionId) router.push(sessionPath(editSessionId, draft.title));
    } catch (err) {
      setError(err instanceof Error ? err.message : editSessionId ? 'Sessie wijzigen mislukt.' : 'Sessie maken mislukt.');
    } finally {
      setLoading(false);
    }
  }

  function confirmDetails(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Naam van de spelavond is verplicht.');
      return;
    }
    if (!isValidTime(meetingTime)) {
      setError('Kies een geldig uur.');
      return;
    }

    const normalizedDateOptions = planningMode === 'fixed_day' ? (dateOptions[0] ? [dateOptions[0]] : []) : dateOptions;
    const draft: SessionDraft = {
      title: trimmedTitle,
      planningMode,
      gameSelectionMode,
      meetingTime,
      dateOptions: normalizedDateOptions
    };

    writeSessionDraft(draftKey, draft);
    localStorage.setItem(LAST_MEETING_TIME_KEY, meetingTime);
    router.push(backToPlanningHref);
  }

  async function confirmPlanning(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!dateOptions.length) {
      setError(planningMode === 'fixed_day' ? 'Kies 1 datum voor de spelavond.' : 'Voeg minstens 1 datumoptie toe.');
      return;
    }

    const normalizedDateOptions = planningMode === 'fixed_day' ? [dateOptions[0]] : dateOptions;
    const draft: SessionDraft = {
      title: title.trim() || 'Spelavond',
      planningMode,
      gameSelectionMode,
      meetingTime,
      dateOptions: normalizedDateOptions
    };

    writeSessionDraft(draftKey, draft);

    if (gameSelectionMode === 'no_preselect') {
      await submitSession([], draft);
      return;
    }

    router.push(editSessionId ? `/spelkeuze?bewerk=${editSessionId}` : '/spelkeuze');
  }

  async function confirmGames(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (gameSelectionMode === 'host_pick' && selectedIds.length < 1) {
      setError('Kies 1 spel.');
      return;
    }

    if (gameSelectionMode === 'host_pick' && selectedIds.length > 1) {
      setError('Je mag maar 1 spel selecteren.');
      return;
    }

    if (gameSelectionMode === 'players_pick' && selectedIds.length < 1) {
      setError('Kies minstens 1 speloptie.');
      return;
    }

    await submitSession(selectedIds);
  }

  const onSubmit = mode === 'details' ? confirmDetails : mode === 'planning' ? confirmPlanning : confirmGames;
  const planningSummary = planningMode === 'fixed_day' ? 'Organisator kiest 1 vaste dag' : 'Deelnemers stemmen op meerdere opties';
  const gameSummary = gameSelectionMode === 'no_preselect'
    ? 'Geen spel op voorhand'
    : gameSelectionMode === 'host_pick'
      ? 'Organisator kiest 1 spel'
      : 'Spelers krijgen meerdere opties';
  const planningButtonLabel = gameSelectionMode === 'no_preselect'
    ? (loading ? (editSessionId ? 'Spelavond wijzigen...' : 'Spelavond maken...') : (editSessionId ? 'Spelavond wijzigen' : 'Spelavond maken'))
    : 'Bevestig planning';
  const gamePickerTitle = gameSelectionMode === 'host_pick' ? 'Kies 1 spel uit je lokale lijst' : 'Kies meerdere spellen uit je lokale lijst';
  const gamePickerSubtitle = gameSelectionMode === 'host_pick'
    ? 'Dit spel staat vast voor deze spelavond.'
    : 'Deze lijst wordt straks de stemlijst voor de spelers.';
  const hostPickHasTooManySelected = gameSelectionMode === 'host_pick' && selectedIds.length > 1;

  if (initializing) {
    return <div className="mt-8 rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Instellingen laden...</div>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      {mode === 'details' && (
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
            <p className="text-sm font-semibold text-slate-700">Planning keuze</p>
            <div className="mt-3 grid gap-2">
              <label className={`cursor-pointer rounded-2xl border px-4 py-3 ${planningMode === 'fixed_day' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <input
                  type="radio"
                  name="planning-mode"
                  value="fixed_day"
                  checked={planningMode === 'fixed_day'}
                  onChange={() => setPlanningMode('fixed_day')}
                  className="sr-only"
                />
                <p className="font-bold text-slate-900">Ik bepaal nu al de dag</p>
                <p className="text-sm text-slate-600">Je kiest straks 1 vaste datum.</p>
              </label>
              <label className={`cursor-pointer rounded-2xl border px-4 py-3 ${planningMode === 'vote_dates' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <input
                  type="radio"
                  name="planning-mode"
                  value="vote_dates"
                  checked={planningMode === 'vote_dates'}
                  onChange={() => setPlanningMode('vote_dates')}
                  className="sr-only"
                />
                <p className="font-bold text-slate-900">Deelnemers stemmen op datums</p>
                <p className="text-sm text-slate-600">Je kiest straks meerdere datumopties.</p>
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Spelkeuze</p>
            <div className="mt-3 grid gap-2">
              <label className={`cursor-pointer rounded-2xl border px-4 py-3 ${gameSelectionMode === 'no_preselect' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <input
                  type="radio"
                  name="game-mode"
                  value="no_preselect"
                  checked={gameSelectionMode === 'no_preselect'}
                  onChange={() => setGameSelectionMode('no_preselect')}
                  className="sr-only"
                />
                <p className="font-bold text-slate-900">Geen spel op voorhand kiezen</p>
                <p className="text-sm text-slate-600">De sessie wordt gemaakt zonder vooraf gekozen spellen.</p>
              </label>
              <label className={`cursor-pointer rounded-2xl border px-4 py-3 ${gameSelectionMode === 'host_pick' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <input
                  type="radio"
                  name="game-mode"
                  value="host_pick"
                  checked={gameSelectionMode === 'host_pick'}
                  onChange={() => setGameSelectionMode('host_pick')}
                  className="sr-only"
                />
                <p className="font-bold text-slate-900">Ik kies zelf 1 spel</p>
                <p className="text-sm text-slate-600">Je selecteert straks exact 1 spel.</p>
              </label>
              <label className={`cursor-pointer rounded-2xl border px-4 py-3 ${gameSelectionMode === 'players_pick' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <input
                  type="radio"
                  name="game-mode"
                  value="players_pick"
                  checked={gameSelectionMode === 'players_pick'}
                  onChange={() => setGameSelectionMode('players_pick')}
                  className="sr-only"
                />
                <p className="font-bold text-slate-900">Spelers laten meebeslissen</p>
                <p className="text-sm text-slate-600">Je kiest straks meerdere spelopties.</p>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Afspreekuur</label>
            <input
              type="time"
              value={meetingTime}
              onChange={(event) => setMeetingTime(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
              required
            />
            <p className="mt-2 text-sm text-slate-500">Onthoudt je laatste keuze. Eerste keer: standaard 20:00.</p>
          </div>
        </>
      )}

      {mode !== 'details' && (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <b className="text-slate-900">{title}</b>
          <span className="block">Planning: {planningSummary}</span>
          <span className="block">Spelkeuze: {gameSummary}</span>
          <span className="block">Afspreekuur: {formatMeetingTime(meetingTime)}</span>
        </div>
      )}

      {mode === 'planning' && (
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
                              selected ? 'border-emerald-500 bg-emerald-200 shadow-sm shadow-emerald-500/20' : '',
                              cell.isToday ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white' : ''
                            ].join(' ')}
                          >
                            <span className="flex h-full flex-col justify-between p-1.5">
                              <span className="flex items-start justify-between gap-1">
                                <span className={`text-xs font-black ${cell.isSelectable ? '' : 'text-slate-300'}`}>{cell.dayNumber}</span>
                                {selected ? <Check size={13} className="shrink-0 text-emerald-800" /> : null}
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
          <p className="mt-3 text-sm text-slate-500">
            {planningMode === 'fixed_day'
              ? 'Kies exact 1 datum voor je spelavond.'
              : 'Selecteer 1 of meerdere datums waarop deelnemers later kunnen stemmen.'}
          </p>
        </div>
      )}

      {mode === 'games' && (
        <div>
          <GameCollectionPicker
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            autoSelectTitles={initialGameTitles}
            autoSelectBggIds={initialGameBggIds}
            title={gamePickerTitle}
            subtitle={gamePickerSubtitle}
          />
          <p className="mt-3 text-sm text-slate-500">
            {gameSelectionMode === 'host_pick' ? `${selectedIds.length}/1 spel gekozen` : `${selectedIds.length} spel${selectedIds.length === 1 ? '' : 'len'} gekozen`}
          </p>
          {hostPickHasTooManySelected && (
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
              Je kan maar 1 spel selecteren.
            </p>
          )}
        </div>
      )}

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <button
        disabled={
          loading
          || initializing
          || (mode === 'planning' && !dateOptions.length)
          || (mode === 'games' && gameSelectionMode === 'host_pick' && selectedIds.length < 1)
          || (mode === 'games' && gameSelectionMode === 'players_pick' && selectedIds.length < 1)
        }
        className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-60"
      >
        {mode === 'details' && 'Bevestig keuzes'}
        {mode === 'planning' && planningButtonLabel}
        {mode === 'games' && (loading ? (editSessionId ? 'Spelavond wijzigen...' : 'Spelavond maken...') : (editSessionId ? 'Spelavond wijzigen' : 'Spelavond maken'))}
      </button>
    </form>
  );
}
