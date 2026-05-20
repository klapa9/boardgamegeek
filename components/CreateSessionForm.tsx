'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, loadSessionBundle } from '@/lib/api';
import { BggGameDetails, BggSearchResult, CollectionBundle } from '@/lib/types';
import DateOptionCalendar from './DateOptionCalendar';
import GameCollectionPicker from './GameCollectionPicker';
import NativeTimeInput from './NativeTimeInput';
import { Dice5, X } from 'lucide-react';

type CreateSessionFormMode = 'details' | 'planning' | 'games';
type PlanningMode = 'fixed_day' | 'vote_dates';
type GameSelectionMode = 'no_preselect' | 'host_pick' | 'players_pick';
type SessionDraftQuestionOption = {
  id: string | null;
  clientId: string;
  label: string;
};
type SessionDraftQuestion = {
  id: string | null;
  clientId: string;
  prompt: string;
  allowMultiple: boolean;
  options: SessionDraftQuestionOption[];
};

type SessionDraft = {
  title: string;
  planningMode: PlanningMode;
  gameSelectionMode: GameSelectionMode;
  meetingTime: string;
  meetingLocation: string;
  dateOptions: string[];
  extraQuestions: SessionDraftQuestion[];
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

function createClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `draft-${Math.random().toString(36).slice(2, 11)}`;
}

function createDraftOption(option?: Partial<Pick<SessionDraftQuestionOption, 'id' | 'label'>>) {
  return {
    id: option?.id ?? null,
    clientId: createClientId(),
    label: option?.label ?? ''
  } satisfies SessionDraftQuestionOption;
}

