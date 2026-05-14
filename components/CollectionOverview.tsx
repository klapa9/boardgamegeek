'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import GameCollectionPicker from '@/components/GameCollectionPicker';
import { api } from '@/lib/api';
import { CollectionBundle, CollectionGameDto, CollectionGroupDto } from '@/lib/types';

const ALL_GAMES_GROUP_ID = '__all-games__';

type ViewGroup = CollectionGroupDto & {
  is_default: boolean;
};

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
    game.bgg_rating ? `BGG ${game.bgg_rating.toFixed(1)}` : null,
    game.play_mode === 'cooperative' ? 'co-op' : game.play_mode === 'competitive' ? 'competitive' : null
  ]
    .filter(Boolean)
    .join(' - ');
}

function buildGroups(games: CollectionGameDto[], groups: CollectionGroupDto[]): ViewGroup[] {
  return [
    {
      id: ALL_GAMES_GROUP_ID,
      name: 'Alle spellen',
      game_count: games.length,
      game_ids: games.map((game) => game.id),
      preview_games: games.slice(0, 4),
      created_at: new Date(0).toISOString(),
      is_default: true
    },
    ...groups.map((group) => ({
      ...group,
      is_default: false
    }))
  ];
}

function GameFan({ games }: { games: CollectionGameDto[] }) {
  if (!games.length) {
    return (
      <div className="flex h-28 items-center justify-center rounded-[1.75rem] border-2 border-dashed border-slate-950/20 bg-white/70 text-sm text-slate-500">
        Nog geen spellen
      </div>
    );
  }

  return (
    <div className="relative h-28 overflow-hidden rounded-[1.75rem] bg-[rgba(255,255,255,0.58)] px-4 py-3">
      {games.slice(0, 4).map((game, index) => {
        const imageUrl = listImageUrl(game);
        const rotation = (index - 1.5) * 6;

        return (
          <div
            key={game.id}
            className="absolute top-3 h-20 w-16 overflow-hidden rounded-2xl border border-white/80 bg-white shadow-sm"
            style={{
              left: `${16 + (index * 26)}px`,
              transform: `rotate(${rotation}deg)`,
              zIndex: index + 1
            }}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs font-bold text-slate-500">
                Geen
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type AddGamesModalProps = {
  group: ViewGroup;
  saving: boolean;
  selectedIds: string[];
  onClose: () => void;
  onSave: () => void;
  onSelectedIdsChange: (ids: string[]) => void;
};

function AddGamesModal({ group, saving, selectedIds, onClose, onSave, onSelectedIdsChange }: AddGamesModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-games-modal-title"
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border-4 border-slate-950 bg-[#fff7ec] shadow-[0_20px_0_0_rgba(15,23,42,0.2)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-slate-950/10 px-5 py-4 sm:px-6">
          <div>
            <h3 id="add-games-modal-title" className="font-poster text-3xl uppercase leading-none text-slate-950">
              Voeg spellen toe
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              Zoek en filter door je collectie en kies welke spellen in <b>{group.name}</b> horen.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-slate-500 transition hover:bg-white"
            aria-label="Modal sluiten"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-4 sm:px-6">
          <GameCollectionPicker
            selectedIds={selectedIds}
            onSelectedIdsChange={onSelectedIdsChange}
            title={`Spellen voor ${group.name}`}
            subtitle="Dit werkt hetzelfde als bij spelkeuze: je kan zoeken, filteren en meerdere spellen selecteren."
            emptyText="Geen spellen beschikbaar."
            maxHeightClassName="max-h-[50vh]"
          />
        </div>

        <div className="flex flex-col gap-3 border-t-2 border-slate-950/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-slate-600">
            <b>{selectedIds.length}</b> spel{selectedIds.length === 1 ? '' : 'len'} geselecteerd voor deze groep.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="neo-button neo-button-ghost">
              Annuleren
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="neo-button neo-button-primary disabled:opacity-60"
            >
              Opslaan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CollectionOverview() {
  const [games, setGames] = useState<CollectionGameDto[]>([]);
  const [groups, setGroups] = useState<CollectionGroupDto[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(ALL_GAMES_GROUP_ID);
  const [query, setQuery] = useState('');
  const [createName, setCreateName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showAddGamesModal, setShowAddGamesModal] = useState(false);
  const [modalSelectedIds, setModalSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadBundle(nextSelectedGroupId?: string) {
    const data = await api<CollectionBundle>('/api/collection/games');
    const nextGames = data.games;
    const nextGroups = data.groups;
    const nextViewGroups = buildGroups(nextGames, nextGroups);
    const availableGroupIds = new Set(nextViewGroups.map((group) => group.id));

    setGames(nextGames);
    setGroups(nextGroups);
    setSelectedGroupId((current) => {
      const wanted = nextSelectedGroupId ?? current;
      return availableGroupIds.has(wanted) ? wanted : ALL_GAMES_GROUP_ID;
    });
  }

  useEffect(() => {
    loadBundle()
      .catch((err) => setError(err instanceof Error ? err.message : 'Collectie laden mislukt.'))
      .finally(() => setLoading(false));
  }, []);

  const viewGroups = useMemo(() => buildGroups(games, groups), [games, groups]);
  const selectedGroup = useMemo(
    () => viewGroups.find((group) => group.id === selectedGroupId) ?? viewGroups[0],
    [selectedGroupId, viewGroups]
  );
  const gameById = useMemo(() => new Map(games.map((game) => [game.id, game])), [games]);
  const selectedGroupGames = useMemo(() => {
    if (!selectedGroup) return [];
    if (selectedGroup.is_default) return games;

    return selectedGroup.game_ids
      .map((gameId) => gameById.get(gameId) ?? null)
      .filter((game): game is CollectionGameDto => Boolean(game));
  }, [gameById, games, selectedGroup]);
  const visibleGroupGames = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return selectedGroupGames;
    return selectedGroupGames.filter((game) => game.title.toLowerCase().includes(normalizedQuery));
  }, [query, selectedGroupGames]);

  async function createGroup() {
    const nextName = createName.trim();
    if (!nextName) {
      setError('Geef eerst een naam in.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const data = await api<{ group: CollectionGroupDto }>('/api/collection/groups', {
        method: 'POST',
        body: JSON.stringify({ name: nextName, game_ids: [] })
      });

      setCreateName('');
      setShowCreateForm(false);
      setMessage(`"${data.group.name}" is toegevoegd.`);
      await loadBundle(data.group.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Groep aanmaken mislukt.');
    } finally {
      setCreating(false);
    }
  }

  async function renameSelectedGroup(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedGroup || selectedGroup.is_default) return;

    const nextName = renameValue.trim();
    if (!nextName) {
      setError('Geef eerst een naam in.');
      return;
    }

    setUpdatingGroup(true);
    setError(null);

    try {
      const data = await api<{ group: CollectionGroupDto }>(`/api/collection/groups/${selectedGroup.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: nextName })
      });

      setRenaming(false);
      setMessage(`"${data.group.name}" is bijgewerkt.`);
      await loadBundle(data.group.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Groepsnaam aanpassen mislukt.');
    } finally {
      setUpdatingGroup(false);
    }
  }

  async function deleteSelectedGroup() {
    if (!selectedGroup || selectedGroup.is_default) return;
    if (!confirm(`"${selectedGroup.name}" verwijderen?`)) return;

    setUpdatingGroup(true);
    setError(null);

    try {
      await api(`/api/collection/groups/${selectedGroup.id}`, { method: 'DELETE' });
      setRenaming(false);
      setShowAddGamesModal(false);
      setMessage(`"${selectedGroup.name}" is verwijderd.`);
      await loadBundle(ALL_GAMES_GROUP_ID);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verwijderen mislukt.');
    } finally {
      setUpdatingGroup(false);
    }
  }

  function openAddGamesModal() {
    if (!selectedGroup || selectedGroup.is_default) return;

    setModalSelectedIds(selectedGroup.game_ids);
    setShowAddGamesModal(true);
  }

  async function saveGroupGames() {
    if (!selectedGroup || selectedGroup.is_default) return;

    setUpdatingGroup(true);
    setError(null);

    try {
      await api(`/api/collection/groups/${selectedGroup.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ game_ids: modalSelectedIds })
      });

      setShowAddGamesModal(false);
      setMessage(`Spellen in "${selectedGroup.name}" zijn bijgewerkt.`);
      await loadBundle(selectedGroup.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spellen in groep aanpassen mislukt.');
    } finally {
      setUpdatingGroup(false);
    }
  }

  if (loading) return <section className="page-card p-5">Laden...</section>;
  if (!selectedGroup) return <section className="page-card p-5">Geen collectie gevonden.</section>;

  return (
    <>
      <div className="space-y-5">
        <section id="nieuwe-groep" className="page-card page-card-peach p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-poster text-3xl uppercase leading-none text-slate-950">Mijn collectie</h2>
              <p className="mt-2 text-sm text-slate-700">
                Maak je eigen groepen om je collectie te ordenen en snel spellen te kiezen voor een spelavond.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm((current) => !current)}
              className="neo-button neo-button-ghost self-start text-sm"
            >
              <Plus size={16} />
              Nieuwe groep
            </button>
          </div>

          {(message || error) && (
            <div className="mt-4 space-y-2">
              {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
              {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            </div>
          )}

          <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {viewGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  setSelectedGroupId(group.id);
                  setQuery('');
                  setRenaming(false);
                  setShowAddGamesModal(false);
                }}
                className={`min-w-0 overflow-hidden rounded-[2rem] border-4 p-4 text-left transition ${
                  selectedGroupId === group.id
                    ? 'border-slate-950 bg-[#172036] text-white shadow-[0_12px_0_0_#0f172a]'
                    : 'border-slate-950 bg-[rgba(255,255,255,0.82)] text-slate-950 shadow-[0_12px_0_0_rgba(23,32,54,0.14)] hover:-translate-y-1'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold uppercase tracking-[0.2em] ${selectedGroupId === group.id ? 'text-slate-300' : 'text-slate-400'}`}>
                      {group.is_default ? 'Standaard' : 'Eigen'}
                    </p>
                    <h3 className="mt-1 text-xl font-black [overflow-wrap:anywhere]">{group.name}</h3>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${selectedGroupId === group.id ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {group.game_count}
                  </span>
                </div>

                <div className="mt-4">
                  <GameFan games={group.preview_games} />
                </div>

                <p className={`mt-4 text-sm ${selectedGroupId === group.id ? 'text-slate-200' : 'text-slate-500'}`}>
                  {group.game_count === 0 ? 'Nog leeg' : `${group.game_count} spel${group.game_count === 1 ? '' : 'len'} in deze groep`}
                </p>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="min-w-0 overflow-hidden rounded-[2rem] border-4 border-dashed border-slate-950/25 bg-[rgba(255,255,255,0.7)] p-4 text-left transition hover:-translate-y-1 hover:border-slate-950/40 hover:bg-white"
            >
              <div className="flex h-full flex-col justify-between gap-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#84d7ff] text-slate-700 shadow-sm">
                  <Plus size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Nieuwe groep</h3>
                  <p className="mt-1 text-sm text-slate-500">Maak bijvoorbeeld 2 spelers, heavy eurogames of favorieten.</p>
                </div>
              </div>
            </button>
          </div>

          {showCreateForm && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void createGroup();
              }}
              className="page-subcard mt-4 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Bijvoorbeeld 2 spelers"
                  className="neo-input min-w-0 flex-1"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="neo-button neo-button-primary disabled:opacity-60"
                  >
                    Bewaren
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateName('');
                    }}
                    className="neo-button neo-button-ghost"
                  >
                    Sluiten
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>

        <section className="page-card page-card-sky p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-poster text-3xl uppercase leading-none text-slate-950">{selectedGroup.name}</h2>
              <p className="mt-2 text-sm text-slate-700">
                {selectedGroup.game_count} spel{selectedGroup.game_count === 1 ? '' : 'len'}
                {selectedGroup.is_default ? ' in je volledige collectie.' : ' in deze groep.'}
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative">
                <Search size={17} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={selectedGroup.is_default ? 'Zoek in je collectie' : 'Zoek in deze groep'}
                  className="neo-input w-full py-3 pl-9 pr-4 sm:w-72"
                />
              </div>

              {!selectedGroup.is_default && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={updatingGroup}
                    onClick={openAddGamesModal}
                    className="neo-button neo-button-primary text-sm disabled:opacity-60"
                  >
                    <Plus size={16} />
                    Voeg spellen toe aan deze groep
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenaming((current) => !current);
                      setRenameValue(selectedGroup.name);
                    }}
                    className="neo-button neo-button-ghost text-sm"
                  >
                    <Pencil size={16} />
                    Naam
                  </button>
                  <button
                    type="button"
                    disabled={updatingGroup}
                    onClick={() => void deleteSelectedGroup()}
                    className="neo-button neo-button-danger text-sm disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                    Verwijderen
                  </button>
                </div>
              )}
            </div>
          </div>

          {renaming && !selectedGroup.is_default && (
            <form onSubmit={renameSelectedGroup} className="page-subcard mt-4 flex flex-col gap-2 p-4 sm:flex-row">
              <input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                className="neo-input min-w-0 flex-1"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={updatingGroup} className="neo-button neo-button-primary disabled:opacity-60">
                  Opslaan
                </button>
                <button
                  type="button"
                  onClick={() => setRenaming(false)}
                  className="neo-button neo-button-ghost"
                >
                  Annuleren
                </button>
              </div>
            </form>
          )}

          <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
            {visibleGroupGames.map((game) => {
              const imageUrl = listImageUrl(game);

              return (
                <article key={game.id} className="page-subcard min-w-0 overflow-hidden p-3">
                  <div className="flex min-w-0 gap-3">
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-bold text-slate-500">
                        Geen
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-black [overflow-wrap:anywhere]">{game.title}</h3>
                      <p className="mt-1 break-words text-sm leading-5 text-slate-500 [overflow-wrap:anywhere]">
                        {formatMeta(game) || (game.source === 'manual' ? 'Manueel toegevoegd' : 'Geen extra info')}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}

            {!visibleGroupGames.length && (
              <p className="neo-muted-panel text-center text-slate-500 sm:col-span-2">
                {query.trim()
                  ? 'Geen spellen gevonden voor deze zoekterm.'
                  : selectedGroup.is_default
                    ? 'Je collectie bevat nog geen spellen.'
                    : 'Er zitten nog geen spellen in deze groep.'}
              </p>
            )}
          </div>
        </section>
      </div>

      {showAddGamesModal && !selectedGroup.is_default && (
        <AddGamesModal
          group={selectedGroup}
          saving={updatingGroup}
          selectedIds={modalSelectedIds}
          onClose={() => setShowAddGamesModal(false)}
          onSave={() => void saveGroupGames()}
          onSelectedIdsChange={setModalSelectedIds}
        />
      )}
    </>
  );
}
