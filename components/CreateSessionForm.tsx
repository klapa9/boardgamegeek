'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, loadSessionBundle } from '@/lib/api';
import { sessionPath } from '@/lib/session-link';
import DateOptionCalendar from './DateOptionCalendar';
import GameCollectionPicker from './GameCollectionPicker';

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

const SESSION_DRAFT_KEY = 'gsk-session-draft';
const LAST_MEETING_TIME_KEY = 'gsk-last-meeting-time';
const DEFAULT_MEETING_TIME = '20:00';

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
          setPlanningMode('vote_dates');
          setGameSelectionMode(inferGameSelectionMode(data.games.length, data.session.chosen_game_id));
          setMeetingTime(data.session.meeting_time || defaultMeetingTime);
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
        setPlanningMode('vote_dates');
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
      setPlanningMode('vote_dates');
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
  const planningSummary = 'Deelnemers stemmen op datumopties';
  const gameSummary = gameSelectionMode === 'no_preselect'
    ? 'Geen spel op voorhand'
    : gameSelectionMode === 'host_pick'
      ? 'Organisator kiest 1 spel'
      : 'Spelers krijgen meerdere opties';
  const planningButtonLabel = gameSelectionMode === 'no_preselect'
    ? (loading ? (editSessionId ? 'Spelavond wijzigen...' : 'Spelavond maken...') : (editSessionId ? 'Spelavond wijzigen' : 'Spelavond maken'))
    : 'Bevestig planning';
  const gamePickerTitle = gameSelectionMode === 'host_pick' ? 'Kies 1 spel uit je spelcollectie' : 'Kies meerdere spellen uit je spelcollectie';
  const gamePickerSubtitle = gameSelectionMode === 'host_pick'
    ? 'Dit spel staat vast voor deze spelavond.'
    : 'Deze lijst wordt straks de stemlijst van je spelers.';
  const hostPickHasTooManySelected = gameSelectionMode === 'host_pick' && selectedIds.length > 1;

  if (initializing) {
    return <div className="neo-muted-panel mt-8 text-sm text-slate-500">Instellingen laden...</div>;
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
              className="neo-input"
              placeholder="Spelavond vrijdag"
              required
            />
          </div>

          <div className="page-subcard p-4">
            <p className="text-sm font-semibold text-slate-700">Planning keuze</p>
            <div className="mt-3 rounded-2xl border-2 border-slate-950 bg-[#84d7ff]/35 px-4 py-3">
              <p className="font-bold text-slate-900">Deelnemers stemmen op datumopties.</p>
              <p className="text-sm text-slate-600">Je kiest straks meerdere opties waarop iedereen kan aanduiden welke dag ze kunnen.</p>
            </div>
          </div>

          <div className="page-subcard p-4">
            <p className="text-sm font-semibold text-slate-700">Spelkeuze</p>
            <div className="mt-3 grid gap-2">
              <label className={`cursor-pointer rounded-2xl border-2 px-4 py-3 ${gameSelectionMode === 'no_preselect' ? 'border-slate-950 bg-[#ffc7b8]/55' : 'border-slate-950/10 bg-white/80'}`}>
                <input
                  type="radio"
                  name="game-mode"
                  value="no_preselect"
                  checked={gameSelectionMode === 'no_preselect'}
                  onChange={() => setGameSelectionMode('no_preselect')}
                  className="sr-only"
                />
                <p className="font-bold text-slate-900">Geen spel op voorhand kiezen</p>
                <p className="text-sm text-slate-600">Er wordt niet op voorhand beslist welk spel jullie gaan spelen.</p>
              </label>
              <label className={`cursor-pointer rounded-2xl border-2 px-4 py-3 ${gameSelectionMode === 'host_pick' ? 'border-slate-950 bg-[#fff2bd]' : 'border-slate-950/10 bg-white/80'}`}>
                <input
                  type="radio"
                  name="game-mode"
                  value="host_pick"
                  checked={gameSelectionMode === 'host_pick'}
                  onChange={() => setGameSelectionMode('host_pick')}
                  className="sr-only"
                />
                <p className="font-bold text-slate-900">Ik kies zelf 1 spel</p>
                <p className="text-sm text-slate-600">Je selecteert straks het spel dat jullie gaan spelen.</p>
              </label>
              <label className={`cursor-pointer rounded-2xl border-2 px-4 py-3 ${gameSelectionMode === 'players_pick' ? 'border-slate-950 bg-[#84d7ff]/35' : 'border-slate-950/10 bg-white/80'}`}>
                <input
                  type="radio"
                  name="game-mode"
                  value="players_pick"
                  checked={gameSelectionMode === 'players_pick'}
                  onChange={() => setGameSelectionMode('players_pick')}
                  className="sr-only"
                />
                <p className="font-bold text-slate-900">Spelers laten meebeslissen</p>
                <p className="text-sm text-slate-600">Je kiest straks meerdere spelopties, iedereen kan stemmen welk spel ze liever of minder graag willen spelen.</p>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Afspreekuur</label>
            <input
              type="time"
              value={meetingTime}
              onChange={(event) => setMeetingTime(event.target.value)}
              className="neo-input"
              required
            />
            <p className="mt-2 text-sm text-slate-500">Onthoudt je laatste keuze. Eerste keer: standaard 20:00.</p>
          </div>
        </>
      )}

      {mode !== 'details' && (
        <div className="page-subcard-soft px-4 py-3 text-sm text-slate-600">
          <b className="text-slate-900">{title}</b>
          <span className="block">Planning: {planningSummary}</span>
          <span className="block">Spelkeuze: {gameSummary}</span>
          <span className="block">Afspreekuur: {formatMeetingTime(meetingTime)}</span>
        </div>
      )}

      {mode === 'planning' && (
        <div className="page-subcard p-4">
          <DateOptionCalendar selectedDates={dateOptions} onToggleDate={toggleDate} />
          <p className="mt-3 text-sm text-slate-500">
            Selecteer 1 of meerdere datums waarop deelnemers later kunnen stemmen.
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
            searchPlaceholder="Zoek in je collectie"
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
        className="neo-button neo-button-primary w-full disabled:opacity-60"
      >
        {mode === 'details' && 'Bevestig keuzes'}
        {mode === 'planning' && planningButtonLabel}
        {mode === 'games' && (loading ? (editSessionId ? 'Spelavond wijzigen...' : 'Spelavond maken...') : (editSessionId ? 'Spelavond wijzigen' : 'Spelavond maken'))}
      </button>
    </form>
  );
}
