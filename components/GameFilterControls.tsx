'use client';

import { RotateCcw } from 'lucide-react';
import { GameFilterState, emptyGameFilters, hasActiveGameFilters } from '@/lib/gameFilters';

type Props = {
  filters: GameFilterState;
  mechanics: string[];
  playerCounts: number[];
  onChange: (filters: GameFilterState) => void;
};

const controlClass = 'rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400';

export default function GameFilterControls({ filters, mechanics, playerCounts, onChange }: Props) {
  function setFilter(key: keyof GameFilterState, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="grid gap-2 rounded-3xl border border-slate-100 bg-white p-3 sm:grid-cols-2 lg:grid-cols-6">
      <select value={filters.players} onChange={(event) => setFilter('players', event.target.value)} className={controlClass} aria-label="Spelersaantal">
        <option value="">Alle aanbevolen spelers</option>
        {playerCounts.map((count) => <option key={count} value={count}>{count} speler{count === 1 ? '' : 's'}</option>)}
      </select>

      <select value={filters.duration} onChange={(event) => setFilter('duration', event.target.value)} className={controlClass} aria-label="Speelduur">
        <option value="">Alle speelduur</option>
        <option value="30">tot 30 min</option>
        <option value="60">tot 60 min</option>
        <option value="120">tot 120 min</option>
        <option value="121">120+ min</option>
      </select>

      <select value={filters.complexity} onChange={(event) => setFilter('complexity', event.target.value)} className={controlClass} aria-label="Complexiteit">
        <option value="">Alle complexiteit</option>
        <option value="light">Licht</option>
        <option value="medium">Gemiddeld</option>
        <option value="heavy">Zwaar</option>
      </select>

      <select value={filters.mechanic} onChange={(event) => setFilter('mechanic', event.target.value)} className={`${controlClass} lg:col-span-2`} aria-label="Mechanics">
        <option value="">Alle mechanics</option>
        {mechanics.map((mechanic) => <option key={mechanic} value={mechanic}>{mechanic}</option>)}
      </select>

      <div className="flex gap-2">
        <select value={filters.playMode} onChange={(event) => setFilter('playMode', event.target.value)} className={`${controlClass} min-w-0 flex-1`} aria-label="Co-op of competitive">
          <option value="">Alle types</option>
          <option value="cooperative">Co-op</option>
          <option value="competitive">Competitive</option>
        </select>
        <button
          type="button"
          onClick={() => onChange(emptyGameFilters)}
          disabled={!hasActiveGameFilters(filters)}
          className="rounded-2xl border border-slate-200 px-3 text-slate-500 disabled:opacity-40"
          title="Filters wissen"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}

