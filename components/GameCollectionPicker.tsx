'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Dice5, Loader2, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { api } from '@/lib/api';
import { CollectionBundle, CollectionGameDto, CollectionGroupDto, CollectionSyncStateDto } from '@/lib/types';
import GameFilterControls from '@/components/GameFilterControls';
import { emptyGameFilters, GameFilterState, hasActiveGameFilters, matchesGameFilters, mechanicOptions, playerCountOptions } from '@/lib/gameFilters';

const PAGE_SIZE = 30;

function normalizeTitle(title: string) {
  return title.trim().toLowerCase();
}

function listImageUrl(game: CollectionGameDto) {
  return game.thumbnail_url ?? game.image_url;
}

function gameMeta(game: CollectionGameDto) {
  return [
    game.year_published,
    game.community_players.length ? `aanbevolen: ${game.community_players.join(', ')} spelers` : game.min_players && game.max_players ? `${game.min_players}-${game.max_players} spelers` : null,
    game.playing_time ? `${game.playing_time} min` : null,
    game.bgg_weight ? `complexiteit ${game.bgg_weight.toFixed(1)}` : null,
    game.bgg_rating ? `BGG ${game.bgg_rating.toFixed(1)}` : null,
    game.play_mode === 'cooperative' ? 'co-op' : game.play_mode === 'competitive' ? 'competitive' : null
  ].filter(Boolean).join(' / ');
}

type GameCollectionPickerProps = {
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  disabledIds?: string[];
  disabledTitles?: string[];
  disabledBggIds?: number[];
  autoSelectTitles?: string[];
  autoSelectBggIds?: number[];
  disabledReason?: string;
  title?: string;
  subtitle?: string;
  emptyText?: string;
  maxHeightClassName?: string;
  searchPlaceholder?: string;
};

