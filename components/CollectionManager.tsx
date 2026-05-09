'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { DEFAULT_BGG_USERNAME } from '@/lib/defaults';
import { CollectionBundle, CollectionGameDto } from '@/lib/types';

function formatMeta(game: CollectionGameDto) {
  return [
    game.year_published,
    game.min_players && game.max_players ? `${game.min_players}-${game.max_players} spelers` : null,
    game.playing_time ? `${game.playing_time} min` : null,
    game.bgg_weight ? `weight ${game.bgg_weight.toFixed(1)}` : null,
    game.bgg_rating ? `BGG ${game.bgg_rating.toFixed(1)}` : null
  ].filter(Boolean).join(' · ');
}

export default function CollectionManager() {
  const [games, setGames] = useState<CollectionGameDto[]>([]);
  const [username, setUsername] = useState(DEFAULT_BGG_USERNAME);
  const [xmlInput, setXmlInput] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    try {
      const data = await api<CollectionBundle>('/api/collection/games');
      setGames(data.games);
      if (data.sync_state?.bgg_username) setUsername(data.sync_state.bgg_username);
      if (data.sync_state?.last_status) setMessage(data.sync_state.last_status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Collectie laden mislukt.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filteredGames = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter((game) => game.title.toLowerCase().includes(q));
  }, [games, query]);

  async function syncBgg(event: React.FormEvent) {
    event.preventDefault();
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const data = await api<{ imported: number; pending: boolean; message: string }>('/api/collection/sync', {
        method: 'POST',
        body: JSON.stringify({ username })
      });
      setMessage(data.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'BGG synchronisatie mislukt.');
    } finally {
      setSyncing(false);
    }
  }

  async function importXml(event: React.FormEvent) {
    event.preventDefault();
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const data = await api<{ imported: number; pending: boolean; message: string }>('/api/collection/sync', {
        method: 'POST',
        body: JSON.stringify({ username, xml: xmlInput })
      });
      setXmlInput('');
      setMessage(data.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'XML importeren mislukt.');
    } finally {
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

  if (loading) return <section className="rounded-3xl bg-white p-5 shadow-soft">Laden...</section>;

  return (
    <>
      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">BGG collectie synchroniseren</h2>
        <p className="mt-2 text-sm text-slate-500">Dit gebeurt buiten de spelavond-flow. Als BGG even traag is, probeer je later gewoon opnieuw.</p>
        <form onSubmit={syncBgg} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="BGG username" className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400" />
          <button disabled={syncing} className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-60">
            <RefreshCw size={18} className={`mr-2 inline ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchroniseren...' : 'Synchroniseer'}
          </button>
        </form>
        {message && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
        {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">Manueel spel toevoegen</h2>
        <form onSubmit={addManual} className="mt-4 flex gap-2">
          <input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} placeholder="Spelnaam" className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400" />
          <button className="rounded-2xl border border-slate-200 px-5 font-bold">Toevoegen</button>
        </form>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">BGG XML plakken</h2>
        <p className="mt-2 text-sm text-slate-500">Plak hier de XML van de publieke BGG collectie-link. De spellen worden opgeslagen in de lokale database.</p>
        <form onSubmit={importXml} className="mt-4 space-y-3">
          <textarea
            value={xmlInput}
            onChange={(event) => setXmlInput(event.target.value)}
            placeholder="<items>...</items>"
            className="min-h-40 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm outline-none focus:border-slate-400"
          />
          <button disabled={syncing || !xmlInput.trim()} className="rounded-2xl border border-slate-200 px-5 py-3 font-bold disabled:opacity-60">
            <RefreshCw size={18} className={`mr-2 inline ${syncing ? 'animate-spin' : ''}`} />
            XML importeren
          </button>
        </form>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black">Lokale spellenlijst</h2>
            <p className="text-sm text-slate-500">{games.length} spel{games.length === 1 ? '' : 'len'} beschikbaar voor nieuwe spelavonden.</p>
          </div>
          <div className="relative">
            <Search size={17} className="absolute left-3 top-3.5 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zoeken" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 outline-none focus:border-slate-400 sm:w-64" />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {filteredGames.map((game) => (
            <article key={game.id} className="flex gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-3">
              {game.image_url ? <img src={game.image_url} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-2xl">🎲</div>}
              <div className="min-w-0 flex-1">
                <div className="flex gap-2">
                  <h3 className="flex-1 font-black">{game.title}</h3>
                  <button onClick={() => hideGame(game.id)} className="rounded-xl p-2 text-slate-500 hover:bg-white" title="Verbergen"><Trash2 size={17} /></button>
                </div>
                <p className="text-sm text-slate-500">{formatMeta(game) || (game.source === 'manual' ? 'Manueel toegevoegd' : 'Geen extra info')}</p>
              </div>
            </article>
          ))}
          {!filteredGames.length && <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-slate-500 sm:col-span-2">Geen spellen gevonden.</p>}
        </div>
      </section>
    </>
  );
}
