'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SignIn, useUser } from '@clerk/nextjs';
import { ArrowLeft, CalendarDays, Check, Dice5, Lock, Plus, Share2, Trash2, Trophy, Unlock, UserRound, X } from 'lucide-react';
import { api, loadSessionBundle } from '@/lib/api';
import { AvailabilityDto, GameDto, PlayerDto, RatingDto, SessionDto, UserProfileDto } from '@/lib/types';
import { sessionUrl } from '@/lib/session-link';
import DateOptionCalendar from './DateOptionCalendar';
import GameCollectionPicker from './GameCollectionPicker';
import NativeTimeInput from './NativeTimeInput';
import ProgressiveGameImage from './ProgressiveGameImage';

type ResultRow = {
  game: GameDto;
  average: number;
  total: number;
  count: number;
  missing: PlayerDto[];
};

type DateRow = SessionDto['date_options'][number] & {
  display: ReturnType<typeof dateParts>;
  label: string;
  availablePlayers: PlayerDto[];
  unavailablePlayers: PlayerDto[];
  pendingPlayers: PlayerDto[];
};
type FlowView = 'availability' | 'rating' | 'results' | 'chosen_game' | 'summary';

const SCORE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const SESSION_REFRESH_INTERVAL_MS = 15000;
const SCORE_AUTOSAVE_DELAY_MS = 250;
const META_SEPARATOR = ' - ';
const LIST_BULLET = '-';

type InviteTemplateInput = {
  title: string;
  dateLabel: string;
  dateOptions: string;
  chosenGameTitle: string;
  url: string;
  gameListWithOverflow: string;
};

function inviteTemplateGameFixedDateFixed({ title, dateLabel, chosenGameTitle, url }: InviteTemplateInput) {
  return `${title}\n\nOp ${dateLabel} spelen we het spel: ${chosenGameTitle}.\n\nBevestig je aanwezigheid via:\n${url}`;
}

function inviteTemplateGameFixedDateOpen({ title, dateOptions, chosenGameTitle, url }: InviteTemplateInput) {
  return `${title}\n\nWe gaan ${chosenGameTitle} spelen. Wie kan wanneer?\n${dateOptions}\n\nGeef je beschikbaarheid door via:\n${url}`;
}

function inviteTemplateGameOpenDateFixedWithList({ title, dateLabel, url, gameListWithOverflow }: InviteTemplateInput) {
  return `${title}\n\nOp ${dateLabel} ligt de datum vast. Welk spel zie jij zitten?\n\nGeef je spelvoorkeur door via:\n${url}\n\nSpellen op de lijst:\n${gameListWithOverflow}`;
}

function inviteTemplateGameOpenDateOpenWithList({ title, dateOptions, url, gameListWithOverflow }: InviteTemplateInput) {
  return `${title}\n\nWie kan wanneer?\n${dateOptions}\n\nGeef je beschikbaarheid en je spelvoorkeur door via:\n${url}\n\nSpellen op de lijst:\n${gameListWithOverflow}`;
}

function inviteTemplateNoPreselectDateFixed({ title, dateLabel, url }: InviteTemplateInput) {
  return `${title}\n\nOp ${dateLabel} ligt de datum vast.\n\nBevestig je aanwezigheid via:\n${url}`;
}

function inviteTemplateNoPreselectDateOpen({ title, dateOptions, url }: InviteTemplateInput) {
  return `${title}\n\nWie kan wanneer?\n${dateOptions}\n\nGeef je beschikbaarheid door via:\n${url}`;
}

const SCORE_BADGES: Record<number, { label: string; className: string }> = {
  0: { label: 'Nooit', className: 'bg-red-950 text-white' },
  1: { label: 'Liever niet', className: 'bg-red-900 text-white' },
  2: { label: 'Pfff', className: 'bg-red-800 text-white' },
  3: { label: 'Mwah', className: 'bg-orange-700 text-white' },
  4: { label: 'Bwa', className: 'bg-orange-500 text-white' },
  5: { label: 'Oke', className: 'bg-amber-300 text-slate-950' },
  6: { label: 'Prima', className: 'bg-yellow-300 text-slate-950' },
  7: { label: 'Leuk', className: 'bg-lime-300 text-slate-950' },
  8: { label: 'Top', className: 'bg-lime-500 text-slate-950' },
  9: { label: 'Heel graag', className: 'bg-emerald-600 text-white' },
  10: { label: 'JAAAA', className: 'bg-emerald-700 text-white' }
};

function sliderScore(score: number | null) {
  if (score === null) return 0;
  return SCORE_OPTIONS.reduce((closest, option) => (
    Math.abs(option - score) < Math.abs(closest - score) ? option : closest
  ), SCORE_OPTIONS[0]);
}

function playerKey(sessionId: string) {
  return `gsk-player-${sessionId}`;
}

function formatGameMeta(game: GameDto) {
  return [
    game.year_published,
    game.min_players && game.max_players ? `${game.min_players}-${game.max_players} spelers` : null,
    game.playing_time ? `${game.playing_time} min` : null,
    game.bgg_weight ? `weight ${game.bgg_weight.toFixed(1)}` : null,
    game.bgg_rating ? `BGG ${game.bgg_rating.toFixed(1)}` : null
  ].filter(Boolean).join(META_SEPARATOR);
}

function gameLargeImageUrl(game: GameDto) {
  return game.image_url ?? game.thumbnail_url;
}