function createDraftQuestion(question?: Partial<Pick<SessionDraftQuestion, 'id' | 'prompt' | 'allowMultiple'>> & { options?: Array<Partial<Pick<SessionDraftQuestionOption, 'id' | 'label'>>> }) {
  return {
    id: question?.id ?? null,
    clientId: createClientId(),
    prompt: question?.prompt ?? '',
    allowMultiple: question?.allowMultiple ?? false,
    options: question?.options?.length
      ? question.options.map((option) => createDraftOption(option))
      : [createDraftOption(), createDraftOption()]
  } satisfies SessionDraftQuestion;
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
    const extraQuestions = Array.isArray(parsed.extraQuestions)
      ? parsed.extraQuestions.map((question) => {
        if (!question || typeof question !== 'object') return null;
        const row = question as Record<string, unknown>;
        const options = Array.isArray(row.options) ? row.options : [];
        return createDraftQuestion({
          id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : null,
          prompt: typeof row.prompt === 'string' ? row.prompt : '',
          allowMultiple: Boolean(row.allowMultiple),
          options: options
            .filter((option): option is Record<string, unknown> => Boolean(option) && typeof option === 'object')
            .map((option) => ({
              id: typeof option.id === 'string' && option.id.trim() ? option.id.trim() : null,
              label: typeof option.label === 'string' ? option.label : ''
            }))
        });
      }).filter((question): question is SessionDraftQuestion => Boolean(question))
      : [];
    return {
      title: parsed.title,
      planningMode: parsed.planningMode,
      gameSelectionMode: parsed.gameSelectionMode,
      meetingTime: parsed.meetingTime,
      meetingLocation: typeof parsed.meetingLocation === 'string' ? parsed.meetingLocation : '',
      dateOptions: parsed.dateOptions.filter((date): date is string => typeof date === 'string'),
      extraQuestions
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

function sessionOnlyImageUrl(game: BggGameDetails) {
  return game.thumbnailUrl ?? game.imageUrl;
}

function normalizeSessionGameTitle(title: string) {
  return title.trim().toLowerCase();
}

function normalizeExtraQuestionsForPayload(extraQuestions: SessionDraftQuestion[]): (
  | {
    error: string;
  }
  | {
    payload: Array<{
      id: string | null;
      prompt: string;
      allow_multiple: boolean;
      options: Array<{
        id: string | null;
        label: string;
      }>;
    }>;
  }
) {
  const payload: Array<{
    id: string | null;
    prompt: string;
    allow_multiple: boolean;
    options: Array<{
      id: string | null;
      label: string;
    }>;
  }> = [];

  for (const [questionIndex, question] of extraQuestions.entries()) {
    const prompt = question.prompt.trim();
    if (!prompt) {
      return { error: `Vraag ${questionIndex + 1} heeft nog geen tekst.` };
    }

    const options = question.options.map((option) => ({
      id: option.id,
      label: option.label.trim()
    }));
    if (options.length < 2) {
      return { error: `Vraag ${questionIndex + 1} moet minstens 2 antwoordopties hebben.` };
    }
    if (options.some((option) => !option.label)) {
      return { error: `Vraag ${questionIndex + 1} heeft nog lege antwoordopties.` };
    }

    const distinctOptions = new Set(options.map((option) => option.label.toLocaleLowerCase()));
    if (distinctOptions.size !== options.length) {
      return { error: `Vraag ${questionIndex + 1} bevat dubbele antwoordopties.` };
    }

    payload.push({
      id: question.id,
      prompt,
      allow_multiple: question.allowMultiple,
      options
    });
  }

  return { payload };
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
  const [meetingLocation, setMeetingLocation] = useState('');
  const [recentMeetingLocations, setRecentMeetingLocations] = useState<string[]>([]);
  const [locationSuggestionsOpen, setLocationSuggestionsOpen] = useState(false);
  const [dateOptions, setDateOptions] = useState<string[]>([]);
  const [extraQuestions, setExtraQuestions] = useState<SessionDraftQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sessionOnlyGames, setSessionOnlyGames] = useState<BggGameDetails[]>([]);
  const [initialGameTitles, setInitialGameTitles] = useState<string[]>([]);
  const [initialGameBggIds, setInitialGameBggIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
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
          setPlanningMode(data.session.planning_mode);
          setGameSelectionMode(data.session.game_selection_mode);
          setMeetingTime(data.session.meeting_time || defaultMeetingTime);
          setMeetingLocation(data.session.meeting_location ?? '');
          setDateOptions(nextDateOptions);
          setExtraQuestions(data.questions.map((question) => createDraftQuestion({
            id: question.id,
            prompt: question.prompt,
            allowMultiple: question.allow_multiple,
            options: question.options.map((option) => ({
              id: option.id,
              label: option.label
            }))
          })));
          setSelectedIds([]);
          setSessionOnlyGames([]);
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
        setMeetingLocation(draft?.meetingLocation ?? '');
        setDateOptions(draft?.dateOptions ?? []);
        setExtraQuestions(draft?.extraQuestions ?? []);
        setSelectedIds([]);
        setSessionOnlyGames([]);
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
      setMeetingLocation(draft.meetingLocation);
      setDateOptions(draft.dateOptions);
      setExtraQuestions(draft.extraQuestions);
      setSelectedIds([]);
      setSessionOnlyGames([]);

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
          const collectionData = await api<CollectionBundle>('/api/collection/games');
          if (cancelled) return;
          const collectionKeys = new Set(collectionData.games.map((game) => (
            game.bgg_id !== null ? `bgg:${game.bgg_id}` : `title:${game.title.trim().toLowerCase()}`
          )));
          const sessionOnlyGames = data.games
            .filter((game) => {
              const key = game.bgg_id !== null ? `bgg:${game.bgg_id}` : `title:${game.title.trim().toLowerCase()}`;
              return !collectionKeys.has(key);
            })
          const resolvedSessionOnlyGames = await Promise.all(sessionOnlyGames.map(async (game) => {
            let geekType: BggGameDetails['geekType'] = 'boardgame';

            if (game.bgg_id !== null) {
              try {
                const rpgDetails = await api<BggGameDetails>(`/api/bgg/thing/${game.bgg_id}?geek_type=rpg`);
                if (normalizeSessionGameTitle(rpgDetails.title) === normalizeSessionGameTitle(game.title)) {
                  geekType = 'rpg';
                }
              } catch {
                geekType = 'boardgame';
              }
            }

            return {
              bggId: game.bgg_id ?? Number.NaN,
              geekType,
              title: game.title,
              yearPublished: game.year_published,
              thumbnailUrl: game.thumbnail_url,
              imageUrl: game.image_url,
              minPlayers: game.min_players,
              maxPlayers: game.max_players,
              playingTime: game.playing_time,
              minAge: game.min_age,
              averageRating: game.bgg_rating,
              bayesAverage: game.bgg_bayes_rating,
              averageWeight: game.bgg_weight,
              mechanics: game.mechanics,
              categories: game.categories,
              designers: game.designers,
              playMode: game.play_mode,
              communityPlayers: game.community_players,
              playerCountPoll: game.player_count_poll,
              ranks: game.ranks
            };
          }));
          if (cancelled) return;
          setSessionOnlyGames(resolvedSessionOnlyGames
            .filter((game) => Number.isFinite(game.bggId)));
        } catch (err) {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : 'Sessie laden mislukt.');
        }
      } else {
        setInitialGameTitles([]);
        setInitialGameBggIds([]);
        setSessionOnlyGames([]);
      }

      if (!cancelled) setInitializing(false);
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [backToPlanningHref, draftKey, editSessionId, mode, resetDraftOnLoad, router]);

  useEffect(() => {
    if (mode !== 'details') return;
    let cancelled = false;

    async function loadRecentMeetingLocations() {
      try {
        const data = await api<{ locations: string[] }>('/api/session-locations');
        if (!cancelled) setRecentMeetingLocations(data.locations);
      } catch {
        if (!cancelled) setRecentMeetingLocations([]);
      }
    }

    void loadRecentMeetingLocations();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  function toggleDate(date: string) {
    setDateOptions((current) => {
      if (planningMode === 'fixed_day') {
        return current[0] === date ? [] : [date];
      }

      if (current.includes(date)) {
        return current.filter((item) => item !== date);
      }

      return [...current, date].sort((left, right) => left.localeCompare(right));
    });
  }

  async function submitSession(selectedGameIds: string[], customDraft?: SessionDraft) {
    const draft = customDraft ?? {
      title: title.trim() || 'Spelavond',
      planningMode,
      gameSelectionMode,
      meetingTime,
      meetingLocation,
      dateOptions,
      extraQuestions
    };

    const normalizedExtraQuestions = normalizeExtraQuestionsForPayload(draft.extraQuestions);
    if ('error' in normalizedExtraQuestions) {
      setError(normalizedExtraQuestions.error);
      return;
    }

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
            bgg_games: sessionOnlyGames.map((game) => ({ bgg_id: game.bggId, geek_type: game.geekType })),
            planning_mode: draft.planningMode,
            game_selection_mode: draft.gameSelectionMode,
            meeting_time: draft.meetingTime,
            meeting_location: draft.meetingLocation.trim() || null,
            extra_questions: normalizedExtraQuestions.payload
          })
        });
      } else {
        const data = await api<{ session: { id: string } }>('/api/sessions', {
          method: 'POST',
          body: JSON.stringify({
            title: draft.title,
            date_options: payloadDateOptions,
            collection_game_ids: selectedGameIds,
            bgg_games: sessionOnlyGames.map((game) => ({ bgg_id: game.bggId, geek_type: game.geekType })),
            planning_mode: draft.planningMode,
            game_selection_mode: draft.gameSelectionMode,
            meeting_time: draft.meetingTime,
            meeting_location: draft.meetingLocation.trim() || null,
            extra_questions: normalizedExtraQuestions.payload
          })
        });

        router.push(`/spelavond/voltooid?id=${data.session.id}`);
      }

      localStorage.setItem(LAST_MEETING_TIME_KEY, draft.meetingTime);
      localStorage.removeItem(draftKey);
      if (editSessionId) {
        router.push(`/spelavond/voltooid?id=${editSessionId}&bewerkt=1`);
      }
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

    const normalizedExtraQuestions = normalizeExtraQuestionsForPayload(extraQuestions);
    if ('error' in normalizedExtraQuestions) {
      setError(normalizedExtraQuestions.error);
      return;
    }

    const normalizedDateOptions = planningMode === 'fixed_day' ? (dateOptions[0] ? [dateOptions[0]] : []) : dateOptions;
    const draft: SessionDraft = {
      title: trimmedTitle,
      planningMode,
      gameSelectionMode,
      meetingTime,
      meetingLocation,
      dateOptions: normalizedDateOptions,
      extraQuestions
    };

    writeSessionDraft(draftKey, draft);
    localStorage.setItem(LAST_MEETING_TIME_KEY, meetingTime);
    router.push(backToPlanningHref);
  }

  function handleTitleInputFocus(event: React.FocusEvent<HTMLInputElement>) {
    event.currentTarget.select();
  }

  function handleTitleInputPointerUp(event: React.PointerEvent<HTMLInputElement>) {
    if (document.activeElement === event.currentTarget) {
      event.preventDefault();
    }
  }

  function handleTitleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    titleInputRef.current?.blur();
  }

  function addExtraQuestion() {
    setExtraQuestions((current) => [...current, createDraftQuestion()]);
  }

  function removeExtraQuestion(clientId: string) {
    setExtraQuestions((current) => current.filter((question) => question.clientId !== clientId));
  }

  function updateExtraQuestion(clientId: string, updates: Partial<Pick<SessionDraftQuestion, 'prompt' | 'allowMultiple'>>) {
    setExtraQuestions((current) => current.map((question) => (
      question.clientId === clientId ? { ...question, ...updates } : question
    )));
  }

  function addExtraQuestionOption(questionClientId: string) {
    setExtraQuestions((current) => current.map((question) => (
      question.clientId === questionClientId
        ? { ...question, options: [...question.options, createDraftOption()] }
        : question
    )));
  }

  function updateExtraQuestionOption(questionClientId: string, optionClientId: string, label: string) {
    setExtraQuestions((current) => current.map((question) => (
      question.clientId === questionClientId
        ? {
          ...question,
          options: question.options.map((option) => (
            option.clientId === optionClientId ? { ...option, label } : option
          ))
        }
        : question
    )));
  }

  function removeExtraQuestionOption(questionClientId: string, optionClientId: string) {
    setExtraQuestions((current) => current.map((question) => (
      question.clientId === questionClientId
        ? {
          ...question,
          options: question.options.length <= 2
            ? question.options
            : question.options.filter((option) => option.clientId !== optionClientId)
        }
        : question
    )));
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
      meetingLocation,
      dateOptions: normalizedDateOptions,
      extraQuestions
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
    const totalSelectedGames = selectedIds.length + sessionOnlyGames.length;

    if (gameSelectionMode === 'host_pick' && totalSelectedGames < 1) {
      setError('Kies 1 spel.');
      return;
    }

    if (gameSelectionMode === 'host_pick' && totalSelectedGames > 1) {
      setError('Je mag maar 1 spel selecteren.');
      return;
    }

    if (gameSelectionMode === 'players_pick' && totalSelectedGames < 1) {
      setError('Kies minstens 1 speloptie.');
      return;
    }

    await submitSession(selectedIds);
  }

  async function addSessionOnlyBggGame(result: BggSearchResult) {
    const details = await api<BggGameDetails>(`/api/bgg/thing/${result.bggId}?geek_type=${encodeURIComponent(result.geekType)}`);
    setSessionOnlyGames((current) => current.some((game) => game.bggId === details.bggId && game.geekType === details.geekType) ? current : [...current, details]);
  }

  const onSubmit = mode === 'details' ? confirmDetails : mode === 'planning' ? confirmPlanning : confirmGames;
  const planningSummary = planningMode === 'fixed_day' ? 'Organisator kiest 1 vaste dag' : 'Deelnemers stemmen op datumopties';
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
  const totalSelectedGames = selectedIds.length + sessionOnlyGames.length;
  const hostPickHasTooManySelected = gameSelectionMode === 'host_pick' && totalSelectedGames > 1;
  const extraQuestionsSummary = extraQuestions.length
    ? `${extraQuestions.length} extra vraag${extraQuestions.length === 1 ? '' : 'vragen'}`
    : 'Geen extra vragen';

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
              ref={titleInputRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onFocus={handleTitleInputFocus}
              onPointerUp={handleTitleInputPointerUp}
              onKeyDown={handleTitleInputKeyDown}
              className="neo-input"
              placeholder="Spelavond vrijdag"
              enterKeyHint="go"
              required
            />
          </div>

          <div className="page-subcard p-4">
            <p className="text-sm font-semibold text-slate-700">Planning keuze</p>
            <div className="mt-3 grid gap-2">
              <label className={`cursor-pointer rounded-2xl border-2 px-4 py-3 ${planningMode === 'fixed_day' ? 'border-slate-950 bg-[#d8ff63]/45' : 'border-slate-950/10 bg-white/80'}`}>
                <input
                  type="radio"
                  name="planning-mode"
                  value="fixed_day"
                  checked={planningMode === 'fixed_day'}
                  onChange={() => setPlanningMode('fixed_day')}
                  className="sr-only"
                />
                <p className="font-bold text-slate-900">Ik kies zelf 1 dag</p>
                <p className="text-sm text-slate-600">Je kiest straks 1 datum waarop de spelavond plaatsvindt.</p>
              </label>
              <label className={`cursor-pointer rounded-2xl border-2 px-4 py-3 ${planningMode === 'vote_dates' ? 'border-slate-950 bg-[#84d7ff]/35' : 'border-slate-950/10 bg-white/80'}`}>
                <input
                  type="radio"
                  name="planning-mode"
                  value="vote_dates"
                  checked={planningMode === 'vote_dates'}
                  onChange={() => setPlanningMode('vote_dates')}
                  className="sr-only"
                />
                <p className="font-bold text-slate-900">Deelnemers stemmen op datumopties.</p>
                <p className="text-sm text-slate-600">Je kiest straks meerdere opties waarop deelnemers kunnen aanduiden welke dag ze beschikbaar zijn.</p>
              </label>
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
                <p className="font-bold text-slate-900">Geen spel op voorhand kiezen.</p>
                <p className="text-sm text-slate-600">Er worden geen spellen weergegeven bij deze spelavond.</p>
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
                <p className="font-bold text-slate-900">Ik kies zelf de spellen.</p>
                <p className="text-sm text-slate-600">Je selecteert straks zelf de spellen die gespeeld zullen worden.</p>
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
                <p className="text-sm text-slate-600">Je kiest straks meerdere spelopties, iedereen kan stemmen welk spel ze liever of minder graag willen spelen. Deelnemers kunnen ook zelf spellen toevoegen.</p>
              </label>
            </div>
          </div>

          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Afspreekuur</label>
                <NativeTimeInput
                  value={meetingTime}
                  onChange={setMeetingTime}
                  required
                  id="create-meeting-time"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Locatie</label>
                <input
                  value={meetingLocation}
                  onChange={(event) => setMeetingLocation(event.target.value)}
                  onFocus={() => setLocationSuggestionsOpen(true)}
                  onBlur={() => window.setTimeout(() => setLocationSuggestionsOpen(false), 120)}
                  className="neo-input"
                  id="create-meeting-location"
                  list="create-meeting-location-options"
                  maxLength={160}
                  placeholder="Onbepaald"
                />
                <datalist id="create-meeting-location-options">
                  {recentMeetingLocations.map((location) => (
                    <option key={location} value={location} />
                  ))}
                </datalist>
                {locationSuggestionsOpen && recentMeetingLocations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recentMeetingLocations.map((location) => (
                      <button
                        key={location}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setMeetingLocation(location);
                          setLocationSuggestionsOpen(false);
                        }}
                        className="rounded-full bg-white/85 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-950/10 hover:bg-white"
                      >
                        {location}
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-sm text-slate-500">Laat leeg als de locatie nog onbepaald is.</p>
              </div>
            </div>
          </div>

          <div className="page-subcard p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Extra vragen voor deelnemers</p>
                <p className="mt-1 text-sm text-slate-500">Voeg optionele instellingen toe zoals snacks, vervoer of andere praktische keuzes. Deelnemers moeten elke vraag beantwoorden.</p>
              </div>
              <button type="button" onClick={addExtraQuestion} className="neo-button neo-button-ghost text-sm">
                Vraag toevoegen
              </button>
            </div>

            {!extraQuestions.length && (
              <p className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-500">
                Nog geen extra vragen toegevoegd.
              </p>
            )}

            {!!extraQuestions.length && (
              <div className="mt-4 space-y-4">
                {extraQuestions.map((question, questionIndex) => (
                  <div key={question.clientId} className="rounded-2xl border border-slate-950/10 bg-white/80 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Vraag {questionIndex + 1}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {question.allowMultiple ? 'Meerdere antwoorden mogelijk' : '1 antwoord mogelijk'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExtraQuestion(question.clientId)}
                        className="neo-button neo-button-ghost text-sm text-red-700"
                      >
                        Verwijderen
                      </button>
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Vraagtekst</label>
                      <input
                        value={question.prompt}
                        onChange={(event) => updateExtraQuestion(question.clientId, { prompt: event.target.value })}
                        className="neo-input"
                        placeholder="Bijvoorbeeld: Wie brengt snacks mee?"
                      />
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <label className={`cursor-pointer rounded-2xl border-2 px-4 py-3 ${!question.allowMultiple ? 'border-slate-950 bg-[#fff2bd]' : 'border-slate-950/10 bg-white/80'}`}>
                        <input
                          type="radio"
                          name={`question-mode-${question.clientId}`}
                          checked={!question.allowMultiple}
                          onChange={() => updateExtraQuestion(question.clientId, { allowMultiple: false })}
                          className="sr-only"
                        />
                        <p className="font-bold text-slate-900">1 antwoord</p>
                        <p className="text-sm text-slate-600">Elke deelnemer kiest precies 1 optie.</p>
                      </label>
                      <label className={`cursor-pointer rounded-2xl border-2 px-4 py-3 ${question.allowMultiple ? 'border-slate-950 bg-[#84d7ff]/35' : 'border-slate-950/10 bg-white/80'}`}>
                        <input
                          type="radio"
                          name={`question-mode-${question.clientId}`}
                          checked={question.allowMultiple}
                          onChange={() => updateExtraQuestion(question.clientId, { allowMultiple: true })}
                          className="sr-only"
                        />
                        <p className="font-bold text-slate-900">Meerdere antwoorden</p>
                        <p className="text-sm text-slate-600">Deelnemers mogen meerdere opties tegelijk aanduiden.</p>
                      </label>
                    </div>

                    <div className="mt-4 space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <div key={option.clientId} className="flex items-center gap-2">
                          <input
                            value={option.label}
                            onChange={(event) => updateExtraQuestionOption(question.clientId, option.clientId, event.target.value)}
                            className="neo-input flex-1"
                            placeholder={`Antwoordoptie ${optionIndex + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeExtraQuestionOption(question.clientId, option.clientId)}
                            disabled={question.options.length <= 2}
                            className="neo-button neo-button-ghost text-sm disabled:opacity-40"
                          >
                            Weg
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => addExtraQuestionOption(question.clientId)}
                      className="neo-button neo-button-ghost mt-3 text-sm"
                    >
                      Antwoordoptie toevoegen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {mode !== 'details' && (
        <div className="page-subcard-soft px-4 py-3 text-sm text-slate-600">
          <b className="text-slate-900">{title}</b>
          <span className="block">Planning: {planningSummary}</span>
          <span className="block">Spelkeuze: {gameSummary}</span>
          <span className="block">Afspreekuur: {formatMeetingTime(meetingTime)}</span>
          <span className="block">Locatie: {meetingLocation.trim() || 'onbepaald'}</span>
          <span className="block">Extra vragen: {extraQuestionsSummary}</span>
        </div>
      )}

      {mode === 'planning' && (
        <div className="page-subcard p-4">
          <DateOptionCalendar
            selectedDates={dateOptions}
            onToggleDate={toggleDate}
            selectionMode={planningMode === 'fixed_day' ? 'single' : 'multiple'}
          />
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
            allowAddToCollection
            disabledBggIds={sessionOnlyGames.map((game) => game.bggId)}
            onBggSelectWithoutCollection={addSessionOnlyBggGame}
            title={gamePickerTitle}
            subtitle={gamePickerSubtitle}
            searchPlaceholder="Zoek in je collectie"
          />
          <p className="mt-3 text-sm text-slate-500">
            {gameSelectionMode === 'host_pick' ? `${totalSelectedGames}/1 spel gekozen` : `${totalSelectedGames} spel${totalSelectedGames === 1 ? '' : 'len'} gekozen`}
          </p>
          {!!sessionOnlyGames.length && (
            <div className="page-subcard-soft mt-3 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700">Enkel voor deze spelavond <span className="text-slate-400">({sessionOnlyGames.length})</span></p>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {sessionOnlyGames.map((game) => (
                  <li key={game.bggId} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                    {sessionOnlyImageUrl(game) ? (
                      <img src={sessionOnlyImageUrl(game)!} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Dice5 size={18} /></div>
                    )}
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm">{game.title}</b>
                      <span className="block truncate text-xs text-slate-500">
                        BGG #{game.bggId}{game.yearPublished ? ` - ${game.yearPublished}` : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSessionOnlyGames((current) => current.filter((entry) => entry.bggId !== game.bggId))}
                      className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                      title="Uit selectie verwijderen"
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
          || (mode === 'games' && gameSelectionMode === 'host_pick' && totalSelectedGames < 1)
          || (mode === 'games' && gameSelectionMode === 'players_pick' && totalSelectedGames < 1)
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
