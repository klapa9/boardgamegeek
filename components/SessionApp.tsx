'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, Copy, Dice5, RefreshCw, Share2, Trash2, Trophy, UserRound } from 'lucide-react';
import { api, loadSessionBundle } from '@/lib/api';
import { AvailabilityDto, DAYS, DayKey, GameDto, PlayerDto, RatingDto, SessionDto } from '@/lib/types';

type ResultRow = {
  game: GameDto;
  average: number;
  total: number;
  count: number;
  missing: PlayerDto[];
};

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
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

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
  }).sort((a, b) => b.average - a.average || b.total - a.total || b.count - a.count || a.game.title.localeCompare(b.game.title)), [eligiblePlayers, games, ratings]);

  const winner = results[0] ?? null;

  function isAvailable(day: DayKey) {
    return availability.some((item) => item.player_id === currentPlayerId && item.day === day && item.available);
  }

  function myScore(gameId: string) {
    return ratings.find((rating) => rating.player_id === currentPlayerId && rating.game_id === gameId)?.score ?? null;
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
    setSaving(true);
    try {
      await api(`/api/sessions/${sessionId}/availability`, {
        method: 'PUT',
        body: JSON.stringify({ player_id: currentPlayerId, day, available: !isAvailable(day) })
      });
      await refresh(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beschikbaarheid opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  }

  async function chooseDay(day: DayKey | null) {
    if (!adminToken) return;
    setSaving(true);
    try {
      await api(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ admin_token: adminToken, chosen_day: day })
      });
      setMessage(day ? `Dag gekozen: ${DAYS.find((d) => d.key === day)?.label}.` : 'Dag opnieuw opengezet.');
      await refresh(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dag kiezen mislukt.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteGame(gameId: string) {
    if (!adminToken || !window.confirm('Dit spel verwijderen?')) return;
    setSaving(true);
    try {
      await api(`/api/sessions/${sessionId}/games?game_id=${gameId}&admin_token=${adminToken}`, { method: 'DELETE' });
      await refresh(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spel verwijderen mislukt.');
    } finally {
      setSaving(false);
    }
  }

  async function setScore(gameId: string, score: number) {
    if (!currentPlayerId) return;
    try {
      await api(`/api/sessions/${sessionId}/ratings`, {
        method: 'PUT',
        body: JSON.stringify({ player_id: currentPlayerId, game_id: gameId, score })
      });
      await refresh(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Score opslaan mislukt.');
    }
  }

  async function shareInvite() {
    const url = `${window.location.origin}/s/${sessionId}`;
    const text = `🎲 ${session?.title ?? 'Spelavond'} kiezen!\n\nDuid aan wanneer je kan en geef punten op 10:\n${url}`;
    if (navigator.share) await navigator.share({ text });
    else {
      await navigator.clipboard.writeText(text);
      setMessage('Uitnodiging gekopieerd.');
    }
  }

  async function shareResult() {
    const url = `${window.location.origin}/s/${sessionId}`;
    const dayLabel = session?.chosen_day ? DAYS.find((day) => day.key === session.chosen_day)?.label : 'nog te kiezen dag';
    const top = winner ? `${winner.game.title} (${winner.average.toFixed(1)}/10)` : 'nog geen winnaar';
    const text = `🎲 ${session?.title ?? 'Spelavond'}\n📅 ${dayLabel}\n🏆 Winnaar: ${top}\n\n${url}`;
    if (navigator.share) await navigator.share({ text });
    else {
      await navigator.clipboard.writeText(text);
      setMessage('Resultaat gekopieerd.');
    }
  }

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-8">Laden...</main>;
  if (!session) return <main className="mx-auto max-w-4xl px-4 py-8">Sessie niet gevonden.</main>;

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 pb-16">
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

      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2"><CalendarDays size={20} /><h2 className="text-xl font-black">1. Wanneer kan je?</h2></div>
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
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2"><Dice5 size={20} /><h2 className="text-xl font-black">2. Geef punten op 10</h2></div>
        <p className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">De spellen voor deze avond zijn gekozen bij het aanmaken. BGG wordt in deze flow niet meer aangesproken.</p>
        <div className="space-y-4">
          {games.map((game) => {
            const score = myScore(game.id);
            return (
              <article key={game.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex gap-3">
                  {game.image_url ? <img src={game.image_url} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-2xl">🎲</div>}
                  <div className="min-w-0 flex-1">
                    <div className="flex gap-2">
                      <h3 className="flex-1 font-black">{game.title}</h3>
                      {isAdmin && <button onClick={() => deleteGame(game.id)} className="rounded-xl p-2 text-slate-500 hover:bg-white" title="Verwijderen"><Trash2 size={17} /></button>}
                    </div>
                    <p className="text-sm text-slate-500">{formatGameMeta(game) || 'Geen extra info'}</p>
                    {game.bgg_id && <a className="text-sm font-bold text-slate-700 underline" href={`https://boardgamegeek.com/boardgame/${game.bgg_id}`} target="_blank">BGG bekijken</a>}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-11">
                  {Array.from({ length: 11 }, (_, value) => (
                    <button key={value} disabled={!currentPlayer} onClick={() => setScore(game.id, value)} className={`rounded-xl border px-2 py-2 text-sm font-bold ${score === value ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white'}`}>{value}</button>
                  ))}
                </div>
              </article>
            );
          })}
          {!games.length && <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-slate-500">Er zijn geen spellen geselecteerd voor deze spelavond.</p>}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Trophy size={20} /><h2 className="text-xl font-black">Resultaat</h2></div>
          <button onClick={shareResult} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold"><Copy size={16} className="inline" /> Delen</button>
        </div>
        {winner && (
          <div className="mb-4 rounded-3xl bg-slate-950 p-5 text-white">
            <p className="text-sm font-semibold text-slate-300">Voorlopige winnaar</p>
            <h3 className="mt-1 text-2xl font-black">{winner.game.title}</h3>
            <p className="mt-1 text-slate-300">{winner.average.toFixed(1)}/10 · {winner.count} stem{winner.count === 1 ? '' : 'men'}</p>
          </div>
        )}
        <div className="space-y-2">
          {results.map((row, index) => (
            <div key={row.game.id} className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0"><b>#{index + 1} {row.game.title}</b><p className="text-sm text-slate-500">{row.count} stemmen · totaal {row.total}</p></div>
                <div className="text-2xl font-black">{row.average.toFixed(1)}</div>
              </div>
              {!!row.missing.length && <p className="mt-2 text-xs text-slate-500">Nog niet gestemd: {row.missing.map((player) => player.name).join(', ')}</p>}
            </div>
          ))}
          {!results.length && <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-slate-500">Nog geen resultaat.</p>}
        </div>
      </section>
    </main>
  );
}
