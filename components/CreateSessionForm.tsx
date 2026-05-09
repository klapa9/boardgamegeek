'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { CollectionBundle, CollectionGameDto } from '@/lib/types';

function meta(game: CollectionGameDto) {
  return [
    game.year_published,
    game.community_players.length ? `community ${game.community_players.join(', ')} spelers` : game.min_players && game.max_players ? `${game.min_players}-${game.max_players} spelers` : null,
    game.playing_time ? `${game.playing_time} min` : null,
    game.bgg_weight ? `complexiteit ${game.bgg_weight.toFixed(1)}` : null,
    game.play_mode === 'cooperative' ? 'co-op' : game.play_mode === 'competitive' ? 'competitive' : null
  ].filter(Boolean).join(' · ');
}

export default function CreateSessionForm() {
  const router = useRouter();
  const [title, setTitle] = useState('Spelavond');
  const [collection, setCollection] = useState<CollectionGameDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [manualGames, setManualGames] = useState('');
  const [query, setQuery] = useState('');
  const [loadingCollection, setLoadingCollection] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<CollectionBundle>('/api/collection/games')
      .then((data) => setCollection(data.games))
      .catch(() => setCollection([]))
      .finally(() => setLoadingCollection(false));
  }, []);

  const filteredCollection = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return collection.slice(0, 80);
    return collection.filter((game) => game.title.toLowerCase().includes(q)).slice(0, 80);
  }, [collection, query]);

  function toggleGame(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
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
          collection_game_ids: selectedIds,
          manual_games: manualGames.split('\n').map((line) => line.trim()).filter(Boolean)
        })
      });
      localStorage.setItem(`gsk-admin-${data.session.id}`, data.admin_token);
      router.push(`/s/${data.session.id}?admin=${data.admin_token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sessie maken mislukt.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={createSession} className="mt-8 space-y-5">
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

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="block text-sm font-semibold text-slate-700">Kies spellen uit je lokale lijst</label>
          <Link href="/games" className="text-sm font-bold text-slate-500 underline">Mijn spellen</Link>
        </div>
        <div className="relative mb-3">
          <Search size={17} className="absolute left-3 top-3.5 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zoek in lokale spellenlijst" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 outline-none focus:border-slate-400" />
        </div>
        <div className="max-h-80 space-y-2 overflow-auto rounded-3xl border border-slate-100 bg-slate-50 p-2">
          {loadingCollection && <p className="px-3 py-4 text-center text-sm text-slate-500">Spellen laden...</p>}
          {!loadingCollection && filteredCollection.map((game) => {
            const selected = selectedIds.includes(game.id);
            return (
              <button type="button" key={game.id} onClick={() => toggleGame(game.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${selected ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-100 bg-white'}`}>
                {game.image_url ? <img src={game.image_url} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl">🎲</div>}
                <span className="min-w-0 flex-1"><b className="block truncate">{game.title}</b><span className={`text-sm ${selected ? 'text-slate-300' : 'text-slate-500'}`}>{meta(game) || 'Geen extra info'}</span></span>
                <span className="font-black">{selected ? '✓' : '+'}</span>
              </button>
            );
          })}
          {!loadingCollection && !filteredCollection.length && <p className="px-3 py-6 text-center text-sm text-slate-500">Geen spellen gevonden. Ga naar Mijn spellen om te synchroniseren of voeg hieronder manueel toe.</p>}
        </div>
        <p className="mt-2 text-sm text-slate-500">Geselecteerd: <b>{selectedIds.length}</b></p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Extra manuele spellen, optioneel</label>
        <textarea
          value={manualGames}
          onChange={(event) => setManualGames(event.target.value)}
          className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
          placeholder={'Heat\nAzul'}
        />
        <p className="mt-2 text-sm text-slate-500">Eén spel per lijn. BGG wordt hier niet gebruikt.</p>
      </div>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <button disabled={loading} className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-60">
        {loading ? 'Spelavond maken...' : 'Spelavond maken'}
      </button>
    </form>
  );
}
