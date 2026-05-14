'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { CollectionBundle, CollectionGameDto } from '@/lib/types';

const SYNC_POLL_INTERVAL_MS = 2500;

function listImageUrl(game: CollectionGameDto) {
  return game.thumbnail_url ?? game.image_url;
}

function formatMeta(game: CollectionGameDto) {
  return [
    game.year_published,
    game.community_players.length ? `aanbevolen ${game.community_players.join(', ')} spelers` : game.min_players && game.max_players ? `${game.min_players}-${game.max_players} spelers` : null,
    game.playing_time ? `${game.playing_time} min` : null,
    game.bgg_weight ? `weight ${game.bgg_weight.toFixed(1)}` : null,
    game.bgg_rating ? `BGG ${game.bgg_rating.toFixed(1)}` : null,
    game.play_mode === 'cooperative' ? 'co-op' : game.play_mode === 'competitive' ? 'competitive' : null
  ].filter(Boolean).join(' · ');
}

function formatSyncMoment(value: string | null) {
  if (!value) return 'nog niet gesynchroniseerd';
  return new Intl.DateTimeFormat('nl-BE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export default function CollectionManager() {
  const [games, setGames] = useState<CollectionGameDto[]>([]);
  const [username, setUsername] = useState('');
  const [syncedUsername, setSyncedUsername] = useState<string | null>(null);
  const [xmlInput, setXmlInput] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ total: number; processed: number }>({ total: 0, processed: 0 });
  const syncPollTimer = useRef<number | null>(null);

  async function load() {
    const data = await api<CollectionBundle>('/api/collection/games');
    setGames(data.games);
    if (data.sync_state?.bgg_username) setUsername(data.sync_state.bgg_username);
    setSyncedUsername(data.sync_state?.bgg_username ?? null);
    if (data.sync_state?.last_status) setMessage(data.sync_state.last_status);
    setSyncing(Boolean(data.sync_state?.sync_in_progress));
    setLastSyncedAt(data.sync_state?.last_synced_at ?? null);
    setSyncProgress({
      total: data.sync_state?.total_games ?? 0,
      processed: data.sync_state?.processed_games ?? 0
    });
    return data;
  }

  function confirmsReplacingCollection(nextUsername: string) {
    const trimmedUsername = nextUsername.trim();
    const hasBggGames = games.some((game) => game.source === 'bgg');
    const replacingDifferentCollection = Boolean(
      hasBggGames
      && syncedUsername
      && syncedUsername.localeCompare(trimmedUsername, undefined, { sensitivity: 'accent' }) !== 0
    );

    if (!replacingDifferentCollection) return true;

    return confirm(
      `Je hebt momenteel al een gesynchroniseerde collectie van ${syncedUsername}. Als je doorgaat, wordt die BGG-collectie verwijderd en vervangen door ${trimmedUsername}.`
    );
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Collectie laden mislukt.'))
      .finally(() => setLoading(false));

    return () => {
      if (syncPollTimer.current) window.clearTimeout(syncPollTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!syncing) {
      if (syncPollTimer.current) window.clearTimeout(syncPollTimer.current);
      return;
    }

    syncPollTimer.current = window.setTimeout(async () => {
      try {
        const data = await load();
        if (!data.sync_state?.sync_in_progress && syncPollTimer.current) {
          window.clearTimeout(syncPollTimer.current);
          syncPollTimer.current = null;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Collectie laden mislukt.');
      }
    }, SYNC_POLL_INTERVAL_MS);

    return () => {
      if (syncPollTimer.current) window.clearTimeout(syncPollTimer.current);
    };
  }, [syncing]);

  const filteredGames = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter((game) => game.title.toLowerCase().includes(q));
  }, [games, query]);

  async function syncBgg(event: React.FormEvent) {
    event.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Geef eerst je BoardGameGeek username in.');
      return;
    }
    if (!confirmsReplacingCollection(trimmedUsername)) return;

    setSyncing(true);
    setError(null);
    setMessage('Synchronisatie gestart...');
    try {
      const data = await api<{ started: boolean; pending: boolean; message: string }>('/api/collection/sync', {
        method: 'POST',
        body: JSON.stringify({
          username: trimmedUsername,
          replace_existing: syncedUsername !== null && syncedUsername.localeCompare(trimmedUsername, undefined, { sensitivity: 'accent' }) !== 0
        })
      });
      setMessage(data.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'BGG synchronisatie mislukt.');
      setSyncing(false);
    }
  }

  async function importXml(event: React.FormEvent) {
    event.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Geef eerst je BoardGameGeek username in.');
      return;
    }
    if (!confirmsReplacingCollection(trimmedUsername)) return;

    setSyncing(true);
    setError(null);
    setMessage('XML import gestart...');
    try {
      const data = await api<{ started: boolean; pending: boolean; message: string }>('/api/collection/sync', {
        method: 'POST',
        body: JSON.stringify({
          username: trimmedUsername,
          xml: xmlInput,
          replace_existing: syncedUsername !== null && syncedUsername.localeCompare(trimmedUsername, undefined, { sensitivity: 'accent' }) !== 0
        })
      });
      setXmlInput('');
      setMessage(data.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'XML importeren mislukt.');
      setSyncing(false);
    }
  }

  async function addManual(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api('/api/collection/games', { method: 'POST', body: JSON.stringify({ title: manualTitle }) });
      setManualTitle('');
      setMessage('Spel toegevoegd.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spel toevoegen mislukt.');
    }
  }

  async function hideGame(id: string) {
    if (!confirm('Dit spel verbergen uit je lokale lijst?')) return;
    await api(`/api/collection/games?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await load();
  }

  if (loading) return <section className="page-card p-5">Laden...</section>;

  return (
    <>
      <section className="page-card page-card-sky p-5">
        <h2 className="font-poster text-3xl uppercase leading-none text-slate-950">BGG collectie synchroniseren</h2>
        <p className="mt-3 text-sm text-slate-700">De sync draait op de achtergrond, haalt detaildata op via `thing?id=...&stats=1` in blokken van maximaal 20 spellen en bewaart thumbnails lokaal.</p>
        <form onSubmit={syncBgg} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="BGG username" className="neo-input min-w-0 flex-1" />
          <button disabled={syncing} className="neo-button neo-button-primary disabled:opacity-60">
            <RefreshCw size={18} className={`mr-2 inline ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchroniseren...' : 'Synchroniseer'}
          </button>
        </form>
        <p className="mt-3 text-sm text-slate-600">Elke gebruiker kan 1 BoardGameGeek-collectie koppelen. Een nieuwe username vervangt je vorige BGG-collectie.</p>
        <div className="neo-muted-panel mt-4 text-sm text-slate-700">
          <p><b>Laatst klaar:</b> {formatSyncMoment(lastSyncedAt)}</p>
          {syncProgress.total > 0 && syncing && <p className="mt-1"><b>Voortgang:</b> {Math.min(syncProgress.processed, syncProgress.total)}/{syncProgress.total} spellen</p>}
        </div>
        {message && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
        {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </section>

      <section className="page-card page-card-peach p-5">
        <h2 className="font-poster text-3xl uppercase leading-none text-slate-950">Manueel spel toevoegen</h2>
        <form onSubmit={addManual} className="mt-4 flex gap-2">
          <input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} placeholder="Spelnaam" className="neo-input min-w-0 flex-1" />
          <button className="neo-button neo-button-ghost">Toevoegen</button>
        </form>
      </section>

      <section className="page-card page-card-lime p-5">
        <h2 className="font-poster text-3xl uppercase leading-none text-slate-950">BGG XML plakken</h2>
        <p className="mt-3 text-sm text-slate-700">Plak hier een collectie-XML. De service haalt daarna zelf de detailvelden op via de BGG `thing` endpoint en verrijkt alles in de achtergrond.</p>
        <form onSubmit={importXml} className="mt-4 space-y-3">
          <textarea
            value={xmlInput}
            onChange={(event) => setXmlInput(event.target.value)}
            placeholder="<items>...</items>"
            className="neo-input min-h-40 font-mono text-sm"
          />
          <button disabled={syncing || !xmlInput.trim()} className="neo-button neo-button-ghost disabled:opacity-60">
            <RefreshCw size={18} className={`mr-2 inline ${syncing ? 'animate-spin' : ''}`} />
            XML importeren
          </button>
        </form>
      </section>

      <section className="page-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-poster text-3xl uppercase leading-none text-slate-950">Lokale spellenlijst</h2>
            <p className="mt-2 text-sm text-slate-600">{games.length} spel{games.length === 1 ? '' : 'len'} beschikbaar voor nieuwe spelavonden.</p>
          </div>
          <div className="relative">
            <Search size={17} className="absolute left-3 top-3.5 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zoeken" className="neo-input w-full py-3 pl-9 pr-4 sm:w-64" />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {filteredGames.map((game) => {
            const imageUrl = listImageUrl(game);
            return (
              <article key={game.id} className="page-subcard flex gap-3 p-3">
                {imageUrl ? <img src={imageUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-2xl">??</div>}
                <div className="min-w-0 flex-1">
                  <div className="flex gap-2">
                    <h3 className="flex-1 font-black">{game.title}</h3>
                    <button onClick={() => hideGame(game.id)} className="rounded-xl p-2 text-slate-500 transition hover:bg-white" title="Verbergen"><Trash2 size={17} /></button>
                  </div>
                  <p className="text-sm text-slate-600">{formatMeta(game) || (game.source === 'manual' ? 'Manueel toegevoegd' : 'Geen extra info')}</p>
                </div>
              </article>
            );
          })}
          {!filteredGames.length && (
            <div className="neo-muted-panel text-center text-slate-500 sm:col-span-2">
              {games.length
                ? 'Geen spellen gevonden.'
                : 'Je collectie bevat nog geen spellen. Synchroniseer hierboven je BGG-collectie of voeg manueel een spel toe.'}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

