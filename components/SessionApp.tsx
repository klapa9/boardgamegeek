'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, Check, Copy, Dice5, RefreshCw, Share2, Trash2, Trophy, UserRound } from 'lucide-react';
import { api, loadSessionBundle } from '@/lib/api';
import { AvailabilityDto, DAYS, DayKey, GameDto, PlayerDto, RatingDto, SessionDto } from '@/lib/types';
import BggGameSearch from './BggGameSearch';

type ResultRow = {
  game: GameDto;
  average: number;
  total: number;
  count: number;
  missing: PlayerDto[];
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
  const scoreSaveTimers = useRef<Record<string, number>>({});
  const initialViewResolved = useRef(false);

  const currentPlayer = players.find((player) => player.id === currentPlayerId) ?? null;
  const isAdmin = Boolean(adminToken);

  async function refresh(showMessage = false) {
    try {
      const data = await loadSessionBundle(sessionId);
      setSession(data.session);
      setPlayers(data.players);
      setGames(data.games);
      setAvailability(data.availability);
      setRatings(data.ratings);
      if (showMessage) setMessage('Gegevens vernieuwd.');
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

    const hasFilledPlanning = availability.some((item) => item.player_id === currentPlayerId);
    if (!hasFilledPlanning) {
      initialViewResolved.current = true;
      return;
    }

    const hasUnratedGames = games.some((game) => !ratings.some((rating) => rating.player_id === currentPlayerId && rating.game_id === game.id));
    setView(hasUnratedGames ? 'rating' : 'results');
    initialViewResolved.current = true;
  }, [availability, currentPlayerId, games, loading, ratings]);

  const eligiblePlayers = useMemo(() => {
    if (!session?.chosen_day) return players;
    return players.filter((player) => availability.some((item) => item.player_id === player.id && item.day === session.chosen_day && item.available));
  }, [availability, players, session?.chosen_day]);

  const dayRows = useMemo(() => DAYS.map((day) => ({
    ...day,
    players: players.filter((player) => availability.some((item) => item.player_id === player.id && item.day === day.key && item.available))
  })), [availability, players]);

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

  function isAvailable(day: DayKey) {
    return availability.some((item) => item.player_id === currentPlayerId && item.day === day && item.available);
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

  async function toggleAvailability(day: DayKey) {
    if (!currentPlayerId) return;
    const playerId = currentPlayerId;
    const available = !isAvailable(day);
    const previousAvailability = availability;
    setError(null);
    setAvailability((items) => {
      const existing = items.some((item) => item.player_id === playerId && item.day === day);
      if (existing) {
        return items.map((item) => (
          item.player_id === playerId && item.day === day ? { ...item, available } : item
        ));
      }
      return [...items, { player_id: playerId, day, available }];
    });

    try {
      const data = await api<{ availability: AvailabilityDto }>(`/api/sessions/${sessionId}/availability`, {
        method: 'PUT',
        body: JSON.stringify({ player_id: playerId, day, available })
      });
      setAvailability((items) => items.map((item) => (
        item.player_id === playerId && item.day === day ? data.availability : item
      )));
    } catch (err) {
      setAvailability(previousAvailability);
      setError(err instanceof Error ? err.message : 'Beschikbaarheid opslaan mislukt.');
    }
  }

  async function chooseDay(day: DayKey | null) {
    if (!adminToken) return;
    const previousSession = session;
    setError(null);
    setSession((current) => current ? { ...current, chosen_day: day } : current);
    setMessage(day ? `Dag gekozen: ${DAYS.find((d) => d.key === day)?.label}.` : 'Dag opnieuw opengezet.');

    try {
      const data = await api<{ session: SessionDto }>(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ admin_token: adminToken, chosen_day: day })
      });
      setSession(data.session);
    } catch (err) {
      setSession(previousSession);
      setError(err instanceof Error ? err.message : 'Dag kiezen mislukt.');
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

  async function shareInvite() {
    const url = `${window.location.origin}/s/${sessionId}`;
    const text = `Wie kan wanneer komende week?\n\nDuid aan wanneer je kan en geef de voorkeur welk spel je wilt spelen via deze link: ${url}`;
    if (navigator.share) await navigator.share({ text });
    else {
      await navigator.clipboard.writeText(text);
      setMessage('Uitnodiging gekopieerd.');
    }
  }

  async function shareResult() {
    const url = `${window.location.origin}/s/${sessionId}`;
    const dayLabel = session?.chosen_day ? DAYS.find((day) => day.key === session.chosen_day)?.label : 'nog te kiezen dag';
    const top = winner ? `${winner.game.title} (${winner.total} punten)` : 'nog geen winnaar';
    const text = `${session?.title ?? 'Spelavond'}\n${dayLabel}\nWinnaar: ${top}\n\n${url}`;
    if (navigator.share) await navigator.share({ text });
    else {
      await navigator.clipboard.writeText(text);
      setMessage('Resultaat gekopieerd.');
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
            <p className="mt-2 text-sm text-slate-500">{players.length} speler{players.length === 1 ? '' : 's'} · {games.length} spel{games.length === 1 ? '' : 'len'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => refresh(true)} className="rounded-2xl border border-slate-200 p-3" title="Vernieuwen"><RefreshCw size={20} /></button>
            <button onClick={shareInvite} className="rounded-2xl border border-slate-200 p-3" title="Delen"><Share2 size={20} /></button>
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

      {view === 'availability' && (
        <section className="rounded-3xl bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2"><CalendarDays size={20} /><h2 className="text-xl font-black">Wanneer kan je?</h2></div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
            {DAYS.map((day) => (
              <button key={day.key} disabled={!currentPlayer || saving} onClick={() => toggleAvailability(day.key)} className={`rounded-2xl border px-3 py-3 text-sm font-bold ${isAvailable(day.key) ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                {day.label}
              </button>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {dayRows.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <b>{row.label}</b>
                  <p className="truncate text-sm text-slate-500">{row.players.map((player) => player.name).join(', ') || 'Nog niemand'}</p>
                </div>
                {isAdmin ? (
                  <button disabled={saving} onClick={() => chooseDay(row.key)} className={`rounded-xl px-3 py-2 text-sm font-bold ${session.chosen_day === row.key ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white'}`}>{row.players.length}</button>
                ) : <span className="rounded-xl bg-white px-3 py-2 text-sm font-bold">{row.players.length}</span>}
              </div>
            ))}
          </div>
          {session.chosen_day && (
            <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Gekozen dag: <b>{DAYS.find((day) => day.key === session.chosen_day)?.label}</b>. Alleen deze spelers tellen mee: <b>{eligiblePlayers.map((player) => player.name).join(', ') || 'niemand'}</b>.
              {isAdmin && <button onClick={() => chooseDay(null)} className="ml-2 font-bold underline">opnieuw openzetten</button>}
            </div>
          )}
          <button onClick={confirmAvailability} disabled={!currentPlayer} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 font-black text-white disabled:opacity-50">
            <Check size={20} /> Bevestig aanwezigheid
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Trophy size={20} /><h2 className="text-xl font-black">Scoretabel</h2></div>
            <div className="flex gap-2">
              <button onClick={() => setView('availability')} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold"><CalendarDays size={16} className="inline" /> Planning</button>
              <button onClick={shareResult} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold"><Copy size={16} className="inline" /> Delen</button>
            </div>
          </div>
          <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3">
            <BggGameSearch
              sessionId={sessionId}
              playerId={currentPlayerId}
              onAdded={async () => {
                setMessage('Spel toegevoegd aan de lijst.');
                setSelectedGameId(null);
                setView('rating');
                await refresh(false);
              }}
            />
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
    </main>
  );
}