function gameThumbnailUrl(game: GameDto) {
  return game.thumbnail_url ?? game.image_url;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`));
}

function dateParts(date: string) {
  const value = new Date(`${date}T12:00:00`);
  return {
    weekday: new Intl.DateTimeFormat('nl-BE', { weekday: 'long' }).format(value),
    day: new Intl.DateTimeFormat('nl-BE', { day: 'numeric' }).format(value),
    month: new Intl.DateTimeFormat('nl-BE', { month: 'short' }).format(value),
    full: new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }).format(value)
  };
}

function localDateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function formatMeetingTime(value: string) {
  const [hours, minutes] = value.split(':');
  if (!hours || !minutes) return value;
  return minutes === '00' ? `${Number(hours)}u` : `${Number(hours)}u${minutes}`;
}

function shareSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

function playerDateKey(playerId: string, date: string) {
  return `${playerId}:${date}`;
}

function playerGameKey(playerId: string, gameId: string) {
  return `${playerId}:${gameId}`;
}

export default function SessionApp({ sessionId }: { sessionId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const [session, setSession] = useState<SessionDto | null>(null);
  const [players, setPlayers] = useState<PlayerDto[]>([]);
  const [games, setGames] = useState<GameDto[]>([]);
  const [availability, setAvailability] = useState<AvailabilityDto[]>([]);
  const [ratings, setRatings] = useState<RatingDto[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [viewerProfile, setViewerProfile] = useState<UserProfileDto | null>(null);
  const [viewerIsOrganizer, setViewerIsOrganizer] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<FlowView>('availability');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [addGamesOpen, setAddGamesOpen] = useState(false);
  const [selectedAddGameIds, setSelectedAddGameIds] = useState<string[]>([]);
  const [addGamesSaving, setAddGamesSaving] = useState(false);
  const [addDatesOpen, setAddDatesOpen] = useState(false);
  const [selectedAddDates, setSelectedAddDates] = useState<string[]>([]);
  const [addDatesSaving, setAddDatesSaving] = useState(false);
  const [shareModal, setShareModal] = useState<{ title: string; text: string } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [shareTextValue, setShareTextValue] = useState('');
  const [sharing, setSharing] = useState(false);
  const [meetingTimeInput, setMeetingTimeInput] = useState('20:00');
  const scoreSaveTimers = useRef<Record<string, number>>({});
  const initialViewResolved = useRef(false);
  const initialShareIntentHandled = useRef(false);
  const autoJoinAttemptedSessionId = useRef<string | null>(null);
  const addGamesCloseButtonRef = useRef<HTMLButtonElement>(null);
  const addDatesCloseButtonRef = useRef<HTMLButtonElement>(null);

  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const availabilityByPlayerDay = useMemo(() => {
    const map = new Map<string, AvailabilityDto>();
    availability.forEach((item) => {
      map.set(playerDateKey(item.player_id, item.day), item);
    });
    return map;
  }, [availability]);
  const availablePlayerIdsByDay = useMemo(() => {
    const map = new Map<string, Set<string>>();
    availability.forEach((item) => {
      if (!item.available) return;
      const existing = map.get(item.day);
      if (existing) {
        existing.add(item.player_id);
        return;
      }
      map.set(item.day, new Set([item.player_id]));
    });
    return map;
  }, [availability]);
  const scoreByPlayerGame = useMemo(() => {
    const map = new Map<string, number>();
    ratings.forEach((rating) => {
      map.set(playerGameKey(rating.player_id, rating.game_id), rating.score);
    });
    return map;
  }, [ratings]);
  const currentPlayer = currentPlayerId ? playerById.get(currentPlayerId) ?? null : null;
  const isAdmin = viewerIsOrganizer;
  const dateOptions = session?.date_options ?? [];
  const existingGameTitles = useMemo(() => games.map((game) => game.title), [games]);
  const existingBggIds = useMemo(() => games.map((game) => game.bgg_id).filter((id): id is number => id !== null), [games]);
  const currentPlayerHasPlanning = useMemo(() => (
    currentPlayerId ? availability.some((item) => item.player_id === currentPlayerId) : false
  ), [availability, currentPlayerId]);
  const currentPlayerChosenDayAvailability = useMemo(() => {
    if (!currentPlayerId || !session?.chosen_day) return null;
    return availabilityByPlayerDay.get(playerDateKey(currentPlayerId, session.chosen_day)) ?? null;
  }, [availabilityByPlayerDay, currentPlayerId, session?.chosen_day]);
  const currentPlayerHasUnratedGames = useMemo(() => {
    if (!currentPlayerId) return false;
    return games.some((game) => !scoreByPlayerGame.has(playerGameKey(currentPlayerId, game.id)));
  }, [currentPlayerId, games, scoreByPlayerGame]);
  const needsGameChoice = Boolean(!session?.chosen_game_id && currentPlayerHasUnratedGames);

  async function refresh(showMessage = false) {
    try {
      const data = await loadSessionBundle(sessionId);
      setSession(data.session);
      setPlayers(data.players);
      setGames(data.games);
      setAvailability(data.availability);
      setRatings(data.ratings);
      setViewerProfile(data.viewer_profile);
      setViewerIsOrganizer(data.viewer_is_organizer);
      if (data.viewer_player_id) {
        localStorage.setItem(playerKey(sessionId), data.viewer_player_id);
        setCurrentPlayerId(data.viewer_player_id);
      }
      setError(null);
      if (showMessage) setMessage('Alles is bijgewerkt.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sessie laden mislukt.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPlayerId(localStorage.getItem(playerKey(sessionId)));
    refresh(false);
    const interval = window.setInterval(() => refresh(false), SESSION_REFRESH_INTERVAL_MS);
    const handleProfileUpdated = () => {
      void refresh(false);
    };
    window.addEventListener('gsk-profile-updated', handleProfileUpdated);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('gsk-profile-updated', handleProfileUpdated);
      Object.values(scoreSaveTimers.current).forEach((timer) => window.clearTimeout(timer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (loading || initialViewResolved.current) return;

    if (!currentPlayerId) {
      initialViewResolved.current = true;
      return;
    }

    const nextView: FlowView = needsGameChoice ? 'rating' : 'summary';

    if (session?.locked && session.chosen_day) {
      if (!currentPlayerChosenDayAvailability) {
        initialViewResolved.current = true;
        return;
      }
      setView(nextView);
      initialViewResolved.current = true;
      return;
    }

    if (!currentPlayerHasPlanning) {
      initialViewResolved.current = true;
      return;
    }

    setView(nextView);
    initialViewResolved.current = true;
  }, [currentPlayerChosenDayAvailability, currentPlayerHasPlanning, currentPlayerId, loading, needsGameChoice, session?.chosen_day, session?.locked]);

  useEffect(() => {
    if (loading || !currentPlayerId) return;
    if (!(session?.locked && session.chosen_day)) return;
    if (currentPlayerChosenDayAvailability) return;
    setView('availability');
  }, [currentPlayerChosenDayAvailability, currentPlayerId, loading, session?.chosen_day, session?.locked]);

  useEffect(() => {
    if (loading || !currentPlayerId) return;
    if (!needsGameChoice) return;
    if (!['results', 'summary'].includes(view)) return;
    setSelectedGameId(null);
    setView('rating');
  }, [currentPlayerId, loading, needsGameChoice, view]);

  useEffect(() => {
    if (!session || initialShareIntentHandled.current) return;
    if (searchParams.get('share') !== 'invite') return;
    if (!viewerIsOrganizer || view !== 'summary') return;
    initialShareIntentHandled.current = true;
    openShareModal('Spelavond delen', buildInviteText());
    clearShareIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, session, view, viewerIsOrganizer]);

  useEffect(() => {
    if (loading || !viewerProfile || currentPlayer || saving) return;
    if (autoJoinAttemptedSessionId.current === sessionId) return;

    autoJoinAttemptedSessionId.current = sessionId;
    void joinSession(undefined, { silent: true });
  }, [currentPlayer, loading, saving, sessionId, viewerProfile]);

  const eligiblePlayers = useMemo(() => {
    if (!session?.chosen_day) return players;
    const availableIds = availablePlayerIdsByDay.get(session.chosen_day);
    if (!availableIds) return [];
    return players.filter((player) => availableIds.has(player.id));
  }, [availablePlayerIdsByDay, players, session?.chosen_day]);
  const eligiblePlayerIds = useMemo(() => new Set(eligiblePlayers.map((player) => player.id)), [eligiblePlayers]);

  const dateRows = useMemo<DateRow[]>(() => dateOptions.map((option) => {
    const availablePlayers = players.filter((player) => availablePlayerIdsByDay.get(option.date)?.has(player.id));
    const unavailablePlayers = players.filter((player) => {
      const entry = availabilityByPlayerDay.get(playerDateKey(player.id, option.date));
      return entry ? !entry.available : false;
    });
    const pendingPlayers = players.filter((player) => !availabilityByPlayerDay.has(playerDateKey(player.id, option.date)));

    return {
      ...option,
      display: dateParts(option.date),
      label: formatDate(option.date),
      availablePlayers,
      unavailablePlayers,
      pendingPlayers
    };
  }), [availabilityByPlayerDay, availablePlayerIdsByDay, dateOptions, players]);
  const chosenDateRow = session?.chosen_day ? dateRows.find((row) => row.date === session.chosen_day) : null;

  const results = useMemo<ResultRow[]>(() => games.map((game) => {
    const relevantRatings = ratings.filter((rating) => rating.game_id === game.id && eligiblePlayerIds.has(rating.player_id));
    const total = relevantRatings.reduce((sum, rating) => sum + rating.score, 0);
    const average = relevantRatings.length ? total / relevantRatings.length : 0;
    const missing = eligiblePlayers.filter((player) => !relevantRatings.some((rating) => rating.player_id === player.id));
    return { game, total, average, count: relevantRatings.length, missing };
  }).sort((a, b) => b.total - a.total || b.average - a.average || b.count - a.count || a.game.title.localeCompare(b.game.title)), [eligiblePlayerIds, eligiblePlayers, games, ratings]);

  const chosenGame = session?.chosen_game_id ? games.find((game) => game.id === session.chosen_game_id) ?? null : null;
  const winner = results[0] ?? null;
  const leadingGame = chosenGame ?? winner?.game ?? null;
  const leadingGameResult = leadingGame ? results.find((row) => row.game.id === leadingGame.id) ?? null : null;
  const unratedGames = useMemo(() => (
    currentPlayerId ? games.filter((game) => !scoreByPlayerGame.has(playerGameKey(currentPlayerId, game.id))) : []
  ), [currentPlayerId, games, scoreByPlayerGame]);
  const selectedGame = selectedGameId ? games.find((game) => game.id === selectedGameId) ?? null : null;
  const activeRatingGame = selectedGame ?? unratedGames[0] ?? null;
  const joinPromptLabel = viewerProfile
    ? `doe eerst mee als ${viewerProfile.display_name}`
    : 'vul eerst je naam in of log in';
  const currentSessionUrl = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!authModalOpen || !isClerkLoaded || !isSignedIn) return;
    setAuthModalOpen(false);
    void refresh(false);
  }, [authModalOpen, isClerkLoaded, isSignedIn]);

  useEffect(() => {
    if (!session?.meeting_time) return;
    setMeetingTimeInput(session.meeting_time);
  }, [session?.meeting_time]);

  useEffect(() => {
    const modalOpen = addDatesOpen || addGamesOpen || Boolean(shareModal) || authModalOpen;
    if (!modalOpen) return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [addDatesOpen, addGamesOpen, authModalOpen, shareModal]);

  function isAvailable(date: string) {
    if (!currentPlayerId) return false;
    return Boolean(availabilityByPlayerDay.get(playerDateKey(currentPlayerId, date))?.available);
  }

  function myScore(gameId: string) {
    if (!currentPlayerId) return null;
    return scoreByPlayerGame.get(playerGameKey(currentPlayerId, gameId)) ?? null;
  }

  function playerName(playerId: string | null) {
    if (!playerId) return null;
    return playerById.get(playerId)?.name ?? null;
  }

  function confirmAvailability() {
    if (!currentPlayer) return;
    setSelectedGameId(null);
    setView(needsGameChoice ? 'rating' : 'summary');
  }

  async function joinSession(event?: React.FormEvent, options?: { silent?: boolean }) {
    event?.preventDefault();
    const guestName = nameInput.trim();
    if (!viewerProfile && !guestName) return;
    setSaving(true);
    setError(null);
    try {
      const data = await api<{ player: PlayerDto }>(`/api/sessions/${sessionId}/players`, {
        method: 'POST',
        body: JSON.stringify(viewerProfile ? {} : { name: guestName })
      });
      localStorage.setItem(playerKey(sessionId), data.player.id);
      setCurrentPlayerId(data.player.id);
      setNameInput('');
      if (!options?.silent) {
        setMessage(`Welkom, ${data.player.name}!`);
      }
      await refresh(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deelnemen mislukt.');
    } finally {
      setSaving(false);
    }
  }

  async function setAvailabilityForDay(date: string, available: boolean) {
    if (!currentPlayerId) return;
    const playerId = currentPlayerId;
    const previousAvailability = availability;
    setError(null);
    setAvailability((items) => {
      const existing = items.some((item) => item.player_id === playerId && item.day === date);
      if (existing) {
        return items.map((item) => (
          item.player_id === playerId && item.day === date ? { ...item, available } : item
        ));
      }
      return [...items, { player_id: playerId, day: date, available }];
    });

    try {
      const data = await api<{ availability: AvailabilityDto }>(`/api/sessions/${sessionId}/availability`, {
        method: 'PUT',
        body: JSON.stringify({ player_id: playerId, day: date, available })
      });
      setAvailability((items) => items.map((item) => (
        item.player_id === playerId && item.day === date ? data.availability : item
      )));
    } catch (err) {
      setAvailability(previousAvailability);
      setError(err instanceof Error ? err.message : 'Beschikbaarheid opslaan mislukt.');
    }
  }

  async function toggleAvailability(date: string) {
    await setAvailabilityForDay(date, !isAvailable(date));
  }

  async function chooseDate(date: string | null, locked = Boolean(date)) {
    if (!isAdmin) return;
    if (date && locked) {
      const confirmed = window.confirm('Ben je zeker? Dit legt de datum vast zodat deelnemers niet langer datumopties kunnen kiezen. Wel kunnen ze nu hun aanwezigheid bevestigen op deze dag.');
      if (!confirmed) return;
    }
    if (!date) {
      const confirmed = window.confirm('Ben je zeker dat je de planning opnieuw wilt openzetten? Daarna kunnen alle deelnemers opnieuw stemmen op alle datumopties.');
      if (!confirmed) return;
    }
    const previousSession = session;
    setError(null);
    setSaving(true);
    setSession((current) => current ? { ...current, chosen_day: date, locked: date ? locked : false } : current);
    setMessage(date ? `Datum vastgelegd: ${formatDate(date)}.` : 'Planning opnieuw opengezet.');

    try {
      const data = await api<{ session: SessionDto }>(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ chosen_day: date, locked: date ? locked : false })
      });
      setSession(data.session);
    } catch (err) {
      setSession(previousSession);
      setError(err instanceof Error ? err.message : 'Datum kiezen mislukt.');
    } finally {
      setSaving(false);
    }
  }

  async function chooseGame(gameId: string | null) {
    if (!isAdmin) return;
    const previousSession = session;
    const gameTitle = gameId ? games.find((game) => game.id === gameId)?.title ?? 'Het gekozen spel' : null;
    if (gameId) {
      const confirmed = window.confirm(`Ben je zeker dat je ${gameTitle} wilt spelen? Als je dit vastzet kunnen deelnemers niet langer stemmen op de spelopties.`);
      if (!confirmed) return;
    }
    setError(null);
    setSaving(true);
    setSession((current) => current ? { ...current, chosen_game_id: gameId } : current);
    setMessage(gameId ? `${gameTitle} ligt nu vast voor deze spelavond.` : 'Spelkeuze opnieuw opengezet.');

    try {
      const data = await api<{ session: SessionDto }>(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ chosen_game_id: gameId })
      });
      setSession(data.session);
      setSelectedGameId(gameId);
      if (gameId) setView('summary');
      else setView(currentPlayerHasUnratedGames ? 'rating' : 'results');
    } catch (err) {
      setSession(previousSession);
      setError(err instanceof Error ? err.message : 'Spel vastzetten mislukt.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteSession() {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      'Deze spelavond wordt definitief verwijderd.\n\nAlle deelnemers, planning, scores en spellen in deze spelavond gaan onomkeerbaar verloren.\n\nWeet je zeker dat je wil doorgaan?'
    );
    if (!confirmed) return;

    setError(null);
    setSaving(true);
    try {
      await api(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      localStorage.removeItem(playerKey(sessionId));
      router.push('/spelavonden');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spelavond verwijderen mislukt.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteGame(gameId: string) {
    if (!isAdmin || !window.confirm('Dit spel verwijderen?')) return;
    setSaving(true);
    try {
      await api(`/api/sessions/${sessionId}/games?game_id=${gameId}`, { method: 'DELETE' });
      setSelectedGameId(null);
      await refresh(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spel verwijderen mislukt.');
    } finally {
      setSaving(false);
    }
  }

  function openAddGamesModal() {
    if (!currentPlayerId) {
      setError(viewerProfile ? `Doe eerst mee als ${viewerProfile.display_name} om spellen toe te voegen.` : 'Vul eerst je naam in om spellen toe te voegen.');
      return;
    }
    setSelectedAddGameIds([]);
    setAddGamesOpen(true);
    setError(null);
  }

  function closeAddGamesModal() {
    if (addGamesSaving) return;
    setAddGamesOpen(false);
    setSelectedAddGameIds([]);
  }

  useEffect(() => {
    if (!addGamesOpen) return;
    addGamesCloseButtonRef.current?.focus();

    function handleModalKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeAddGamesModal();
    }

    window.addEventListener('keydown', handleModalKeyDown);
    return () => window.removeEventListener('keydown', handleModalKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addGamesOpen, addGamesSaving]);

  async function addSelectedGames() {
    if (!currentPlayerId || !selectedAddGameIds.length) return;
    setAddGamesSaving(true);
    setError(null);
    setMessage(null);
    try {
      const data = await api<{ added?: GameDto[]; skipped?: string[] }>(`/api/sessions/${sessionId}/games`, {
        method: 'POST',
        body: JSON.stringify({ added_by: currentPlayerId, collection_game_ids: selectedAddGameIds })
      });
      const addedCount = data.added?.length ?? 0;
      const skippedCount = data.skipped?.length ?? 0;
      setSelectedAddGameIds([]);
      setAddGamesOpen(false);
      await refresh(false);
      if (addedCount && skippedCount) setMessage(`${addedCount} spel${addedCount === 1 ? '' : 'len'} toegevoegd. ${skippedCount} stond${skippedCount === 1 ? '' : 'en'} al in de lijst.`);
      else if (addedCount) setMessage(`${addedCount} spel${addedCount === 1 ? '' : 'len'} toegevoegd aan de spelavond.`);
      else setMessage('Geen nieuwe spellen toegevoegd: deze spellen stonden al in de lijst.');
      setSelectedGameId(null);
      setView(addedCount > 0 ? 'rating' : 'summary');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spellen toevoegen mislukt.');
    } finally {
      setAddGamesSaving(false);
    }
  }

  function setScore(gameId: string, score: number) {
    if (!currentPlayerId) return;
    const playerId = currentPlayerId;
    const timerKey = playerGameKey(playerId, gameId);

    setRatings((items) => {
      const existing = items.some((rating) => rating.player_id === playerId && rating.game_id === gameId);
      if (existing) {
        return items.map((rating) => (
          rating.player_id === playerId && rating.game_id === gameId ? { ...rating, score } : rating
        ));
      }
      return [...items, { player_id: playerId, game_id: gameId, score }];
    });

    window.clearTimeout(scoreSaveTimers.current[timerKey]);
    scoreSaveTimers.current[timerKey] = window.setTimeout(async () => {
      try {
        await api(`/api/sessions/${sessionId}/ratings`, {
          method: 'PUT',
          body: JSON.stringify({ player_id: playerId, game_id: gameId, score })
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Score opslaan mislukt.');
        await refresh(false);
      } finally {
        delete scoreSaveTimers.current[timerKey];
      }
    }, SCORE_AUTOSAVE_DELAY_MS);
  }

  function rateGame(gameId: string, score: number) {
    const wasAlreadyRated = myScore(gameId) !== null;
    setScore(gameId, score);

    if (selectedGameId === gameId && wasAlreadyRated) {
      setSelectedGameId(null);
      setView(currentPlayerHasUnratedGames ? 'rating' : 'results');
      return;
    }

    const nextGame = games.find((game) => game.id !== gameId && myScore(game.id) === null);
    if (nextGame) {
      setSelectedGameId(nextGame.id);
      setView('rating');
    } else {
      setSelectedGameId(null);
      setView('results');
    }
  }

  function toggleAddDate(date: string) {
    setSelectedAddDates((current) => (
      current.includes(date)
        ? current.filter((item) => item !== date)
        : [...current, date].sort()
    ));
  }

  function openAddDatesModal() {
    if (!currentPlayerId) {
      setError(viewerProfile ? `Doe eerst mee als ${viewerProfile.display_name} om datumopties toe te voegen.` : 'Vul eerst je naam in om datumopties toe te voegen.');
      return;
    }
    if (!viewerProfile) {
      setError('Log eerst in om datumopties toe te voegen.');
      setAuthModalOpen(true);
      return;
    }
    setSelectedAddDates([]);
    setAddDatesOpen(true);
    setError(null);
  }

  function closeAddDatesModal() {
    if (addDatesSaving) return;
    setAddDatesOpen(false);
    setSelectedAddDates([]);
  }

  useEffect(() => {
    if (!addDatesOpen) return;
    addDatesCloseButtonRef.current?.focus();

    function handleModalKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeAddDatesModal();
    }

    window.addEventListener('keydown', handleModalKeyDown);
    return () => window.removeEventListener('keydown', handleModalKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addDatesOpen, addDatesSaving]);

  async function addSelectedDates() {
    if (!selectedAddDates.length) return;
    setAddDatesSaving(true);
    setError(null);
    try {
      const data = await api<{ session: SessionDto }>(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ add_date_options: selectedAddDates })
      });
      setSession(data.session);
      setSelectedAddDates([]);
      setAddDatesOpen(false);
      setMessage('Klaar!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Datumopties toevoegen mislukt.');
    } finally {
      setAddDatesSaving(false);
    }
  }

  async function removeDateOption(date: string) {
    if (!isAdmin) return;
    const confirmed = window.confirm('Ben je zeker? Dit verwijdert deze dag als optie voor alle deelnemers.');
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    try {
      const data = await api<{ session: SessionDto }>(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ remove_date_option: date })
      });
      setSession(data.session);
      setMessage(`${formatDate(date)} verwijderd als datumoptie.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Datumoptie verwijderen mislukt.');
    } finally {
      setSaving(false);
    }
  }

  async function saveMeetingTime() {
    if (!isAdmin) return;
    if (!isValidTime(meetingTimeInput)) {
      setError('Kies een geldig afspreekuur.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const data = await api<{ session: SessionDto }>(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ meeting_time: meetingTimeInput })
      });
      setSession(data.session);
      setMessage(`Afspreekuur aangepast naar ${formatMeetingTime(data.session.meeting_time)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Afspreekuur opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  }

  function buildInviteText() {
    const url = sessionUrl(window.location.origin, sessionId, session?.title);
    const dateLabel = session?.chosen_day ? formatDate(session.chosen_day) : 'datum nog te bepalen';
    const dateOptions = dateRows.map((row) => `${LIST_BULLET} ${row.label}`).join('\n') || `${LIST_BULLET} datum nog te bepalen`;
    const chosenGame = session?.chosen_game_id ? games.find((game) => game.id === session.chosen_game_id) ?? null : null;
    const chosenGameTitle = chosenGame?.title ?? 'dit spel';
    const gameList = games.slice(0, 8).map((game) => `${LIST_BULLET} ${game.title}`).join('\n');
    const extraGames = games.length > 8 ? `\n${LIST_BULLET} ... en nog ${games.length - 8} spel${games.length - 8 === 1 ? '' : 'len'}` : '';
    const hasGameOptions = Boolean(gameList);
    const gameListWithOverflow = `${gameList}${extraGames}`;
    const input: InviteTemplateInput = {
      title: session?.title ?? 'Spelavond',
      dateLabel,
      dateOptions,
      chosenGameTitle,
      url,
      gameListWithOverflow
    };

    if (chosenGame && session?.locked) {
      return inviteTemplateGameFixedDateFixed(input);
    }
    if (chosenGame) {
      return inviteTemplateGameFixedDateOpen(input);
    }
    if (session?.locked && hasGameOptions) {
      return inviteTemplateGameOpenDateFixedWithList(input);
    }
    if (!session?.locked && hasGameOptions) {
      return inviteTemplateGameOpenDateOpenWithList(input);
    }
    if (session?.locked) {
      return inviteTemplateNoPreselectDateFixed(input);
    }
    return inviteTemplateNoPreselectDateOpen(input);
  }

  function clearShareIntent() {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('share')) return;
    params.delete('share');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }
  function openShareModal(title: string, text: string) {
    setShareModal({ title, text });
    setShareTextValue(text);
    setError(null);
  }

  function shareInvite() {
    openShareModal('Spelavond delen', buildInviteText());
  }

  function closeShareModal() {
    if (sharing) return;
    setShareModal(null);
    setShareTextValue('');
  }

  async function confirmShareText() {
    if (!shareModal) return;
    setSharing(true);
    try {
      if (shareSupported()) {
        await navigator.share({ text: shareTextValue });
        setMessage('Deelvenster geopend met je aangepaste bericht.');
      } else {
        await navigator.clipboard.writeText(shareTextValue);
        setMessage('Je toestel ondersteunt direct delen niet. Het bericht is gekopieerd.');
      }
      setShareModal(null);
      setShareTextValue('');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Delen is niet gelukt. Je kan het bericht kopieren of manueel delen.');
    } finally {
      setSharing(false);
    }
  }

  if (loading) return <main className="app-shell"><div className="mx-auto max-w-4xl px-4 py-8"><div className="page-card p-5">Laden...</div></div></main>;
  if (!session) return <main className="app-shell"><div className="mx-auto max-w-4xl px-4 py-8"><div className="page-card p-5">Sessie niet gevonden.</div></div></main>;

  const summaryParts = [`${players.length} speler${players.length === 1 ? '' : 's'}`];
  if (chosenGame) summaryParts.push(chosenGame.title);
  if (session.chosen_day) summaryParts.push(formatDate(session.chosen_day));
  if (session.meeting_time) summaryParts.push(formatMeetingTime(session.meeting_time));
  const pageChip = view === 'summary' ? 'Samenvatting' : view === 'availability' ? 'Planning' : 'Spelkeuze';
  const isPlanningView = view === 'availability';
  const isGameView = ['rating', 'results', 'chosen_game'].includes(view);
  const openGameChoice = () => {
    setSelectedGameId(null);
    setView(session.chosen_game_id ? 'chosen_game' : (needsGameChoice ? 'rating' : 'results'));
  };

  return (
    <main className="app-shell">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 pb-16">
      <header className="page-card page-card-sky p-5">
        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <p className="page-chip w-fit">{pageChip}</p>
            <h1 className="mt-3 font-poster text-4xl uppercase leading-none text-slate-950 sm:text-5xl">{session.title}</h1>
            <p className="mt-3 text-sm text-slate-600">{summaryParts.join(' - ')}</p>
            {isPlanningView && (
              <div className="mt-4 rounded-2xl bg-white/80 px-4 py-3">
                <p className="text-sm font-bold text-slate-700">Afspreekuur</p>
                {isAdmin ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <NativeTimeInput
                      value={meetingTimeInput}
                      onChange={setMeetingTimeInput}
                      disabled={saving}
                      id="session-meeting-time"
                    />
                    <button
                      type="button"
                      onClick={saveMeetingTime}
                      disabled={saving || !isValidTime(meetingTimeInput) || meetingTimeInput === session.meeting_time}
                      className="neo-button neo-button-ghost w-full text-sm disabled:opacity-50 sm:w-auto"
                    >
                      Afspreekuur opslaan
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 text-base font-black text-slate-950">{formatMeetingTime(session.meeting_time)}</p>
                )}
              </div>
            )}
            {isGameView && !chosenGame && games.length > 0 && (
              <p className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">Stem op het spel dat je wilt spelen.</p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {isGameView && (
              <button type="button" onClick={() => setView('availability')} className="neo-button neo-button-ghost p-3" title="Terug naar planning">
                <CalendarDays size={20} />
              </button>
            )}
            {view === 'summary' && (
              <button type="button" onClick={shareInvite} className="neo-button neo-button-ghost p-3" title="Spelavond delen">
                <Share2 size={20} />
              </button>
            )}
          </div>
        </div>
        {isAdmin && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Je bent organisator van deze spelavond.</p>}
        {!currentPlayer && !viewerProfile && (
          <div className="mt-5">
            <form onSubmit={joinSession} className="flex gap-2">
              <input value={nameInput} onChange={(event) => setNameInput(event.target.value)} placeholder="Jouw naam" className="neo-input min-w-0 flex-1" />
              <button disabled={saving} className="neo-button neo-button-primary disabled:opacity-60">Meedoen</button>
            </form>
            <div className="page-subcard mt-3 px-4 py-3 text-sm text-slate-600">
              <p>Heb je een account? Log dan in of registreer je, dan gebruiken we automatisch je profielnaam.</p>
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="neo-button neo-button-ghost mt-3"
              >
                <UserRound size={16} /> Log in of registreer
              </button>
            </div>
          </div>
        )}
        {currentPlayer && !isAdmin && <p className="neo-muted-panel mt-4 flex items-center gap-2 text-sm"><UserRound size={18} /> Je doet mee als <b>{currentPlayer.name}</b>.</p>}
        {message && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
        {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </header>

      {view === 'summary' && (
        <>
          <section className="page-card page-card-lime p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={20} />
                <h2 className="text-xl font-black">Planning</h2>
              </div>
              <button type="button" onClick={() => setView('availability')} className="neo-button neo-button-ghost text-sm">
                Nog iets wijzigen
              </button>
            </div>
            {session.locked && chosenDateRow && (
              <div className="mb-4 rounded-2xl bg-emerald-100 px-4 py-4 text-emerald-950">
                <p className="text-sm font-bold">Datum ligt vast</p>
                <p className="mt-1 text-2xl font-black capitalize">{chosenDateRow.display.weekday} {chosenDateRow.display.day} {chosenDateRow.display.month}</p>
                <p className="mt-1 text-sm">{chosenDateRow.display.full}</p>
                {session.meeting_time && <p className="mt-1 text-sm font-semibold">Afspreekuur: {formatMeetingTime(session.meeting_time)}</p>}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => chooseDate(null)}
                    disabled={saving}
                    className="neo-button neo-button-ghost mt-4 text-sm disabled:opacity-60"
                  >
                    <Unlock size={16} className="inline" /> Planning heropenen
                  </button>
                )}
              </div>
            )}
            <div className="summary-scroll-area max-h-[32rem] overflow-y-auto pr-1 sm:max-h-none sm:overflow-visible sm:pr-0">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {dateRows.map((row) => {
                  const isChosenDate = session.chosen_day === row.date;
                  const myAvailability = currentPlayerId ? availabilityByPlayerDay.get(playerDateKey(currentPlayerId, row.date)) ?? null : null;

                  return (
                    <article key={row.date} className={`rounded-2xl border-2 p-4 ${isChosenDate ? 'border-emerald-700 bg-emerald-50' : 'border-slate-950/10 bg-white/75'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-black capitalize">{row.display.weekday} {row.display.day} {row.display.month}</h3>
                          <p className="mt-1 text-sm text-slate-600">{row.display.full}</p>
                          {session.meeting_time && <p className="mt-1 text-sm font-semibold text-slate-700">Afspreekuur: {formatMeetingTime(session.meeting_time)}</p>}
                        </div>
                        {isChosenDate && <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">Vast</span>}
                      </div>
                      {currentPlayer && (
                        <p className="mt-3 text-sm text-slate-700">
                          Jouw status:{' '}
                          <b>
                            {myAvailability
                              ? (myAvailability.available ? 'aanwezig' : 'afwezig')
                              : 'nog niet bevestigd'}
                          </b>
                        </p>
                      )}
                      <div className="mt-4 space-y-3 text-sm">
                        <div>
                          <p className="font-bold text-slate-900">Beschikbaar</p>
                          <p className="mt-1 text-slate-600">{row.availablePlayers.length ? row.availablePlayers.map((player) => player.name).join(', ') : 'Nog niemand'}</p>
                        </div>
                        {!!row.unavailablePlayers.length && (
                          <div>
                            <p className="font-bold text-slate-900">Niet beschikbaar</p>
                            <p className="mt-1 text-slate-600">{row.unavailablePlayers.map((player) => player.name).join(', ')}</p>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="page-card p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={20} />
                <h2 className="text-xl font-black">Spelkeuze</h2>
              </div>
              <button type="button" onClick={openGameChoice} className="neo-button neo-button-ghost text-sm">
                Nog iets wijzigen
              </button>
            </div>

            {leadingGame && (
              <div className="page-card-dark mb-4 p-5">
                <p className="text-sm font-semibold text-slate-300">{chosenGame ? 'Gekozen spel' : 'Huidige winnaar'}</p>
                <div className="mt-3 flex items-center gap-3">
                  {gameThumbnailUrl(leadingGame) ? (
                    <img
                      src={gameThumbnailUrl(leadingGame)!}
                      alt={leadingGame.title}
                      className="h-14 w-14 shrink-0 rounded-xl bg-white object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300 shadow-sm">
                      <Dice5 size={20} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-2xl font-black">{leadingGame.title}</h3>
                    <p className="mt-1 text-slate-300">
                      {leadingGameResult
                        ? `${leadingGameResult.total} punten - ${leadingGameResult.average.toFixed(1)} gemiddeld - ${leadingGameResult.count} stem${leadingGameResult.count === 1 ? '' : 'men'}`
                        : 'Nog geen stemmen verzameld.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="summary-scroll-area max-h-[32rem] overflow-y-auto pr-1 sm:max-h-none sm:overflow-visible sm:pr-0">
              <div className="space-y-2">
              {results.map((row, index) => (
                <article key={row.game.id} className="page-subcard px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {gameThumbnailUrl(row.game) ? (
                        <img
                          src={gameThumbnailUrl(row.game)!}
                          alt={row.game.title}
                          className="h-14 w-14 shrink-0 rounded-xl bg-white object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-slate-300 shadow-sm">
                          <Dice5 size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <b className="block truncate">#{index + 1} {row.game.title}</b>
                        <p className="text-sm text-slate-500">{row.count} stemmen - gemiddeld {row.average.toFixed(1)}</p>
                      </div>
                    </div>
                    <div className="text-2xl font-black">{row.total}</div>
                  </div>
                  {!!row.missing.length && <p className="mt-2 text-xs text-slate-500">Nog niet gestemd: {row.missing.map((player) => player.name).join(', ')}</p>}
                </article>
              ))}
              {!results.length && (
                <p className="neo-muted-panel text-center text-slate-500">
                  Er staan nog geen spellen in deze spelavond.
                </p>
              )}
              </div>
            </div>
          </section>

          <section className="page-card page-card-peach p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="page-chip w-fit">Klaar</p>
                <h2 className="mt-3 font-poster text-4xl uppercase leading-none text-slate-950 sm:text-5xl">Je hoeft nu niets meer te doen.</h2>
                <p className="mt-3 text-base leading-7 text-slate-700">
                  Je antwoorden zijn opgeslagen. Als de organisator later de datum vastlegt of iemand nieuwe spellen toevoegt waar jij op moet stemmen, sturen we je via deze link automatisch naar de juiste stap.
                </p>
                {currentPlayer && (
                  <p className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">
                    Klaar als <b>{currentPlayer.name}</b>.
                  </p>
                )}
              </div>
              <div className="flex w-full flex-col gap-2 lg:max-w-xs">
                <Link href="/" prefetch={false} className="neo-button neo-button-primary justify-center">
                  <ArrowLeft size={18} /> Naar de hoofdpagina
                </Link>
                {viewerProfile ? (
                  <Link href="/collectie" className="neo-button neo-button-ghost justify-center">
                    <Dice5 size={18} /> Naar mijn collectie
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setAuthModalOpen(true)}
                      className="neo-button neo-button-ghost justify-center"
                    >
                      <UserRound size={18} /> Log in
                    </button>
                    <p className="rounded-2xl bg-white/75 px-4 py-3 text-sm text-slate-600">
                      Log in zodat je later zelf een spelavond kan organiseren en je collectie kan beheren.
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {view === 'availability' && (
        <section className="page-card page-card-lime p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2"><CalendarDays size={20} /><h2 className="text-xl font-black">Wanneer kan je?</h2></div>
            <button type="button" onClick={openAddDatesModal} className="neo-button neo-button-danger text-sm">
              <Plus size={18} /> Extra data toevoegen
            </button>
          </div>
          {session.locked && chosenDateRow && (
            <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-5 text-emerald-950">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold">De organisator heeft de datum gekozen.</p>
                  <p className="mt-1 text-2xl font-black capitalize">{chosenDateRow.display.weekday}</p>
                  <p>{chosenDateRow.display.full}</p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => chooseDate(null)}
                    disabled={saving}
                    className="neo-button neo-button-ghost text-sm disabled:opacity-60"
                  >
                    <Unlock size={16} className="inline" /> Planning heropenen
                  </button>
                )}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!currentPlayer || saving}
                  onClick={() => {
                    if (!session.chosen_day) return;
                    setAvailabilityForDay(session.chosen_day, true);
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left font-bold ${currentPlayerChosenDayAvailability?.available ? 'border-emerald-700 bg-emerald-200 text-emerald-950' : 'border-emerald-200 bg-white text-emerald-900'}`}
                >
                  {currentPlayerChosenDayAvailability?.available ? 'Aanwezig bevestigd' : 'Ik ben aanwezig'}
                </button>
                <button
                  type="button"
                  disabled={!currentPlayer || saving}
                  onClick={() => {
                    if (!session.chosen_day) return;
                    setAvailabilityForDay(session.chosen_day, false);
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left font-bold ${currentPlayerChosenDayAvailability && !currentPlayerChosenDayAvailability.available ? 'border-slate-700 bg-slate-200 text-slate-950' : 'border-slate-200 bg-white text-slate-700'}`}
                >
                  {currentPlayerChosenDayAvailability && !currentPlayerChosenDayAvailability.available ? 'Afwezig bevestigd' : 'Ik kan niet'}
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {dateRows.map((row) => {
              const selected = isAvailable(row.date);
              const isToday = row.date === localDateKey();
              const isChosenDate = session.chosen_day === row.date;
              const needsLoginHint = !currentPlayer;
              const canToggleAvailability = Boolean(currentPlayer) && !saving && !session.locked;
              const availableNames = row.availablePlayers.map((player) => player.name);
              const cardClassName = [
                'relative rounded-2xl border-2 p-4 transition',
                isChosenDate ? 'border-emerald-700 bg-emerald-50 text-emerald-950' : selected ? 'border-slate-950 bg-[#d8ff63]/55 text-emerald-950' : 'border-slate-950/10 bg-white/70 text-slate-800 hover:border-slate-950/25',
                isToday ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white' : '',
                saving ? 'opacity-60' : ''
              ].join(' ');

              return (
                <div key={row.date} className={cardClassName}>
                  <button
                    type="button"
                    disabled={!canToggleAvailability}
                    onClick={() => {
                      if (!canToggleAvailability) return;
                      toggleAvailability(row.date);
                    }}
                    title={needsLoginHint ? joinPromptLabel : row.label}
                    aria-pressed={session.locked ? undefined : selected}
                    className={`absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20 ${needsLoginHint ? 'cursor-help' : canToggleAvailability ? 'cursor-pointer' : 'cursor-default'}`}
                  />
                  <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-black capitalize">{row.display.weekday} {row.display.day} {row.display.month}</h3>
                      <p className={`mt-1 text-xs font-bold ${selected || isChosenDate ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {session.locked
                          ? (isChosenDate ? 'Deze datum ligt vast' : 'Datumopties zijn gesloten')
                          : selected ? 'Jij bent beschikbaar' : 'Klik om beschikbaar te zijn'}
                      </p>
                    </div>
                    <div className="pointer-events-auto flex items-center gap-2">
                      {isChosenDate && <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">Vast</span>}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => removeDateOption(row.date)}
                          disabled={saving}
                          className="rounded-xl bg-white/85 p-2 text-red-600 shadow-sm hover:bg-white disabled:opacity-50"
                          title="Datumoptie verwijderen"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="pointer-events-none relative z-10 mt-3">
                    <p className={`text-xs font-bold uppercase ${selected || isChosenDate ? 'text-emerald-700' : 'text-slate-500'}`}>Deelnemers</p>
                    <p className={`mt-1 text-sm leading-6 ${selected || isChosenDate ? 'text-emerald-900' : 'text-slate-600'}`}>
                      {availableNames.length ? availableNames.join(', ') : 'Nog niemand'}
                    </p>
                  </div>
                  {!!row.unavailablePlayers.length && (
                    <p className="pointer-events-none relative z-10 mt-2 text-xs text-slate-500">Niet beschikbaar: {row.unavailablePlayers.map((player) => player.name).join(', ')}</p>
                  )}
                  {!!row.pendingPlayers.length && (
                    <p className="pointer-events-none relative z-10 mt-1 text-xs text-slate-500">Nog geen antwoord: {row.pendingPlayers.map((player) => player.name).join(', ')}</p>
                  )}
                  {isAdmin && !session.locked && (
                    <button
                      type="button"
                      onClick={() => chooseDate(row.date)}
                      disabled={saving}
                      className="neo-button neo-button-primary relative z-10 mt-4 text-sm disabled:opacity-50"
                    >
                      <Lock size={16} /> Datum vastleggen
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {!session.locked && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-2">
                <CalendarDays size={14} /> Klik op meerdere dagen die voor jou passen
              </span>
            </div>
          )}
          <button onClick={confirmAvailability} disabled={!currentPlayer || Boolean(session.locked && session.chosen_day && !currentPlayerChosenDayAvailability)} className="neo-button neo-button-primary mt-5 flex w-full disabled:opacity-50">
            <Check size={20} /> {session.locked ? 'Bevestig aanwezigheid en ga verder' : 'Bevestig aanwezigheid'}
          </button>
        </section>
      )}

      {view === 'chosen_game' && chosenGame && (
        <section className="page-card page-card-sky mx-auto max-w-2xl p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Dice5 size={20} /><h2 className="text-xl font-black">Spel ligt vast</h2></div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => chooseGame(null)}
                disabled={saving}
                className="neo-button neo-button-ghost text-sm disabled:opacity-60"
              >
                <Unlock size={16} className="inline" /> Spelkeuze heropenen
              </button>
            )}
          </div>
          <article className="page-subcard p-4">
            {gameLargeImageUrl(chosenGame) ? (
              <ProgressiveGameImage
                thumbnailSrc={gameThumbnailUrl(chosenGame)}
                fullSrc={gameLargeImageUrl(chosenGame)}
                alt={chosenGame.title}
                className="aspect-[16/11] w-full rounded-2xl bg-white shadow-sm"
              />
            ) : (
              <div className="flex aspect-[16/11] w-full items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm"><Dice5 size={64} /></div>
            )}
            <div className="mt-4">
              <h3 className="text-2xl font-black leading-tight">{chosenGame.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{formatGameMeta(chosenGame) || 'Geen extra info beschikbaar'}</p>
              {chosenGame.mechanics.length > 0 && (
                <p className="mt-2 text-sm text-slate-600">Mechanieken: {chosenGame.mechanics.join(', ')}</p>
              )}
              <p className="mt-2 text-sm text-slate-600">Community spelers: {chosenGame.community_players.length ? chosenGame.community_players.join(', ') : 'niet gekend'}</p>
            </div>
          </article>
        </section>
      )}

      {view === 'rating' && !chosenGame && (
        <section className="page-card page-card-peach mx-auto max-w-xl p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Dice5 size={20} /><h2 className="text-xl font-black">Geef je score</h2></div>
            {!currentPlayerHasUnratedGames && (
              <button onClick={() => { setSelectedGameId(null); setView('results'); }} className="neo-button neo-button-ghost text-sm">Tabel</button>
            )}
          </div>
          {activeRatingGame ? (() => {
            const game = activeRatingGame;
            const score = myScore(game.id);
            const visibleScore = sliderScore(score);
            const badge = score === null
              ? { label: 'Nog niet gekozen', className: 'bg-white text-slate-600 ring-1 ring-slate-200' }
              : SCORE_BADGES[visibleScore];
            const addedByName = playerName(game.added_by);
            const ratingHeader = score === null ? `${unratedGames.length} te beoordelen` : 'Score aanpassen';
            return (
              <article className="page-subcard relative flex flex-col bg-gradient-to-br from-red-950/10 via-white to-emerald-700/10 p-4">
                {isAdmin && <button onClick={() => deleteGame(game.id)} className="absolute right-3 top-3 rounded-xl bg-white/85 p-2 text-slate-500 shadow-sm hover:bg-white" title="Verwijderen"><Trash2 size={17} /></button>}
                <p className="mb-3 text-center text-sm font-bold text-slate-500">{ratingHeader}</p>
                <div className="pr-9 text-center">
                  <h3 className="line-clamp-2 text-2xl font-black leading-tight">{game.title}</h3>
                  <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{formatGameMeta(game) || 'Geen extra info'}</p>
                  {addedByName && <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">Toegevoegd door {addedByName}</p>}
                </div>
                <div className="mt-4 flex flex-col">
                  {gameLargeImageUrl(game) ? (
                    <ProgressiveGameImage
                      thumbnailSrc={gameThumbnailUrl(game)}
                      fullSrc={gameLargeImageUrl(game)}
                      alt=""
                      className="aspect-[16/11] w-full rounded-2xl bg-white shadow-sm"
                    />
                  ) : (
                    <div className="flex aspect-[16/11] w-full items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm"><Dice5 size={56} /></div>
                  )}
                  <span className={`mx-auto mt-4 max-w-full rounded-full px-4 py-2 text-center text-sm font-black shadow-sm ${badge.className}`}>{badge.label}</span>
                </div>
                <div className="mt-5 rounded-2xl bg-white/90 p-3 shadow-sm">
                  <div className="grid grid-cols-11 text-center text-[11px] font-black text-slate-500">
                    {SCORE_OPTIONS.map((value) => (
                      <button
                        key={value}
                        className={`rounded-md py-3 ${score !== null && visibleScore === value ? 'bg-slate-950 text-white' : 'hover:bg-slate-100'}`}
                        disabled={!currentPlayer}
                        onClick={() => rateGame(game.id, value)}
                        type="button"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => chooseGame(game.id)}
                    disabled={saving}
                    className="neo-button neo-button-primary mt-4 text-sm disabled:opacity-50"
                  >
                    <Lock size={18} /> Zet dit spel vast
                  </button>
                )}
              </article>
            );
          })() : (
            <div className="neo-muted-panel text-center text-slate-500">
              Geen onbeoordeelde spellen meer.
              <button onClick={() => setView('results')} className="neo-button neo-button-primary mt-4 flex w-full">Bekijk scoretabel</button>
            </div>
          )}
        </section>
      )}

      {view === 'results' && !chosenGame && (
        <section className="page-card p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2"><Trophy size={20} /><h2 className="text-xl font-black">Welk spel gaan we spelen?</h2></div>
            <div>
              <button
                type="button"
                onClick={openAddGamesModal}
                disabled={!currentPlayerId}
                className="neo-button neo-button-primary text-sm disabled:bg-slate-200 disabled:text-slate-500"
                title={!currentPlayerId ? (viewerProfile ? `Doe eerst mee als ${viewerProfile.display_name}` : 'Vul eerst je naam in') : undefined}
              >
                <Plus size={18} /> Spellen toevoegen
              </button>
            </div>
          </div>
          {winner && (
            <div className="page-card-dark mb-4 p-5">
              <p className="text-sm font-semibold text-slate-300">Voorlopige winnaar</p>
              <div className="mt-3 flex items-center gap-3">
                {gameThumbnailUrl(winner.game) ? (
                  <img
                    src={gameThumbnailUrl(winner.game)!}
                    alt={winner.game.title}
                    className="h-14 w-14 shrink-0 rounded-xl bg-white object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300 shadow-sm">
                    <Dice5 size={20} />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-2xl font-black">{winner.game.title}</h3>
                  <p className="mt-1 text-slate-300">{winner.total} punten - {winner.average.toFixed(1)} gemiddeld - {winner.count} stem{winner.count === 1 ? '' : 'men'}</p>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {results.map((row, index) => (
              <div key={row.game.id} className="page-subcard px-4 py-3">
                <button
                  onClick={() => { setSelectedGameId(row.game.id); setView('rating'); }}
                  className="w-full text-left"
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {gameThumbnailUrl(row.game) ? (
                        <img
                          src={gameThumbnailUrl(row.game)!}
                          alt={row.game.title}
                          className="h-14 w-14 shrink-0 rounded-xl bg-white object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-slate-300 shadow-sm">
                          <Dice5 size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <b className="block truncate">#{index + 1} {row.game.title}</b>
                        <p className="text-sm text-slate-500">{row.count} stemmen - gemiddeld {row.average.toFixed(1)}</p>
                      </div>
                    </div>
                    <div className="text-2xl font-black">{row.total}</div>
                  </div>
                  {!!row.missing.length && <p className="mt-2 text-xs text-slate-500">Nog niet gestemd: {row.missing.map((player) => player.name).join(', ')}</p>}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => chooseGame(row.game.id)}
                    disabled={saving}
                    className="neo-button neo-button-ghost mt-3 text-sm disabled:opacity-50"
                  >
                    <Lock size={16} /> Zet dit spel vast
                  </button>
                )}
              </div>
            ))}
            {!results.length && <p className="neo-muted-panel text-center text-slate-500">Nog geen resultaat.</p>}
          </div>
          {!currentPlayerHasUnratedGames && !!currentPlayer && (
            <button
              type="button"
              onClick={() => {
                setSelectedGameId(null);
                setView('summary');
              }}
              className="neo-button neo-button-primary mt-5 flex w-full"
            >
              <Check size={20} /> Bevestig spelkeuze
            </button>
          )}
        </section>
      )}

      {addDatesOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="add-dates-title">
          <div className="page-card page-card-lime flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] sm:rounded-[2rem]">
            <div className="page-band shrink-0 flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Planning</p>
                <h3 id="add-dates-title" className="mt-1 font-poster text-3xl uppercase leading-none text-slate-950">Voeg extra data toe</h3>
                <p className="mt-1 text-sm text-slate-700">Kies extra datumopties die iedereen later kan zien en invullen.</p>
              </div>
              <button ref={addDatesCloseButtonRef} type="button" onClick={closeAddDatesModal} disabled={addDatesSaving} className="neo-button neo-button-ghost p-3 text-slate-600 disabled:opacity-50" title="Sluiten">
                <X size={20} />
              </button>
            </div>
            <div className="modal-scroll-area min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <DateOptionCalendar
                selectedDates={selectedAddDates}
                highlightedDates={dateOptions.map((option) => option.date)}
                onToggleDate={toggleAddDate}
                disabled={addDatesSaving}
                nonInteractiveDates={dateOptions.map((option) => option.date)}
                selectionMode="multiple"
              />
              <p className="mt-3 text-sm text-slate-500">Geselecteerde datums worden toegevoegd aan de opties voor alle deelnemers. Bestaande datums blijven ongewijzigd.</p>
            </div>
            <div className="shrink-0 flex flex-col gap-2 border-t border-slate-950/10 bg-white/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">{selectedAddDates.length} datumoptie{selectedAddDates.length === 1 ? '' : 's'} geselecteerd</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={closeAddDatesModal} disabled={addDatesSaving} className="neo-button neo-button-ghost disabled:opacity-50">Annuleren</button>
                <button
                  type="button"
                  onClick={addSelectedDates}
                  disabled={!selectedAddDates.length || addDatesSaving}
                  className="neo-button neo-button-primary disabled:opacity-50"
                >
                  {addDatesSaving ? 'Toevoegen...' : <><Plus size={18} /> Bevestigen</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {addGamesOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="add-games-title">
          <div className="page-card page-card-peach flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] sm:rounded-[2rem]">
            <div className="page-band shrink-0 flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Spellen toevoegen</p>
                <h3 id="add-games-title" className="mt-1 font-poster text-3xl uppercase leading-none text-slate-950">Kies extra spellen</h3>
                <p className="mt-1 text-sm text-slate-700">Selecteer spellen die je wil toevoegen aan de spelavond.</p>
              </div>
              <button ref={addGamesCloseButtonRef} type="button" onClick={closeAddGamesModal} disabled={addGamesSaving} className="neo-button neo-button-ghost p-3 text-slate-600 disabled:opacity-50" title="Sluiten">
                <X size={20} />
              </button>
            </div>
            <div className="modal-scroll-area min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <GameCollectionPicker
                selectedIds={selectedAddGameIds}
                onSelectedIdsChange={setSelectedAddGameIds}
                disabledTitles={existingGameTitles}
                disabledBggIds={existingBggIds}
                title="Zoek en selecteer spellen"
                subtitle="Vink alle spellen aan die je wil toevoegen."
                maxHeightClassName="max-h-[26rem]"
              />
            </div>
            <div className="shrink-0 flex flex-col gap-2 border-t border-slate-950/10 bg-white/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">{selectedAddGameIds.length} spel{selectedAddGameIds.length === 1 ? '' : 'len'} geselecteerd</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={closeAddGamesModal} disabled={addGamesSaving} className="neo-button neo-button-ghost disabled:opacity-50">Annuleren</button>
                <button
                  type="button"
                  onClick={addSelectedGames}
                  disabled={!selectedAddGameIds.length || addGamesSaving}
                  className="neo-button neo-button-primary disabled:opacity-50"
                >
                  {addGamesSaving ? 'Bevestigen...' : <><Plus size={18} /> Bevestigen</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
          <div className="page-card page-card-sky w-full max-w-2xl overflow-hidden rounded-t-[2rem] sm:rounded-[2rem]">
            <div className="page-band flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Bericht controleren</p>
                <h3 id="share-modal-title" className="mt-1 font-poster text-3xl uppercase leading-none text-slate-950">{shareModal.title}</h3>
                <p className="mt-1 text-sm text-slate-700">Pas het bericht eventueel aan voordat je het deelt.</p>
              </div>
              <button type="button" onClick={closeShareModal} disabled={sharing} className="neo-button neo-button-ghost p-3 text-slate-600 disabled:opacity-50" title="Sluiten">
                <X size={20} />
              </button>
            </div>
            <div className="px-5 py-4">
              <label className="text-sm font-bold text-slate-700" htmlFor="share-message">Deelbericht</label>
              <textarea
                id="share-message"
                value={shareTextValue}
                onChange={(event) => setShareTextValue(event.target.value)}
                className="neo-input mt-2 min-h-[16rem] resize-y whitespace-pre-wrap text-sm leading-6"
              />
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-950/10 bg-white/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
              <button type="button" onClick={closeShareModal} disabled={sharing} className="neo-button neo-button-ghost disabled:opacity-50">Sluiten</button>
              <button type="button" onClick={confirmShareText} disabled={sharing || !shareTextValue.trim()} className="neo-button neo-button-primary disabled:opacity-50">
                <Share2 size={18} /> {sharing ? 'Delen...' : 'Delen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
          <div className="page-card page-card-lime w-full max-w-md overflow-hidden rounded-t-[2rem] sm:rounded-[2rem]">
            <div className="page-band flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Account</p>
                <h3 id="auth-modal-title" className="mt-1 font-poster text-3xl uppercase leading-none text-slate-950">Log in of registreer</h3>
                <p className="mt-1 text-sm text-slate-700">Na het inloggen blijf je op deze spelavond en vullen we automatisch je profielnaam in.</p>
              </div>
              <button type="button" onClick={() => setAuthModalOpen(false)} className="neo-button neo-button-ghost p-3 text-slate-600" title="Sluiten">
                <X size={20} />
              </button>
            </div>
            <div className="px-5 py-4">
              <SignIn
                routing="virtual"
                withSignUp
                forceRedirectUrl={currentSessionUrl}
                fallbackRedirectUrl={currentSessionUrl}
                signUpForceRedirectUrl={currentSessionUrl}
                signUpFallbackRedirectUrl={currentSessionUrl}
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}

