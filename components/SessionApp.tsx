'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, Check, Copy, Dice5, Lock, Plus, RefreshCw, Share2, Trash2, Trophy, Unlock, UserRound, X } from 'lucide-react';
import { api, loadSessionBundle } from '@/lib/api';
import { AvailabilityDto, GameDto, PlayerDto, RatingDto, SessionDto } from '@/lib/types';
import GameCollectionPicker from './GameCollectionPicker';

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
  players: PlayerDto[];
};
type FlowView = 'availability' | 'rating' | 'results';

const SCORE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

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

function adminKey(sessionId: string) {
  return `gsk-admin-${sessionId}`;
}

function formatGameMeta(game: GameDto) {
  return [
    game.year_published,
    game.min_players && game.max_players ? `${game.min_players}-${game.max_players} spelers` : null,
    game.playing_time ? `${game.playing_time} min` : null,
    game.bgg_weight ? `weight ${game.bgg_weight.toFixed(1)}` : null,
    game.bgg_rating ? `BGG ${game.bgg_rating.toFixed(1)}` : null
  ].filter(Boolean).join(' · ');
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

function shareSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export default function SessionApp({ sessionId }: { sessionId: string }) {
  const searchParams = useSearchParams();
  const [session, setSession] = useState<SessionDto | null>(null);
  const [players, setPlayers] = useState<PlayerDto[]>([]);
  const [games, setGames] = useState<GameDto[]>([]);
  const [availability, setAvailability] = useState<AvailabilityDto[]>([]);
  const [ratings, setRatings] = useState<RatingDto[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
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
  const [shareModal, setShareModal] = useState<{ title: string; text: string; copiedMessage: string } | null>(null);
  const [shareTextValue, setShareTextValue] = useState('');
  const [sharing, setSharing] = useState(false);
  const scoreSaveTimers = useRef<Record<string, number>>({});
  const initialViewResolved = useRef(false);
  const addGamesCloseButtonRef = useRef<HTMLButtonElement>(null);

  const currentPlayer = players.find((player) => player.id === currentPlayerId) ?? null;
  const isAdmin = Boolean(adminToken);
  const dateOptions = session?.date_options ?? [];
  const existingGameTitles = useMemo(() => games.map((game) => game.title), [games]);
  const existingBggIds = useMemo(() => games.map((game) => game.bgg_id).filter((id): id is number => id !== null), [games]);

  async function refresh(showMessage = false) {
    try {
      const data = await loadSessionBundle(sessionId);
      setSession(data.session);
      setPlayers(data.players);
      setGames(data.games);
      setAvailability(data.availability);
      setRatings(data.ratings);
      setError(null);
      if (showMessage) setMessage('Alles is bijgewerkt.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sessie laden mislukt.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const adminFromUrl = searchParams.get('admin');
    if (adminFromUrl) localStorage.setItem(adminKey(sessionId), adminFromUrl);
    setAdminToken(adminFromUrl || localStorage.getItem(adminKey(sessionId)));
    setCurrentPlayerId(localStorage.getItem(playerKey(sessionId)));
    refresh(false);
    const interval = window.setInterval(() => refresh(false), 15000);
    return () => {
      window.clearInterval(interval);
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

    if (session?.locked && session.chosen_day) {
      const hasUnratedGames = games.some((game) => !ratings.some((rating) => rating.player_id === currentPlayerId && rating.game_id === game.id));
      setView(hasUnratedGames ? 'rating' : 'results');
      initialViewResolved.current = true;
      return;
    }

    const hasFilledPlanning = availability.some((item) => item.player_id === currentPlayerId);
    if (!hasFilledPlanning) {
      initialViewResolved.current = true;
      return;
    }

    const hasUnratedGames = games.some((game) => !ratings.some((rating) => rating.player_id === currentPlayerId && rating.game_id === game.id));
    setView(hasUnratedGames ? 'rating' : 'results');
    initialViewResolved.current = true;
  }, [availability, currentPlayerId, games, loading, ratings, session?.chosen_day, session?.locked]);

  const eligiblePlayers = useMemo(() => {
    if (!session?.chosen_day) return players;
    return players.filter((player) => availability.some((item) => item.player_id === player.id && item.day === session.chosen_day && item.available));
  }, [availability, players, session?.chosen_day]);

  const dateRows = useMemo<DateRow[]>(() => dateOptions.map((option) => ({
    ...option,
    display: dateParts(option.date),
    label: formatDate(option.date),
    players: players.filter((player) => availability.some((item) => item.player_id === player.id && item.day === option.date && item.available))
  })), [availability, dateOptions, players]);
  const chosenDateRow = session?.chosen_day ? dateRows.find((row) => row.date === session.chosen_day) : null;

  const results = useMemo<ResultRow[]>(() => games.map((game) => {
    const relevantRatings = ratings.filter((rating) => rating.game_id === game.id && eligiblePlayers.some((player) => player.id === rating.player_id));
    const total = relevantRatings.reduce((sum, rating) => sum + rating.score, 0);
    const average = relevantRatings.length ? total / relevantRatings.length : 0;
    const missing = eligiblePlayers.filter((player) => !relevantRatings.some((rating) => rating.player_id === player.id));
    return { game, total, average, count: relevantRatings.length, missing };
  }).sort((a, b) => b.total - a.total || b.average - a.average || b.count - a.count || a.game.title.localeCompare(b.game.title)), [eligiblePlayers, games, ratings]);

  const winner = results[0] ?? null;
  const unratedGames = useMemo(() => (
    currentPlayerId ? games.filter((game) => !ratings.some((rating) => rating.player_id === currentPlayerId && rating.game_id === game.id)) : []
  ), [currentPlayerId, games, ratings]);
  const selectedGame = selectedGameId ? games.find((game) => game.id === selectedGameId) ?? null : null;
  const activeRatingGame = selectedGame ?? unratedGames[0] ?? null;

  function isAvailable(date: string) {
    return availability.some((item) => item.player_id === currentPlayerId && item.day === date && item.available);
  }

  function myScore(gameId: string) {
    return ratings.find((rating) => rating.player_id === currentPlayerId && rating.game_id === gameId)?.score ?? null;
  }

  function playerName(playerId: string | null) {
    if (!playerId) return null;
    return players.find((player) => player.id === playerId)?.name ?? null;
  }

  function confirmAvailability() {
    if (!currentPlayer) return;
    setSelectedGameId(null);
    setView(unratedGames.length ? 'rating' : 'results');
  }

  async function joinSession(event: React.FormEvent) {
    event.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      const data = await api<{ player: PlayerDto }>(`/api/sessions/${sessionId}/players`, {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      localStorage.setItem(playerKey(sessionId), data.player.id);
      setCurrentPlayerId(data.player.id);
      setNameInput('');
      setMessage(`Welkom, ${data.player.name}!`);
      await refresh(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deelnemen mislukt.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(date: string) {
    if (!currentPlayerId || session?.locked) return;
    const playerId = currentPlayerId;
    const available = !isAvailable(date);
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

  async function chooseDate(date: string | null, locked = Boolean(date)) {
    if (!adminToken) return;
    const previousSession = session;
    setError(null);
    setSession((current) => current ? { ...current, chosen_day: date, locked: date ? locked : false } : current);
    setMessage(date ? `Datum vastgelegd: ${formatDate(date)}.` : 'Planning opnieuw opengezet.');

    try {
      const data = await api<{ session: SessionDto }>(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ admin_token: adminToken, chosen_day: date, locked: date ? locked : false })
      });
      setSession(data.session);
    } catch (err) {
      setSession(previousSession);
      setError(err instanceof Error ? err.message : 'Datum kiezen mislukt.');
    }
  }

  async function deleteGame(gameId: string) {
    if (!adminToken || !window.confirm('Dit spel verwijderen?')) return;
    setSaving(true);
    try {
      await api(`/api/sessions/${sessionId}/games?game_id=${gameId}&admin_token=${adminToken}`, { method: 'DELETE' });
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
      setError('Vul eerst je naam in om spellen toe te voegen.');
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
      setView('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spellen toevoegen mislukt.');
    } finally {
      setAddGamesSaving(false);
    }
  }

  function setScore(gameId: string, score: number) {
    if (!currentPlayerId) return;
    const playerId = currentPlayerId;
    const timerKey = `${playerId}:${gameId}`;

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
    }, 250);
  }

  function rateGame(gameId: string, score: number) {
    const wasAlreadyRated = myScore(gameId) !== null;
    setScore(gameId, score);

    if (selectedGameId === gameId && wasAlreadyRated) {
      setSelectedGameId(null);
      setView('results');
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

  function buildInviteText() {
    const url = `${window.location.origin}/s/${sessionId}`;
    const dates = session?.locked && session.chosen_day
      ? `• Vastgelegd: ${formatDate(session.chosen_day)}`
      : dateRows.map((row) => `• ${row.label}`).join('\n') || '• datum nog te bepalen';
    const gameList = games.slice(0, 8).map((game) => `• ${game.title}`).join('\n');
    const extraGames = games.length > 8 ? `\n• ... en nog ${games.length - 8} spel${games.length - 8 === 1 ? '' : 'len'}` : '';
    const intro = session?.locked ? 'De datum ligt vast.' : 'Wanneer kan je?';
    const action = session?.locked ? 'Geef je spelvoorkeur door via:' : 'Geef je beschikbaarheid en je spelvoorkeur door via:';
    return `${session?.title ?? 'Spelavond'}\n\n${intro}\n${dates}\n\n${action}\n${url}${gameList ? `\n\nSpellen op de lijst:\n${gameList}${extraGames}` : ''}`;
  }

  function buildResultText() {
    const url = `${window.location.origin}/s/${sessionId}`;
    const dateLabel = session?.chosen_day ? formatDate(session.chosen_day) : 'datum nog te kiezen';
    const top = winner ? `${winner.game.title} (${winner.total} punten, ${winner.average.toFixed(1)} gemiddeld)` : 'nog geen winnaar';
    const playersText = eligiblePlayers.map((player) => player.name).join(', ') || 'nog niemand';
    return `${session?.title ?? 'Spelavond'}\n\nDatum: ${dateLabel}\nSpel: ${top}\nSpelers: ${playersText}\n\n${url}`;
  }

  function openShareModal(title: string, text: string, copiedMessage: string) {
    setShareModal({ title, text, copiedMessage });
    setShareTextValue(text);
    setError(null);
  }

  function shareInvite() {
    openShareModal('Spelavond delen', buildInviteText(), 'Uitnodiging gekopieerd.');
  }

  function shareResult() {
    openShareModal('Resultaat delen', buildResultText(), 'Resultaat gekopieerd.');
  }

  function closeShareModal() {
    if (sharing) return;
    setShareModal(null);
    setShareTextValue('');
  }

  async function copyShareText() {
    if (!shareModal) return;
    try {
      await navigator.clipboard.writeText(shareTextValue);
      setMessage(shareModal.copiedMessage);
      closeShareModal();
    } catch {
      setError('Kopiëren is niet gelukt. Selecteer de tekst en kopieer ze handmatig.');
    }
  }

  function shareViaWhatsApp() {
    if (!shareModal) return;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareTextValue)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setMessage('WhatsApp is geopend met je aangepaste bericht.');
    closeShareModal();
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
        setMessage(shareModal.copiedMessage);
      }
      setShareModal(null);
      setShareTextValue('');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Delen is niet gelukt. Je kan het bericht kopiëren of via WhatsApp delen.');
    } finally {
      setSharing(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-8">Laden...</main>;
  if (!session) return <main className="mx-auto max-w-4xl px-4 py-8">Sessie niet gevonden.</main>;

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 pb-16">
      <header className="rounded-3xl bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Gezelschapsspelkiezer</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">{session.title}</h1>
            <p className="mt-2 text-sm text-slate-500">{players.length} speler{players.length === 1 ? '' : 's'} · {games.length} spel{games.length === 1 ? '' : 'len'} · {dateOptions.length} datum{dateOptions.length === 1 ? '' : 's'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => refresh(true)} className="rounded-2xl border border-slate-200 p-3" title="Vernieuwen"><RefreshCw size={20} /></button>
            <button onClick={shareInvite} className="rounded-2xl border border-slate-200 p-3" title="Spelavond delen"><Share2 size={20} /></button>
          </div>
        </div>
        {isAdmin && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Je bent organisator. Deel de gewone link met spelers; hou de admin-link voor jezelf.</p>}
        {!currentPlayer && (
          <form onSubmit={joinSession} className="mt-5 flex gap-2">
            <input value={nameInput} onChange={(event) => setNameInput(event.target.value)} placeholder="Jouw naam" className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400" />
            <button disabled={saving} className="rounded-2xl bg-slate-950 px-4 font-bold text-white disabled:opacity-60">Meedoen</button>
          </form>
        )}
        {currentPlayer && <p className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm"><UserRound size={18} /> Je doet mee als <b>{currentPlayer.name}</b>.</p>}
        {message && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
        {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </header>

      {session.locked && session.chosen_day && chosenDateRow && (
        <section className="rounded-3xl bg-emerald-950 p-5 text-white shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-white text-emerald-950">
                <span className="text-xs font-black uppercase">{chosenDateRow.display.month}</span>
                <span className="text-2xl font-black leading-none">{chosenDateRow.display.day}</span>
              </div>
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-100"><Lock size={16} /> Datum vastgelegd</p>
                <h2 className="mt-1 text-2xl font-black capitalize">{chosenDateRow.display.weekday}</h2>
                <p className="text-emerald-100">{chosenDateRow.display.full} · Tijd volgt</p>
              </div>
            </div>
            {isAdmin && (
              <button onClick={() => chooseDate(null)} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-emerald-950 disabled:opacity-60">
                <Unlock size={18} /> Planning heropenen
              </button>
            )}
          </div>
        </section>
      )}

      {view === 'availability' && (
        <section className="rounded-3xl bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2"><CalendarDays size={20} /><h2 className="text-xl font-black">Wanneer kan je?</h2></div>
          {session.locked && chosenDateRow ? (
            <div className="rounded-2xl bg-emerald-50 px-4 py-5 text-emerald-950">
              <p className="text-sm font-bold">De organisator heeft de datum gekozen.</p>
              <p className="mt-1 text-2xl font-black capitalize">{chosenDateRow.display.weekday}</p>
              <p>{chosenDateRow.display.full} - Tijd volgt</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {dateRows.map((row) => {
                  const selected = isAvailable(row.date);
                  const isToday = row.date === localDateKey();
                  const needsLoginHint = !currentPlayer;
                  const availableNames = row.players.map((player) => player.name);

                  return (
                    <button
                      key={row.date}
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        if (!currentPlayer) return;
                        toggleAvailability(row.date);
                      }}
                      title={needsLoginHint ? 'vul eerst je naam in of log in' : row.label}
                      className={[
                        'rounded-2xl border p-4 text-left transition',
                        selected ? 'border-emerald-500 bg-emerald-100 text-emerald-950' : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300',
                        isToday ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white' : '',
                        needsLoginHint ? 'cursor-help' : '',
                        saving ? 'disabled:opacity-60' : ''
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-black capitalize">{row.display.weekday} {row.display.day} {row.display.month}</h3>
                          <p className={`mt-1 text-xs font-bold ${selected ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {selected ? 'Jij bent beschikbaar' : 'Klik om beschikbaar te zijn'}
                          </p>
                        </div>
                        {selected ? <Check size={16} className="shrink-0" /> : null}
                      </div>
                      <div className="mt-3">
                        <p className={`text-xs font-bold uppercase ${selected ? 'text-emerald-700' : 'text-slate-500'}`}>Deelnemers</p>
                        <p className={`mt-1 text-sm leading-6 ${selected ? 'text-emerald-900' : 'text-slate-600'}`}>
                          {availableNames.length ? availableNames.join(', ') : 'Nog niemand'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
                  <CalendarDays size={14} /> Klik op meerdere dagen die voor jou passen
                </span>
              </div>
            </>
          )}
          <button onClick={confirmAvailability} disabled={!currentPlayer} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 font-black text-white disabled:opacity-50">
            <Check size={20} /> {session.locked ? 'Verder naar scores' : 'Bevestig aanwezigheid'}
          </button>
        </section>
      )}

      {view === 'rating' && (
        <section className="mx-auto max-w-xl rounded-3xl bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Dice5 size={20} /><h2 className="text-xl font-black">Geef je score</h2></div>
            <button onClick={() => { setSelectedGameId(null); setView('results'); }} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold">Tabel</button>
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
              <article className="relative flex flex-col rounded-[1.35rem] border border-slate-200 bg-gradient-to-br from-red-950/10 via-white to-emerald-700/10 p-4 shadow-sm">
                {isAdmin && <button onClick={() => deleteGame(game.id)} className="absolute right-3 top-3 rounded-xl bg-white/85 p-2 text-slate-500 shadow-sm hover:bg-white" title="Verwijderen"><Trash2 size={17} /></button>}
                <p className="mb-3 text-center text-sm font-bold text-slate-500">{ratingHeader}</p>
                <div className="pr-9 text-center">
                  <h3 className="line-clamp-2 text-2xl font-black leading-tight">{game.title}</h3>
                  <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{formatGameMeta(game) || 'Geen extra info'}</p>
                  {addedByName && <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">Toegevoegd door {addedByName}</p>}
                </div>
                <div className="mt-4 flex flex-col">
                  {game.image_url ? (
                    <img src={game.image_url} alt="" className="aspect-[16/11] w-full rounded-2xl bg-white object-cover shadow-sm" />
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
              </article>
            );
          })() : (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-slate-500">
              Geen onbeoordeelde spellen meer.
              <button onClick={() => setView('results')} className="mt-4 block w-full rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white">Bekijk scoretabel</button>
            </div>
          )}
        </section>
      )}

      {view === 'results' && (
        <section className="rounded-3xl bg-white p-5 shadow-soft">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2"><Trophy size={20} /><h2 className="text-xl font-black">Scoretabel</h2></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setView('availability')} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold"><CalendarDays size={16} className="inline" /> Planning</button>
              <button onClick={shareInvite} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold"><Share2 size={16} className="inline" /> Spelavond delen</button>
              <button onClick={shareResult} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold"><Copy size={16} className="inline" /> Resultaat delen</button>
            </div>
          </div>
          <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-slate-800">Extra spellen voorstellen?</p>
                <p className="mt-1 text-sm text-slate-500">Voeg één of meerdere spellen toe uit de collectie van de organisator of jezelf.</p>
              </div>
              <button
                type="button"
                onClick={openAddGamesModal}
                disabled={!currentPlayerId}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-500"
                title={!currentPlayerId ? 'Vul eerst je naam in' : undefined}
              >
                <Plus size={18} /> Spellen toevoegen
              </button>
            </div>
          </div>
          {winner && (
            <div className="mb-4 rounded-3xl bg-slate-950 p-5 text-white">
              <p className="text-sm font-semibold text-slate-300">Voorlopige winnaar</p>
              <h3 className="mt-1 text-2xl font-black">{winner.game.title}</h3>
              <p className="mt-1 text-slate-300">{winner.total} punten · {winner.average.toFixed(1)} gemiddeld · {winner.count} stem{winner.count === 1 ? '' : 'men'}</p>
            </div>
          )}
          <div className="space-y-2">
            {results.map((row, index) => (
              <button
                key={row.game.id}
                onClick={() => { setSelectedGameId(row.game.id); setView('rating'); }}
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0"><b>#{index + 1} {row.game.title}</b><p className="text-sm text-slate-500">{row.count} stemmen · gemiddeld {row.average.toFixed(1)}</p></div>
                  <div className="text-2xl font-black">{row.total}</div>
                </div>
                {!!row.missing.length && <p className="mt-2 text-xs text-slate-500">Nog niet gestemd: {row.missing.map((player) => player.name).join(', ')}</p>}
              </button>
            ))}
            {!results.length && <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-slate-500">Nog geen resultaat.</p>}
          </div>
        </section>
      )}

      {addGamesOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="add-games-title">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Spellen toevoegen</p>
                <h3 id="add-games-title" className="mt-1 text-2xl font-black tracking-tight">Kies extra spellen</h3>
                <p className="mt-1 text-sm text-slate-500">Selecteer spellen die je wil toevoegen aan de spelavond.</p>
              </div>
              <button ref={addGamesCloseButtonRef} type="button" onClick={closeAddGamesModal} disabled={addGamesSaving} className="rounded-2xl border border-slate-200 p-3 text-slate-600 hover:bg-slate-50 disabled:opacity-50" title="Sluiten">
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[calc(92vh-11rem)] overflow-y-auto px-5 py-4">
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
            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">{selectedAddGameIds.length} spel{selectedAddGameIds.length === 1 ? '' : 'len'} geselecteerd</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={closeAddGamesModal} disabled={addGamesSaving} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Annuleren</button>
                <button
                  type="button"
                  onClick={addSelectedGames}
                  disabled={!selectedAddGameIds.length || addGamesSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-50"
                >
                  {addGamesSaving ? 'Toevoegen...' : <><Plus size={18} /> Toevoegen aan spelavond</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
          <div className="w-full max-w-2xl overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Bericht controleren</p>
                <h3 id="share-modal-title" className="mt-1 text-2xl font-black tracking-tight">{shareModal.title}</h3>
                <p className="mt-1 text-sm text-slate-500">Pas het bericht eventueel aan voordat je het deelt.</p>
              </div>
              <button type="button" onClick={closeShareModal} disabled={sharing} className="rounded-2xl border border-slate-200 p-3 text-slate-600 hover:bg-slate-50 disabled:opacity-50" title="Sluiten">
                <X size={20} />
              </button>
            </div>
            <div className="px-5 py-4">
              <label className="text-sm font-bold text-slate-700" htmlFor="share-message">Deelbericht</label>
              <textarea
                id="share-message"
                value={shareTextValue}
                onChange={(event) => setShareTextValue(event.target.value)}
                className="mt-2 min-h-[16rem] w-full resize-y whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-400 focus:bg-white"
              />
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={copyShareText} disabled={sharing || !shareTextValue.trim()} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Kopiëren
              </button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={closeShareModal} disabled={sharing} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Annuleren</button>
                <button type="button" onClick={shareViaWhatsApp} disabled={sharing || !shareTextValue.trim()} className="rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50">WhatsApp</button>
                <button type="button" onClick={confirmShareText} disabled={sharing || !shareTextValue.trim()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-50">
                  <Share2 size={18} /> {sharing ? 'Delen...' : 'Delen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
