'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { CollectionBundle, CollectionGameDto } from '@/lib/types';

export default function BggGameSearch({ sessionId, playerId, onAdded }: { sessionId: string; playerId: string | null; onAdded: () => void }) {
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState<CollectionGameDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<CollectionBundle>('/api/collection/games')
      .then((data) => setCollection(data.games))
      .catch((err) => setError(err instanceof Error ? err.message : 'Spellenlijst laden mislukt.'))
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return collection.slice(0, 50);
    return collection.filter((game) => game.title.toLowerCase().includes(q)).slice(0, 50);
  }, [collection, query]);

  async function search(event: React.FormEvent) {
    event.preventDefault();
  }

  async function addFromCollection(game: CollectionGameDto) {
    if (!playerId) return;
    setAddingId(game.id);
    setError(null);
    try {
      await api(`/api/sessions/${sessionId}/games`, {
        method: 'POST',
        body: JSON.stringify({
          collection_game_id: game.id,
          added_by: playerId
        })
      });
      setQuery('');
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toevoegen mislukt.');
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div>
      <form onSubmit={search} className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zoek in de collectie van gezelschapspelgroep."
          className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
        />
        <button disabled={loading || !playerId} className="rounded-2xl bg-slate-950 px-4 font-bold text-white disabled:opacity-50" title={!playerId ? 'Vul eerst je naam in' : undefined}>
          <Search size={20} />
        </button>
      </form>
      {error && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!loading && !results.length && <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">Geen spel gevonden in de gesynchroniseerde lijst.</p>}
      {!loading && !query.trim() && !!results.length && <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Alle spellen uit de lijst</p>}
      {!!results.length && (
        <div className="mt-3 space-y-2">
          {results.map((game) => (
            <button
              key={game.id}
              onClick={() => addFromCollection(game)}
              disabled={addingId !== null}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left disabled:opacity-50"
              type="button"
            >
              {game.image_url ? <img src={game.image_url} alt="" className="h-11 w-11 rounded-xl object-cover" /> : <div className="h-11 w-11 rounded-xl bg-slate-100" />}
              <span className="min-w-0 flex-1">
                <b className="block truncate">{game.title}</b>
                {game.year_published ? <span className="text-sm text-slate-500">{game.year_published}</span> : null}
              </span>
              {addingId === game.id ? <span className="text-sm text-slate-500">toevoegen...</span> : <Plus size={18} className="text-slate-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
