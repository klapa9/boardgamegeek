'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { BggGameDetails, BggSearchResult } from '@/lib/types';

export default function BggGameSearch({ sessionId, playerId, onAdded }: { sessionId: string; playerId: string | null; onAdded: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BggSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ results: BggSearchResult[] }>(`/api/bgg/search?q=${encodeURIComponent(query)}`);
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zoeken mislukt.');
    } finally {
      setLoading(false);
    }
  }

  async function addFromBgg(result: BggSearchResult) {
    if (!playerId) return;
    setAddingId(result.bggId);
    setError(null);
    try {
      const details = await api<BggGameDetails>(`/api/bgg/thing/${result.bggId}`);
      await api(`/api/sessions/${sessionId}/games`, {
        method: 'POST',
        body: JSON.stringify({
          title: details.title,
          bgg_id: details.bggId,
          year_published: details.yearPublished,
          image_url: details.imageUrl,
          min_players: details.minPlayers,
          max_players: details.maxPlayers,
          playing_time: details.playingTime,
          bgg_rating: details.averageRating,
          bgg_weight: details.averageWeight,
          mechanics: details.mechanics,
          play_mode: details.playMode,
          community_players: details.communityPlayers,
          added_by: playerId
        })
      });
      setQuery('');
      setResults([]);
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
          placeholder="Zoek op BoardGameGeek"
          className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
        />
        <button disabled={loading || !playerId} className="rounded-2xl bg-slate-950 px-4 font-bold text-white disabled:opacity-50" title={!playerId ? 'Vul eerst je naam in' : undefined}>
          <Search size={20} />
        </button>
      </form>
      {error && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!!results.length && (
        <div className="mt-3 space-y-2">
          {results.map((result) => (
            <button
              key={result.bggId}
              onClick={() => addFromBgg(result)}
              disabled={addingId !== null}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left disabled:opacity-50"
            >
              <b>{result.title}</b>{result.yearPublished ? <span className="text-slate-500"> · {result.yearPublished}</span> : null}
              {addingId === result.bggId && <span className="ml-2 text-sm text-slate-500">toevoegen...</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
