'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { CollectionBundle, CollectionGameDto } from '@/lib/types';

function listImageUrl(game: CollectionGameDto) {
  return game.thumbnail_url ?? game.image_url;
}

function formatSyncMoment(value: string | null) {
  if (!value) return 'nog niet gesynchroniseerd';
  return new Intl.DateTimeFormat('nl-BE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function DiffList({ title, games, emptyText }: { title: string; games: CollectionGameDto[]; emptyText: string }) {
  return (
    <section className="page-subcard p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-slate-900">{title}</h3>
        <span className="text-sm text-slate-500">{games.length}</span>
      </div>
      <div className="mt-3 grid gap-3">
        {games.length ? (
          games.map((game) => {
            const imageUrl = listImageUrl(game);
            return (
              <article key={game.id} className="flex gap-3 rounded-2xl bg-white/80 p-3">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-sm font-bold text-slate-500">
                    Geen
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold [overflow-wrap:anywhere]">{game.title}</h4>
                  <p className="text-sm text-slate-500">
                    {game.year_published ? `${game.year_published} - ` : ''}
                    BGG #{game.bgg_id ?? 'onbekend'}
                  </p>
                </div>
              </article>
            );
          })
        ) : (
          <div className="neo-muted-panel text-center text-slate-500">{emptyText}</div>
        )}
      </div>
    </section>
  );
}

export default function BggManager() {
  const [username, setUsername] = useState('');
  const [storedUsername, setStoredUsername] = useState<string | null>(null);
  const [addedGames, setAddedGames] = useState<CollectionGameDto[]>([]);
  const [removedGames, setRemovedGames] = useState<CollectionGameDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);

  async function loadBundle() {
    const data = await api<CollectionBundle>('/api/collection/games');
    setStoredUsername(data.sync_state?.bgg_username ?? null);
    setUsername(data.sync_state?.bgg_username ?? '');
    setAddedGames(data.added_games);
    setRemovedGames(data.removed_games);
    setLastSyncedAt(data.sync_state?.last_synced_at ?? null);
    setLastStatus(data.sync_state?.last_status ?? null);
    setSyncing(Boolean(data.sync_state?.sync_in_progress));
    return data;
  }

  useEffect(() => {
    loadBundle()
      .catch((err) => setError(err instanceof Error ? err.message : 'BGG gegevens laden mislukt.'))
      .finally(() => setLoading(false));
  }, []);

  async function syncBgg(event: React.FormEvent) {
    event.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Geef eerst je BoardGameGeek username in.');
      return;
    }
    const replacingExisting = Boolean(
      storedUsername
      && storedUsername.localeCompare(trimmedUsername, undefined, { sensitivity: 'accent' }) !== 0
    );

    if (replacingExisting) {
      const confirmed = confirm(
        `Je hebt momenteel ${storedUsername} gekoppeld. Als je doorgaat, wordt die BGG-collectie vervangen door ${trimmedUsername}.`
      );
      if (!confirmed) return;
    }

    setSyncing(true);
    setError(null);
    setMessage('Synchronisatie gestart. Dit kan tot 5 minuten duren; je mag deze pagina gerust verlaten.');

    try {
      const data = await api<{ message: string }>('/api/collection/sync', {
        method: 'POST',
        body: JSON.stringify({
          username: trimmedUsername,
          replace_existing: replacingExisting
        })
      });
      setMessage(data.message);
      await loadBundle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'BGG synchronisatie mislukt.');
      setSyncing(false);
    }
  }

  if (loading) return <section className="page-card p-5">Laden...</section>;

  return (
    <div className="space-y-5">
      <section className="page-card page-card-sky p-5">
        <h2 className="font-poster text-3xl uppercase leading-none text-slate-950">BoardGameGeek koppelen</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-700">
          Voeg hier je BGG account toe en start een synchronisatie. Je hoeft niet te wachten: binnen ongeveer 5 minuten zou je collectie bijgewerkt moeten zijn en je mag deze pagina intussen gewoon verlaten.
        </p>

        <form onSubmit={syncBgg} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="BGG username"
            className="neo-input min-w-0 flex-1"
          />
          <button disabled={syncing} className="neo-button neo-button-primary disabled:opacity-60">
            <RefreshCw size={18} className={`mr-2 inline ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Bezig...' : 'Synchroniseer'}
          </button>
        </form>

        <div className="neo-muted-panel mt-4 text-sm text-slate-700">
          <p><b>Gekoppeld account:</b> {storedUsername ?? 'nog niet ingesteld'}</p>
          <p className="mt-1"><b>Laatst klaar:</b> {formatSyncMoment(lastSyncedAt)}</p>
          {lastStatus && <p className="mt-1"><b>Status:</b> {lastStatus}</p>}
        </div>

        {(message || error) && (
          <div className="mt-4 space-y-2">
            {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          </div>
        )}
      </section>

      <section className="page-card page-card-peach p-5">
        <h2 className="font-poster text-3xl uppercase leading-none text-slate-950">Lokale verschillen met BGG</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-700">
          Deze site onthoudt lokale toevoegingen en verwijderingen. Daardoor houden je keuzes hier altijd voorrang, ook na een volgende BGG sync.
        </p>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <DiffList
            title="Toegevoegd op deze site, niet in BGG"
            games={addedGames}
            emptyText="Er zijn momenteel geen lokale toevoegingen die afwijken van BGG."
          />
          <DiffList
            title="Verwijderd op deze site, nog wel in BGG"
            games={removedGames}
            emptyText="Er zijn momenteel geen lokale verwijderingen die afwijken van BGG."
          />
        </div>
      </section>
    </div>
  );
}
