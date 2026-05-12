'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Plus } from 'lucide-react';
import { api, loadSessionBundle } from '@/lib/api';
import { GameDto, PlayerDto, SessionDto } from '@/lib/types';
import GameCollectionPicker from './GameCollectionPicker';

type AddState = 'idle' | 'saving' | 'done';

function playerKey(sessionId: string) {
  return `gsk-player-${sessionId}`;
}

export default function SessionGameAddPage({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SessionDto | null>(null);
  const [players, setPlayers] = useState<PlayerDto[]>([]);
  const [games, setGames] = useState<GameDto[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [state, setState] = useState<AddState>('idle');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlayer = players.find((player) => player.id === currentPlayerId) ?? null;
  const existingTitles = useMemo(() => games.map((game) => game.title), [games]);
  const existingBggIds = useMemo(() => games.map((game) => game.bgg_id).filter((id): id is number => id !== null), [games]);

  async function refresh() {
    try {
      const data = await loadSessionBundle(sessionId);
      setSession(data.session);
      setPlayers(data.players);
      setGames(data.games);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sessie laden mislukt.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPlayerId(localStorage.getItem(playerKey(sessionId)));
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function addSelectedGames() {
    if (!currentPlayerId || !selectedIds.length) return;
    setState('saving');
    setError(null);
    setMessage(null);

    try {
      const data = await api<{ added: GameDto[]; skipped: string[] }>(`/api/sessions/${sessionId}/games`, {
        method: 'POST',
        body: JSON.stringify({
          collection_game_ids: selectedIds,
          added_by: currentPlayerId
        })
      });
      setSelectedIds([]);
      setMessage(`${data.added.length} spel${data.added.length === 1 ? '' : 'len'} toegevoegd.${data.skipped.length ? ` ${data.skipped.length} dubbel spel overgeslagen.` : ''}`);
      setState('done');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spellen toevoegen mislukt.');
      setState('idle');
    }
  }

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-8">Laden...</main>;
  if (!session) return <main className="mx-auto max-w-4xl px-4 py-8">Sessie niet gevonden.</main>;

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-16">
      <header className="rounded-3xl bg-white p-5 shadow-soft">
        <Link href={`/s/${sessionId}`} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
          <ArrowLeft size={16} /> Terug naar spelavond
        </Link>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Extra spellen toevoegen</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">{session.title}</h1>
            <p className="mt-2 text-sm text-slate-500">Selecteer één of meerdere spellen uit dezelfde lokale spellenlijst als bij het aanmaken van een spelavond.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Nu in lijst: <b>{games.length}</b>
          </div>
        </div>
        {currentPlayer ? <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm">Je voegt spellen toe als <b>{currentPlayer.name}</b>.</p> : <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Vul eerst je naam in op de spelavondpagina. Daarna kan je spellen toevoegen.</p>}
        {message && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
        {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </header>

      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <GameCollectionPicker
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          disabledTitles={existingTitles}
          disabledBggIds={existingBggIds}
          title="Kies extra spellen"
          subtitle="Vink alle spellen aan die je wil toevoegen aan deze spelavond. Spellen die al in de lijst staan kan je niet opnieuw selecteren."
          maxHeightClassName="max-h-[32rem]"
        />
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link href={`/s/${sessionId}`} className="rounded-2xl border border-slate-200 px-5 py-3 text-center font-bold text-slate-700 hover:bg-slate-50">Annuleren</Link>
          <button
            type="button"
            onClick={addSelectedGames}
            disabled={!currentPlayerId || !selectedIds.length || state === 'saving'}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            {state === 'saving' ? 'Toevoegen...' : state === 'done' ? <><Check size={18} /> Nog spellen toevoegen</> : <><Plus size={18} /> {selectedIds.length || ''} spel{selectedIds.length === 1 ? '' : 'len'} toevoegen</>}
          </button>
        </div>
      </section>
    </main>
  );
}
