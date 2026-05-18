'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { geekTypeBadgeLabel } from '@/lib/geek-types';
import { CollectionBundle, CollectionGameDto } from '@/lib/types';
import CollectionBggSearch from '@/components/CollectionBggSearch';

function listImageUrl(game: CollectionGameDto) {
  return game.thumbnail_url ?? game.image_url;
}

function formatMeta(game: CollectionGameDto) {
  return [
    game.year_published,
    game.community_players.length
      ? `aanbevolen ${game.community_players.join(', ')} spelers`
      : game.min_players && game.max_players
        ? `${game.min_players}-${game.max_players} spelers`
        : null,
    game.playing_time ? `${game.playing_time} min` : null,
    game.bgg_weight ? `weight ${game.bgg_weight.toFixed(1)}` : null,
    game.bgg_rating ? `BGG ${game.bgg_rating.toFixed(1)}` : null
  ].filter(Boolean).join(' - ');
}

export default function CollectionManager() {
  const [games, setGames] = useState<CollectionGameDto[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncedUsername, setSyncedUsername] = useState<string | null>(null);

  async function loadBundle() {
    const data = await api<CollectionBundle>('/api/collection/games');
    setGames(data.games);
    setSyncedUsername(data.sync_state?.bgg_username ?? null);
    return data;
  }

  useEffect(() => {
    loadBundle()
      .catch((err) => setError(err instanceof Error ? err.message : 'Collectie laden mislukt.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredGames = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return games;
    return games.filter((game) => game.title.toLowerCase().includes(normalizedQuery));
  }, [games, query]);

  const gameIdsInCollection = useMemo(() => new Set(games.map((game) => game.bgg_id).filter((id): id is number => id !== null)), [games]);

  async function deleteGame(game: CollectionGameDto) {
    const warning = syncedUsername
      ? `Ben je zeker dat je "${game.title}" wil verwijderen? Je BoardGameGeek-collectie van ${syncedUsername} wordt niet automatisch aangepast. Het verschil met BGG wordt hier wel bijgehouden.`
      : `Ben je zeker dat je "${game.title}" wil verwijderen?`;

    if (!confirm(warning)) return;

    setDeletingId(game.id);
    setError(null);

    try {
      await api(`/api/collection/games?id=${encodeURIComponent(game.id)}`, { method: 'DELETE' });
      setMessage(`"${game.title}" is verwijderd uit je collectie.`);
      await loadBundle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spel verwijderen mislukt.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <section className="page-card p-5">Laden...</section>;

  return (
    <div className="space-y-5">
      <section className="page-card page-card-sky p-5">
        <div>
          <div>
            <h2 className="font-poster text-3xl uppercase leading-none text-slate-950">Spellen toevoegen</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-700">
              Voeg boardgames of roleplaygames toe aan je collectie.
            </p>
          </div>
        </div>

        {syncedUsername && (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Je collectie is gekoppeld aan BGG gebruiker <b>{syncedUsername}</b>. Toevoegingen en verwijderingen op deze site passen je BGG collectie niet automatisch aan, maar het verschil wordt hier wel bijgehouden.
          </p>
        )}

        {(message || error) && (
          <div className="mt-4 space-y-2">
            {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          </div>
        )}

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <CollectionBggSearch
            existingBggIds={Array.from(gameIdsInCollection)}
            query={query}
            onQueryChange={setQuery}
            onGameAdded={async () => {
              await loadBundle();
            }}
            title="Zoekresultaten"
            subtitle="Kies bovenaan of je in BoardGameGeek of RPGGeek zoekt. Boardgame-expansions en niet-volledige RPG-items worden weggefilterd."
            showCatalogSelector
          />

          <div className="page-subcard p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black text-slate-900">Je collectie</h3>
              <span className="text-sm text-slate-500">{filteredGames.length} zichtbaar</span>
            </div>
            <div className="mt-3 grid gap-3">
              {filteredGames.length ? (
                filteredGames.map((game) => {
                  const imageUrl = listImageUrl(game);
                  return (
                    <article key={game.id} className="flex gap-3 rounded-2xl bg-white/80 p-3">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-sm font-bold text-slate-500">
                          Geen
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-black [overflow-wrap:anywhere]">{game.title}</h4>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                                {geekTypeBadgeLabel(game.geek_type)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{formatMeta(game) || 'Geen extra info'}</p>
                          </div>
                          <button
                            type="button"
                            disabled={deletingId === game.id}
                            onClick={() => void deleteGame(game)}
                            className="rounded-xl p-2 text-slate-500 transition hover:bg-white disabled:opacity-60"
                            title="Verwijderen"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="neo-muted-panel text-center text-slate-500">
                  {games.length ? 'Geen spellen gevonden voor deze zoekterm.' : 'Je collectie is nog leeg.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