export default function GameCollectionPicker({
  selectedIds,
  onSelectedIdsChange,
  disabledIds = [],
  disabledTitles = [],
  disabledBggIds = [],
  autoSelectTitles = [],
  autoSelectBggIds = [],
  disabledReason = 'Dit spel staat al in de lijst.',
  title = 'Kies spellen uit je collectie',
  subtitle = 'Je kan meerdere spellen selecteren.',
  emptyText = 'Geen spellen gevonden.',
  maxHeightClassName = 'max-h-80',
  searchPlaceholder = 'Zoek in je collectie...'
}: GameCollectionPickerProps) {
  const [collection, setCollection] = useState<CollectionGameDto[]>([]);
  const [groups, setGroups] = useState<CollectionGroupDto[]>([]);
  const [syncState, setSyncState] = useState<CollectionSyncStateDto | null>(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<GameFilterState>(emptyGameFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [loadingCollection, setLoadingCollection] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<number | null>(null);
  const autoSelectApplied = useRef(false);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const disabledIdSet = useMemo(() => new Set(disabledIds), [disabledIds]);
  const disabledTitleSet = useMemo(() => new Set(disabledTitles.map(normalizeTitle)), [disabledTitles]);
  const disabledBggIdSet = useMemo(() => new Set(disabledBggIds), [disabledBggIds]);
  const mechanics = useMemo(() => mechanicOptions(collection), [collection]);
  const playerCounts = useMemo(() => playerCountOptions(collection), [collection]);
  const activeFilterCount = useMemo(() => Object.values(filters).filter(Boolean).length, [filters]);

  useEffect(() => {
    api<CollectionBundle>('/api/collection/games')
      .then((data) => {
        setCollection(data.games);
        setGroups(data.groups);
        setSyncState(data.sync_state);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Spellenlijst laden mislukt.'))
      .finally(() => setLoadingCollection(false));
  }, []);

  useEffect(() => {
    autoSelectApplied.current = false;
  }, [autoSelectBggIds, autoSelectTitles]);

  const selectedGroupGameIds = useMemo(() => {
    if (!filters.groupId) return null;
    const group = groups.find((entry) => entry.id === filters.groupId);
    return group ? new Set(group.game_ids) : new Set<string>();
  }, [filters.groupId, groups]);

  const filteredCollection = useMemo(() => {
    const q = query.trim().toLowerCase();
    return collection.filter((game) => {
      if (q && !game.title.toLowerCase().includes(q)) return false;
      if (selectedGroupGameIds && !selectedGroupGameIds.has(game.id)) return false;
      return matchesGameFilters(game, filters);
    });
  }, [collection, filters, query, selectedGroupGameIds]);

  const visibleGames = useMemo(() => filteredCollection.slice(0, visibleCount), [filteredCollection, visibleCount]);
  const hiddenResultCount = Math.max(filteredCollection.length - visibleGames.length, 0);
  const hasDurationData = useMemo(() => collection.some((game) => game.playing_time !== null), [collection]);
  const hasComplexityData = useMemo(() => collection.some((game) => game.bgg_weight !== null), [collection]);
  const hasPlayModeData = useMemo(() => collection.some((game) => game.play_mode !== null), [collection]);
  const hasAnyFilterMetadata = playerCounts.length > 0 || hasDurationData || hasComplexityData || mechanics.length > 0 || hasPlayModeData;

  function isGameDisabled(game: CollectionGameDto) {
    return disabledIdSet.has(game.id) || disabledTitleSet.has(normalizeTitle(game.title)) || (game.bgg_id !== null && disabledBggIdSet.has(game.bgg_id));
  }

  const duplicateCount = useMemo(() => collection.filter((game) => isGameDisabled(game)).length, [collection, disabledIdSet, disabledTitleSet, disabledBggIdSet]);

  const selectedGames = useMemo(() => {
    return collection.filter((game) => selectedIdSet.has(game.id));
  }, [collection, selectedIdSet]);

  useEffect(() => {
    if (loadingCollection || autoSelectApplied.current) return;
    autoSelectApplied.current = true;
    if (!autoSelectTitles.length && !autoSelectBggIds.length) return;

    const titleSet = new Set(autoSelectTitles.map(normalizeTitle));
    const bggIdSet = new Set(autoSelectBggIds);
    const autoSelectedIds = collection
      .filter((game) => titleSet.has(normalizeTitle(game.title)) || (game.bgg_id !== null && bggIdSet.has(game.bgg_id)))
      .map((game) => game.id);

    if (!autoSelectedIds.length) return;
    onSelectedIdsChange(Array.from(new Set([...selectedIds, ...autoSelectedIds])));
  }, [autoSelectBggIds, autoSelectTitles, collection, loadingCollection, onSelectedIdsChange, selectedIds]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setActiveIndex(0);
    setSearching(Boolean(query.trim()));
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => setSearching(false), 180);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [filters, query]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(filteredCollection.length - 1, 0)));
  }, [filteredCollection.length]);

  function toggleGame(id: string) {
    const game = collection.find((item) => item.id === id);
    if (!game || isGameDisabled(game)) return;
    if (selectedIdSet.has(id)) {
      onSelectedIdsChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectedIdsChange([...selectedIds, id]);
    }
  }

  function clearSelection() {
    onSelectedIdsChange([]);
  }

  function loadMore() {
    setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredCollection.length));
  }

  function handleListScroll() {
    const list = listRef.current;
    if (!list || !hiddenResultCount) return;
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 96) loadMore();
  }

  function handleKeyboard(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!visibleGames.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => {
        const nextIndex = Math.min(index + 1, visibleGames.length - 1);
        document.getElementById(`collection-game-${visibleGames[nextIndex]?.id}`)?.scrollIntoView({ block: 'nearest' });
        return nextIndex;
      });
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => {
        const nextIndex = Math.max(index - 1, 0);
        document.getElementById(`collection-game-${visibleGames[nextIndex]?.id}`)?.scrollIntoView({ block: 'nearest' });
        return nextIndex;
      });
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const game = visibleGames[activeIndex];
      if (game) toggleGame(game.id);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label className="block text-sm font-semibold text-slate-700">{title}</label>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        {!!selectedIds.length && (
          <button type="button" onClick={clearSelection} className="neo-button neo-button-ghost text-sm text-slate-600">
            <X size={15} className="mr-1 inline" /> Selectie leegmaken
          </button>
        )}
      </div>

      <div className="mb-3 flex items-stretch gap-2">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3 top-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="neo-input w-full py-3 pl-9 pr-10"
          />
          {(searching || loadingCollection) && <Loader2 size={17} className="absolute right-3 top-3.5 animate-spin text-slate-400" />}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-controls="collection-filters"
          aria-label={filtersOpen ? 'Filters verbergen' : 'Filters tonen'}
          title={filtersOpen ? 'Filters verbergen' : 'Filters tonen'}
          className={`inline-flex min-w-[3.25rem] items-center justify-center rounded-2xl border-2 px-3 transition ${filtersOpen || hasActiveGameFilters(filters) ? 'border-slate-950 bg-[#172036] text-white' : 'border-slate-950/10 bg-white/80 text-slate-600 hover:bg-white'}`}
        >
          <span className="relative inline-flex">
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-black text-white">
                {activeFilterCount}
              </span>
            )}
          </span>
        </button>
      </div>

      {filtersOpen && (
        <div id="collection-filters" className="mb-3">
          <GameFilterControls
            filters={filters}
            mechanics={mechanics}
            playerCounts={playerCounts}
            groups={groups}
            hasDurationData={hasDurationData}
            hasComplexityData={hasComplexityData}
            hasPlayModeData={hasPlayModeData}
            onChange={setFilters}
          />
          {!loadingCollection && !hasAnyFilterMetadata && (
            <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Filters zijn momenteel beperkt, omdat je lokale collectie nog geen speelduur-, spelers- of complexiteitsdata bevat.
              {syncState?.last_status ? ` Laatste syncstatus: ${syncState.last_status}` : ''}
            </p>
          )}
        </div>
      )}

      {error && <p className="mb-3 mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div
        ref={listRef}
        onScroll={handleListScroll}
        onKeyDown={handleKeyboard}
        tabIndex={0}
        role="listbox"
        aria-label={title}
        aria-activedescendant={visibleGames[activeIndex] ? `collection-game-${visibleGames[activeIndex].id}` : undefined}
        className={`${maxHeightClassName} mt-3 space-y-2 overflow-auto rounded-3xl border-2 border-slate-950/10 bg-[rgba(255,255,255,0.6)] p-2 outline-none focus:border-slate-950/30 focus:ring-2 focus:ring-sky-100`}
      >
        {loadingCollection && (
          <div className="space-y-2 px-1 py-1">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex animate-pulse items-center gap-3 rounded-2xl border-2 border-slate-100 bg-white p-3">
                <div className="h-12 w-12 rounded-xl bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-slate-100" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loadingCollection && searching && <p className="px-3 py-3 text-center text-sm text-slate-500">Zoeken...</p>}
        {!loadingCollection && visibleGames.map((game, index) => {
          const selected = selectedIdSet.has(game.id);
          const disabled = isGameDisabled(game);
          const active = index === activeIndex;
          const imageUrl = listImageUrl(game);
          return (
            <button
              id={`collection-game-${game.id}`}
              type="button"
              key={game.id}
              onClick={() => !disabled && toggleGame(game.id)}
              onFocus={() => setActiveIndex(index)}
              disabled={disabled}
              title={disabled ? disabledReason : undefined}
              role="option"
              aria-selected={selected}
              className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition disabled:cursor-not-allowed ${selected ? 'border-slate-950 bg-[#172036] text-white' : disabled ? 'border-amber-100 bg-amber-50/80 text-slate-500' : 'border-slate-950/10 bg-white hover:border-slate-950/25'} ${active ? 'ring-2 ring-sky-200' : ''}`}
            >
              {imageUrl ? <img src={imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><Dice5 size={22} /></div>}
              <span className="min-w-0 flex-1">
                <b className="block truncate">{game.title}</b>
                <span className={`block truncate text-sm ${selected ? 'text-slate-300' : 'text-slate-600'}`}>{gameMeta(game) || 'Geen extra info'}</span>
                {disabled && <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">{disabledReason}</span>}
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${disabled ? 'bg-amber-100 text-amber-900' : selected ? 'bg-white text-slate-950' : 'bg-slate-100 text-slate-600'}`}>
                {disabled ? 'al toegevoegd' : selected ? <Check size={17} /> : <Plus size={17} />}
              </span>
            </button>
          );
        })}
        {!loadingCollection && !!hiddenResultCount && (
          <button type="button" onClick={loadMore} className="neo-button neo-button-ghost flex w-full text-sm text-slate-700">
            <ChevronDown size={17} /> Nog {hiddenResultCount} laden
          </button>
        )}
        {!loadingCollection && !filteredCollection.length && (
          <div className="px-4 py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-300"><Search size={24} /></div>
            <p className="font-bold text-slate-700">{query.trim() ? 'Geen match in je collectie' : emptyText}</p>
            <p className="mt-1 text-sm text-slate-500">
              {query.trim()
                ? 'Controleer de spelling of probeer een kortere zoekterm.'
                : <>Voeg je spellen toe in je <Link href="/games" className="font-semibold text-slate-700 underline underline-offset-2">collectiepagina</Link>.</>}
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-1 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p><b>{filteredCollection.length}</b> resultaat{filteredCollection.length === 1 ? '' : 'en'}{hiddenResultCount ? `, ${visibleGames.length} zichtbaar` : ''}</p>
        {!!duplicateCount && <p><b>{duplicateCount}</b> al in deze spelavond</p>}
      </div>

      {!!selectedGames.length && (
        <div className="page-subcard-soft mt-3 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">Geselecteerde spellen <span className="text-slate-400">({selectedGames.length})</span></p>
            <button type="button" onClick={clearSelection} className="text-sm font-bold text-slate-500 hover:text-slate-800">Leegmaken</button>
          </div>
          <ul className="grid max-h-56 gap-2 overflow-auto sm:grid-cols-2">
            {selectedGames.map((game) => {
              const imageUrl = listImageUrl(game);
              return (
                <li key={game.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                  {imageUrl ? <img src={imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Dice5 size={18} /></div>}
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm">{game.title}</b>
                    <span className="block truncate text-xs text-slate-500">{gameMeta(game) || 'Geen extra info'}</span>
                  </span>
                  <button type="button" onClick={() => toggleGame(game.id)} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700" title="Uit selectie verwijderen">
                    <X size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

