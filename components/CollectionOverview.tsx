'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { CollectionBundle, CollectionGameDto } from '@/lib/types';

function formatMeta(game: CollectionGameDto) {
  return [
    game.year_published,
    game.community_players.length
      ? `community ${game.community_players.join(', ')} spelers`
      : game.min_players && game.max_players
        ? `${game.min_players}-${game.max_players} spelers`
        : null,
    game.playing_time ? `${game.playing_time} min` : null,
    game.bgg_weight ? `weight ${game.bgg_weight.toFixed(1)}` : null,
    game.bgg_rating ? `BGG ${game.bgg_rating.toFixed(1)}` : null,
    game.play_mode === 'cooperative' ? 'co-op' : game.play_mode === 'competitive' ? 'competitive' : null
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function CollectionOverview() {
  const [games, setGames] = useState<CollectionGameDto[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api<CollectionBundle>('/api/collection/games');
        setGames(data.games);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Collectie laden mislukt.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filteredGames = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter((game) => game.title.toLowerCase().includes(q));
  }, [games, query]);

  if (loading) return <section className="rounded-3xl bg-white p-5 shadow-soft">Laden...</section>;
  if (error) return <section className="rounded-3xl bg-white p-5 text-red-700 shadow-soft">{error}</section>;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black">Mijn gesynchroniseerde spellen</h2>
          <p className="text-sm text-slate-500">{games.length} spel{games.length === 1 ? '' : 'len'} in je collectie.</p>
        </div>
        <div className="relative">
          <Search size={17} className="absolute left-3 top-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoeken"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 outline-none focus:border-slate-400 sm:w-64"
          />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {filteredGames.map((game) => (
          <article key={game.id} className="flex gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-3">
            {game.image_url ? (
              <img src={game.image_url} alt="" className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-2xl">🎲</div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-black">{game.title}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {formatMeta(game) || (game.source === 'manual' ? 'Manueel toegevoegd' : 'Geen extra info')}
              </p>
            </div>
          </article>
        ))}
        {!filteredGames.length && (
          <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-slate-500 sm:col-span-2">Geen spellen gevonden.</p>
        )}
      </div>
    </section>
  );
}
