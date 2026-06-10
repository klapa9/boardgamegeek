'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dice5, Loader2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { GeekType, geekTypeBadgeLabel, geekTypeLabel } from '@/lib/geek-types';
import { BggSearchResult, CollectionGameDto } from '@/lib/types';

const BGG_RESULTS_PAGE_SIZE = 10;

function searchResultImageUrl(result: BggSearchResult) {
  return result.thumbnailUrl ?? result.imageUrl;
}

type CollectionBggSearchProps = {
  existingBggIds?: number[];
  query?: string;
  onQueryChange?: (value: string) => void;
  onGameAdded?: (game: CollectionGameDto | null, result: BggSearchResult) => Promise<void> | void;
  onResultSelect?: (result: BggSearchResult) => void;
  title?: string;
  subtitle?: string;
  emptyStateText?: string;
  containerClassName?: string;
  mode?: 'add' | 'select';
  selectedBggId?: number | null;
  showCatalogSelector?: boolean;
};

export default function CollectionBggSearch({
  existingBggIds = [],
  query: controlledQuery,
  onQueryChange,
  onGameAdded,
  onResultSelect,
  title = 'Spellen toevoegen',
  subtitle = 'Voeg spellen toe aan je collectie door te zoeken in de database van boardgamegeek.com. Expansions worden automatisch weggefilterd.',
  emptyStateText = 'Typ minstens 2 letters en druk op Enter of op Zoek om BoardGameGeek te doorzoeken.',
  containerClassName = 'page-subcard p-4',
  mode = 'add',
  selectedBggId = null,
  showCatalogSelector = false
}: CollectionBggSearchProps) {
  const [internalQuery, setInternalQuery] = useState('');
  const [geekType, setGeekType] = useState<GeekType>('boardgame');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BggSearchResult[]>([]);
  const [searchPage, setSearchPage] = useState(0);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultsCollapsed, setResultsCollapsed] = useState(false);

  const query = controlledQuery ?? internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;
  const gameIdsInCollection = useMemo(() => new Set(existingBggIds), [existingBggIds]);
  const selectedResult = useMemo(
    () => searchResults.find((result) => result.bggId === selectedBggId) ?? null,
    [searchResults, selectedBggId]
  );

  useEffect(() => {
    if (mode !== 'select') return;
    setResultsCollapsed(selectedBggId !== null);
  }, [mode, selectedBggId]);

  useEffect(() => {
    setSubmittedQuery('');
    setSearchResults([]);
    setSearchPage(0);
    setResultsCollapsed(false);
    setMessage(null);
    setError(null);
  }, [geekType]);

  async function searchBgg() {
    const trimmedQuery = query.trim();
    setSearchPage(0);
    setError(null);
    setMessage(null);
    setResultsCollapsed(false);

    if (trimmedQuery.length < 2) {
      setSubmittedQuery('');
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSubmittedQuery(trimmedQuery);
    setSearching(true);
    try {
      const data = await api<{ results: BggSearchResult[] }>(
        `/api/bgg/search?q=${encodeURIComponent(trimmedQuery)}&catalog=${encodeURIComponent(geekType)}`
      );
      setSearchResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Zoeken op ${geekTypeLabel(geekType)} mislukt.`);
    } finally {
      setSearching(false);
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void searchBgg();
  }

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

  async function addGame(result: BggSearchResult) {
    setAddingId(result.bggId);
    setError(null);
    setMessage(null);

    try {
      const data = await api<{ game: CollectionGameDto | null }>('/api/collection/games', {
        method: 'POST',
        body: JSON.stringify({ bgg_id: result.bggId, geek_type: result.geekType })
      });
      await onGameAdded?.(data.game, result);
      setMessage(`"${result.title}" is toegevoegd aan je collectie.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spel toevoegen mislukt.');
    } finally {
      setAddingId(null);
    }
  }

  return (
    <section className={containerClassName}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-black text-slate-900">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-700">{subtitle}</p>
        </div>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-500">
          {totalBggResults ? `${visibleBggStart}-${visibleBggEnd} van ${totalBggResults}` : '0 resultaten'}
        </span>
      </div>

      {(message || error) && (
        <div className="mt-4 space-y-2">
          {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {showCatalogSelector && (
          <label className="flex max-w-xs flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Zoek in</span>
            <select
              value={geekType}
              onChange={(event) => setGeekType(event.target.value === 'rpg' ? 'rpg' : 'boardgame')}
              className="neo-input w-full pr-8"
            >
              <option value="boardgame">Boardgames</option>
              <option value="rpg">Roleplaygames</option>
            </select>
          </label>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={17} className="absolute left-3 top-3.5 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={geekType === 'rpg' ? 'Zoek bijvoorbeeld Dungeons & Dragons' : 'Zoek bijvoorbeeld Catan'}
              enterKeyHint="search"
              className="neo-input w-full py-3 pl-9 pr-10"
            />
            {searching && <Loader2 size={17} className="absolute right-3 top-3.5 animate-spin text-slate-400" />}
          </div>
          <button
            type="button"
            onClick={() => void searchBgg()}
            disabled={searching || query.trim().length < 2}
            className="neo-button neo-button-primary w-full shrink-0 disabled:opacity-60 sm:w-auto"
          >
            Zoek
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {mode === 'select' && resultsCollapsed && selectedResult ? (
          <div className="rounded-2xl border-2 border-slate-950/10 bg-white/80 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              {searchResultImageUrl(selectedResult) ? (
                <img src={searchResultImageUrl(selectedResult)!} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <Dice5 size={22} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                    {geekTypeBadgeLabel(selectedResult.geekType)}
                  </span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gekozen zoekresultaat</p>
                <h3 className="mt-1 font-bold text-slate-900">{selectedResult.title}</h3>
                <p className="text-sm text-slate-500">
                  {geekTypeLabel(selectedResult.geekType)} #{selectedResult.bggId}
                  {selectedResult.yearPublished ? ` - ${selectedResult.yearPublished}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResultsCollapsed(false)}
                className="neo-button neo-button-ghost text-sm"
              >
                Ander resultaat kiezen
              </button>
            </div>
          </div>
        ) : searching ? (
          <div className="neo-muted-panel text-center text-slate-500">Zoeken...</div>
        ) : !submittedQuery ? (
          <div className="neo-muted-panel text-center text-slate-500">{emptyStateText}</div>
        ) : visibleBggResults.length ? (
          visibleBggResults.map((result) => {
            const alreadyInCollection = gameIdsInCollection.has(result.bggId);
            const selected = selectedBggId === result.bggId;
            const imageUrl = searchResultImageUrl(result);
            return (
              <article key={result.bggId} className="flex items-center gap-3 rounded-2xl bg-white/80 px-3 py-3">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <Dice5 size={22} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900">{result.title}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                      {geekTypeBadgeLabel(result.geekType)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {geekTypeLabel(result.geekType)} #{result.bggId}
                    {result.yearPublished ? ` - ${result.yearPublished}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={mode === 'add' ? (alreadyInCollection || addingId === result.bggId) : false}
                  onClick={() => mode === 'select' ? onResultSelect?.(result) : void addGame(result)}
                  className="neo-button neo-button-ghost text-sm disabled:opacity-60"
                >
                  {mode === 'select'
                    ? (selected ? 'Gekozen' : 'Kies dit spel')
                    : addingId === result.bggId
                      ? 'Toevoegen...'
                      : alreadyInCollection
                        ? 'Al toegevoegd'
                        : 'Voeg toe'}
                </button>
              </article>
            );
          })
        ) : (
          <div className="neo-muted-panel text-center text-slate-500">Geen BGG resultaten gevonden.</div>
        )}
      </div>

      {!!visibleBggResults.length && !(mode === 'select' && resultsCollapsed && selectedResult) && (
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
    </section>
  );
}
