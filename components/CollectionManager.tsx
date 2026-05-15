'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { BggSearchResult, CollectionBundle, CollectionGameDto } from '@/lib/types';

const BGG_RESULTS_PAGE_SIZE = 10;

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
  const [searchResults, setSearchResults] = useState<BggSearchResult[]>([]);
  const [searchPage, setSearchPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncedUsername, setSyncedUsername] = useState<string | null>(null);
  const searchTimer = useRef<number | null>(null);

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

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    setSearchPage(0);

    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimer.current = window.setTimeout(() => {
      api<{ results: BggSearchResult[] }>(`/api/bgg/search?q=${encodeURIComponent(trimmedQuery)}`)
        .then((data) => setSearchResults(data.results))
        .catch((err) => setError(err instanceof Error ? err.message : 'Zoeken op BoardGameGeek mislukt.'))
        .finally(() => setSearching(false));
    }, 250);

    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [query]);

  const filteredGames = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return games;
    return games.filter((game) => game.title.toLowerCase().includes(normalizedQuery));
  }, [games, query]);

  const visibleBggResults = useMemo(() => {
    const start = searchPage * BGG_RESULTS_PAGE_SIZE;
    return searchResults.slice(start, start + BGG_RESULTS_PAGE_SIZE);
  }, [searchPage, searchResults]);

  const totalBggResults = searchResults.length;
  const visibleBggStart = totalBggResults ? searchPage * BGG_RESULTS_PAGE_SIZE + 1 : 0;
  const visibleBggEnd = totalBggResults
    ? Math.min((searchPage + 1) * BGG_RESULTS_PAGE_SIZE, totalBggResults)
    : 0;
  const canGoToPreviousBggPage = searchPage > 0;
  const canGoToNextBggPage = visibleBggEnd < totalBggResults;

  const gameIdsInCollection = useMemo(() => new Set(games.map((game) => game.bgg_id).filter((id): id is number => id !== null)), [games]);

  async function addGame(result: BggSearchResult) {
    setAddingId(result.bggId);
    setError(null);

    try {
      await api('/api/collection/games', {
        method: 'POST',
        body: JSON.stringify({ bgg_id: result.bggId })
      });
      setMessage(`"${result.title}" is toegevoegd aan je collectie.`);
      await loadBundle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spel toevoegen mislukt.');
    } finally {
      setAddingId(null);
    }
  }

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
              Voeg spellen toe aan je collectie door te zoeken in de database van boardgamegeek.com.
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

        <div className="relative mt-4">
          <Search size={17} className="absolute left-3 top-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek bijvoorbeeld Catan"
            className="neo-input w-full py-3 pl-9 pr-10"
          />
          {searching && <Loader2 size={17} className="absolute right-3 top-3.5 animate-spin text-slate-400" />}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="page-subcard p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black text-slate-900">BGG zoekresultaten</h3>
              <span className="text-sm text-slate-500">
                {totalBggResults ? `${visibleBggStart}-${visibleBggEnd} van ${totalBggResults}` : '0 resultaten'}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {!query.trim() || query.trim().length < 2 ? (
                <div className="neo-muted-panel text-center text-slate-500">Typ minstens 2 letters om BoardGameGeek te doorzoeken.</div>
              ) : visibleBggResults.length ? (
                visibleBggResults.map((result) => {
                  const alreadyInCollection = gameIdsInCollection.has(result.bggId);
                  return (
                    <article key={result.bggId} className="flex items-center gap-3 rounded-2xl bg-white/80 px-3 py-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900">{result.title}</h4>
                        <p className="text-sm text-slate-500">
                          BGG #{result.bggId}
                          {result.yearPublished ? ` - ${result.yearPublished}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyInCollection || addingId === result.bggId}
                        onClick={() => void addGame(result)}
                        className="neo-button neo-button-ghost text-sm disabled:opacity-60"
                      >
                        {addingId === result.bggId ? 'Toevoegen...' : alreadyInCollection ? 'Al toegevoegd' : 'Voeg toe'}
                      </button>
                    </article>
                  );
                })
              ) : (
                <div className="neo-muted-panel text-center text-slate-500">Geen BGG resultaten gevonden.</div>
              )}
            </div>
            {!!visibleBggResults.length && (
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSearchPage((current) => Math.max(0, current - 1))}
                  disabled={!canGoToPreviousBggPage}
                  className="neo-button neo-button-ghost text-sm disabled:opacity-60"
                >
                  Vorige 10
                </button>
                <button
                  type="button"
                  onClick={() => setSearchPage((current) => current + 1)}
                  disabled={!canGoToNextBggPage}
                  className="neo-button neo-button-ghost text-sm disabled:opacity-60"
                >
                  Volgende 10
                </button>
              </div>
            )}
          </div>

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
                            <h4 className="font-black [overflow-wrap:anywhere]">{game.title}</h4>
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
