'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
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

export default function CollectionOverview() {
  const [games, setGames] = useState<CollectionGameDto[]>([]);
  const [groups, setGroups] = useState<CollectionGroupDto[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(ALL_GAMES_GROUP_ID);
  const [query, setQuery] = useState('');
  const [manageQuery, setManageQuery] = useState('');
  const [createName, setCreateName] = useState('');
  const [inlineCreateName, setInlineCreateName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [updatingGameId, setUpdatingGameId] = useState<string | null>(null);
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
  const customGroupIdsByGameId = useMemo(() => {
    const mapping = new Map<string, string[]>();

    for (const group of groups) {
      for (const gameId of group.game_ids) {
        const current = mapping.get(gameId) ?? [];
        mapping.set(gameId, [...current, group.id]);
      }
    }

    return mapping;
  }, [groups]);
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
  const manageableGames = useMemo(() => {
    const normalizedQuery = manageQuery.trim().toLowerCase();
    if (!normalizedQuery) return games;
    return games.filter((game) => game.title.toLowerCase().includes(normalizedQuery));
  }, [games, manageQuery]);

  async function createGroup(initialGameIds: string[] = []) {
    const nextName = (initialGameIds.length ? inlineCreateName : createName).trim();
    if (!nextName) {
      setError('Geef eerst een naam in.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const data = await api<{ group: CollectionGroupDto }>('/api/collection/groups', {
        method: 'POST',
        body: JSON.stringify({ name: nextName, game_ids: initialGameIds })
      });

      setCreateName('');
      setInlineCreateName('');
      setShowCreateForm(false);
      setEditingGameId(null);
      setMessage(`"${data.group.name}" is toegevoegd.`);
      await loadBundle(data.group.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Indeling aanmaken mislukt.');
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
      setError(err instanceof Error ? err.message : 'Naam aanpassen mislukt.');
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
      setMessage(`"${selectedGroup.name}" is verwijderd.`);
      await loadBundle(ALL_GAMES_GROUP_ID);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verwijderen mislukt.');
    } finally {
      setUpdatingGroup(false);
    }
  }

  async function toggleGameInSelectedGroup(gameId: string) {
    if (!selectedGroup || selectedGroup.is_default) return;

    const nextIds = selectedGroup.game_ids.includes(gameId)
      ? selectedGroup.game_ids.filter((currentId) => currentId !== gameId)
      : [...selectedGroup.game_ids, gameId];

    setUpdatingGroup(true);
    setError(null);

    try {
      await api(`/api/collection/groups/${selectedGroup.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ game_ids: nextIds })
      });

      await loadBundle(selectedGroup.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spelindeling aanpassen mislukt.');
    } finally {
      setUpdatingGroup(false);
    }
  }

  async function toggleGroupForGame(gameId: string, groupId: string) {
    const currentGroupIds = customGroupIdsByGameId.get(gameId) ?? [];
    const nextGroupIds = currentGroupIds.includes(groupId)
      ? currentGroupIds.filter((currentId) => currentId !== groupId)
      : [...currentGroupIds, groupId];

    setUpdatingGameId(gameId);
    setError(null);

    try {
      await api(`/api/collection/games?id=${encodeURIComponent(gameId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ group_ids: nextGroupIds })
      });

      await loadBundle(selectedGroupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Indelingen voor dit spel aanpassen mislukt.');
    } finally {
      setUpdatingGameId(null);
    }
  }

  if (loading) return <section className="page-card p-5">Laden...</section>;
  if (!selectedGroup) return <section className="page-card p-5">Geen collectie gevonden.</section>;

  return (
    <div className="space-y-5">
      <section id="nieuwe-indeling" className="page-card page-card-peach p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-poster text-3xl uppercase leading-none text-slate-950">Mijn collectie</h2>
            <p className="mt-2 text-sm text-slate-700">Maak je eigen groepen om je collectie in te verdelen en gemakkelijk spellen te kiezen bij een spelavond.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm((current) => !current)}
            className="neo-button neo-button-ghost self-start text-sm"
          >
            <Plus size={16} />
            Nieuw
          </button>
        </div>

        {(message || error) && (
          <div className="mt-4 space-y-2">
            {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          </div>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {viewGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => {
                setSelectedGroupId(group.id);
                setQuery('');
                setManageQuery('');
                setRenaming(false);
              }}
              className={`rounded-[2rem] border-4 p-4 text-left transition ${
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
                {group.game_count === 0 ? 'Nog leeg' : `${group.game_count} spel${group.game_count === 1 ? '' : 'len'} in deze selectie`}
              </p>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="rounded-[2rem] border-4 border-dashed border-slate-950/25 bg-[rgba(255,255,255,0.7)] p-4 text-left transition hover:-translate-y-1 hover:border-slate-950/40 hover:bg-white"
          >
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#84d7ff] text-slate-700 shadow-sm">
                <Plus size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Nieuwe indeling</h3>
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
              {selectedGroup.is_default ? ' in je volledige collectie.' : ' in deze indeling.'}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative">
              <Search size={17} className="absolute left-3 top-3.5 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Zoek in deze selectie"
                className="neo-input w-full py-3 pl-9 pr-4 sm:w-72"
              />
            </div>

            {!selectedGroup.is_default && (
              <div className="flex gap-2">
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

        {!selectedGroup.is_default && (
          <div className="page-subcard mt-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-black">Spellen toevoegen of weghalen</h3>
                <p className="text-sm text-slate-500">Vink spellen aan om deze selectie direct op te bouwen.</p>
              </div>
              <div className="relative">
                <Search size={17} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  value={manageQuery}
                  onChange={(event) => setManageQuery(event.target.value)}
                  placeholder="Zoek in je collectie"
                  className="neo-input w-full py-3 pl-9 pr-4 sm:w-72"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {manageableGames.map((game) => {
                const checked = selectedGroup.game_ids.includes(game.id);
                const imageUrl = listImageUrl(game);

                return (
                  <button
                    key={game.id}
                    type="button"
                    disabled={updatingGroup}
                    onClick={() => void toggleGameInSelectedGroup(game.id)}
                    className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left transition ${
                      checked ? 'border-slate-950 bg-[#172036] text-white' : 'border-slate-950/10 bg-white/82 hover:border-slate-950/30'
                    } disabled:opacity-60`}
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">Geen</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{game.title}</p>
                      <p className={`truncate text-sm ${checked ? 'text-slate-300' : 'text-slate-500'}`}>
                        {formatMeta(game) || (game.source === 'manual' ? 'Manueel toegevoegd' : 'Geen extra info')}
                      </p>
                    </div>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${checked ? 'bg-white text-slate-950' : 'bg-slate-100 text-slate-500'}`}>
                      {checked ? <Check size={16} /> : <Plus size={16} />}
                    </div>
                  </button>
                );
              })}

              {!manageableGames.length && (
                <p className="page-subcard-soft px-4 py-5 text-center text-sm text-slate-500 md:col-span-2">
                  Geen spellen gevonden voor deze zoekterm.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {visibleGroupGames.map((game) => {
            const imageUrl = listImageUrl(game);
            const gameGroupIds = customGroupIdsByGameId.get(game.id) ?? [];
            const editingThisGame = editingGameId === game.id;

            return (
              <article key={game.id} className="page-subcard overflow-hidden p-3">
                <div className="flex min-w-0 gap-3">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-bold text-slate-500">
                      Geen
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words font-black [overflow-wrap:anywhere]">{game.title}</h3>
                        <p className="mt-1 break-words text-sm leading-5 text-slate-500 [overflow-wrap:anywhere]">
                          {formatMeta(game) || (game.source === 'manual' ? 'Manueel toegevoegd' : 'Geen extra info')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGameId((current) => current === game.id ? null : game.id);
                          setInlineCreateName('');
                        }}
                        className="shrink-0 rounded-xl p-2 text-slate-500 transition hover:bg-white"
                        title="Indelen"
                      >
                        {editingThisGame ? <X size={17} /> : <Plus size={17} />}
                      </button>
                    </div>

                  </div>
                </div>

                {editingThisGame && (
                  <div className="page-subcard-soft mt-3 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h4 className="font-bold">Zet dit spel in je eigen indelingen</h4>
                        <p className="text-sm text-slate-500">Een spel mag in meerdere selecties tegelijk zitten.</p>
                      </div>
                      {updatingGameId === game.id && <p className="text-sm text-slate-500">Opslaan...</p>}
                    </div>

                    <div className="mt-3 space-y-2">
                      {groups.map((group) => {
                        const checked = gameGroupIds.includes(group.id);

                        return (
                          <label
                            key={group.id}
                            className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 px-3 py-3 ${
                              checked ? 'border-slate-950 bg-[#172036] text-white' : 'border-slate-950/10 bg-white/80'
                            }`}
                          >
                            <span className="min-w-0 flex-1 break-words font-bold [overflow-wrap:anywhere]">{group.name}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={updatingGameId === game.id}
                              onChange={() => void toggleGroupForGame(game.id, group.id)}
                              className="h-4 w-4 shrink-0 rounded border-slate-300"
                            />
                          </label>
                        );
                      })}

                      {!groups.length && (
                        <p className="neo-muted-panel text-sm text-slate-500">
                          Je hebt nog geen eigen indelingen. Maak hieronder meteen je eerste aan.
                        </p>
                      )}
                    </div>

                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void createGroup([game.id]);
                      }}
                      className="mt-4 flex flex-col gap-2 sm:flex-row"
                    >
                      <input
                        value={editingThisGame ? inlineCreateName : ''}
                        onChange={(event) => setInlineCreateName(event.target.value)}
                        placeholder="Nieuwe naam"
                        className="neo-input min-w-0 flex-1"
                      />
                      <button
                        type="submit"
                        disabled={creating}
                        className="neo-button neo-button-ghost disabled:opacity-60"
                      >
                        Meteen aanmaken
                      </button>
                    </form>
                  </div>
                )}
              </article>
            );
          })}

          {!visibleGroupGames.length && (
            <p className="neo-muted-panel text-center text-slate-500 sm:col-span-2">
              Geen spellen gevonden in deze selectie.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
