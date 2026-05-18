'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import CollectionBggSearch from '@/components/CollectionBggSearch';
import { BggSearchResult, CollectionGameDto } from '@/lib/types';

type CollectionAddDrawerProps = {
  open: boolean;
  existingCollectionGames: CollectionGameDto[];
  onClose: () => void;
  onAddToCollectionAndContext: (game: CollectionGameDto | null, result: BggSearchResult) => Promise<void> | void;
  onAddToContextOnly?: (result: BggSearchResult) => Promise<void> | void;
};

export default function CollectionAddDrawer({
  open,
  existingCollectionGames,
  onClose,
  onAddToCollectionAndContext,
  onAddToContextOnly
}: CollectionAddDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedResult, setSelectedResult] = useState<BggSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'collection' | 'session' | null>(null);
  const existingCollectionGameByBggId = useMemo(
    () => new Map(existingCollectionGames.map((game) => [game.bgg_id, game])),
    [existingCollectionGames]
  );

  useEffect(() => {
    if (!open) return;
    setSelectedResult(null);
    setError(null);
    setActionLoading(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, open]);

  if (!open) return null;

  async function handleAddToCollectionAndContext() {
    if (!selectedResult) return;

    setActionLoading('collection');
    setError(null);

    try {
      const existingGame = existingCollectionGameByBggId.get(selectedResult.bggId) ?? null;
      if (existingGame) {
        await onAddToCollectionAndContext(existingGame, selectedResult);
        onClose();
        return;
      }

      const data = await api<{ game: CollectionGameDto | null }>('/api/collection/games', {
        method: 'POST',
        body: JSON.stringify({ bgg_id: selectedResult.bggId })
      });
      await onAddToCollectionAndContext(data.game, selectedResult);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spel toevoegen mislukt.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddToContextOnly() {
    if (!selectedResult || !onAddToContextOnly) return;

    setActionLoading('session');
    setError(null);

    try {
      await onAddToContextOnly(selectedResult);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spel toevoegen mislukt.');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-add-drawer-title"
        className="page-card page-card-peach flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] sm:rounded-[2rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="page-band shrink-0 flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Spel toevoegen</p>
            <h2 id="collection-add-drawer-title" className="mt-1 font-poster text-3xl uppercase leading-none text-slate-950">
              Zoek op BoardGameGeek
            </h2>
            <p className="mt-1 text-sm text-slate-700">Kies eerst het juiste spel, daarna bepaal je of het ook in je collectie moet komen.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="neo-button neo-button-ghost p-3 text-slate-600"
            title="Sluiten"
            aria-label="Sluiten"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-scroll-area min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <CollectionBggSearch
            existingBggIds={existingCollectionGames.map((game) => game.bgg_id).filter((id): id is number => id !== null)}
            mode="select"
            selectedBggId={selectedResult?.bggId ?? null}
            onResultSelect={setSelectedResult}
            title="Zoekresultaten"
            subtitle="Zoek in boardgamegeek.com en kies het juiste basisspel. Expansions worden niet getoond."
            emptyStateText="Typ minstens 2 letters om BoardGameGeek te doorzoeken."
            containerClassName="page-subcard p-4"
          />

          {selectedResult && (
            <div className="page-subcard mt-4 p-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Gekozen spel</p>
              <h3 className="mt-2 font-black text-slate-950">{selectedResult.title}</h3>
              <p className="mt-1 text-sm text-slate-600">
                BGG #{selectedResult.bggId}
                {selectedResult.yearPublished ? ` - ${selectedResult.yearPublished}` : ''}
              </p>
              <p className="mt-3 text-sm text-slate-600">Wat wil je hiermee doen?</p>
              {error && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => void handleAddToCollectionAndContext()}
                  disabled={actionLoading !== null}
                  className="neo-button neo-button-primary w-full justify-center disabled:opacity-60"
                >
                  {actionLoading === 'collection' ? <><Loader2 size={18} className="animate-spin" /> Toevoegen...</> : 'Toevoegen aan collectie en spelavond'}
                </button>
                {onAddToContextOnly && (
                  <button
                    type="button"
                    onClick={() => void handleAddToContextOnly()}
                    disabled={actionLoading !== null}
                    className="neo-button neo-button-ghost w-full justify-center disabled:opacity-60"
                  >
                    {actionLoading === 'session' ? <><Loader2 size={18} className="animate-spin" /> Toevoegen...</> : 'Enkel toevoegen aan spelavond'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
