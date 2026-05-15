'use client';

import { RotateCcw } from 'lucide-react';
import { CollectionGroupDto } from '@/lib/types';
import { GameFilterState, emptyGameFilters, hasActiveGameFilters } from '@/lib/gameFilters';

type Props = {
  filters: GameFilterState;
  mechanics: string[];
  playerCounts: number[];
  groups: CollectionGroupDto[];
  hasDurationData: boolean;
  hasComplexityData: boolean;
  hasPlayModeData: boolean;
  onChange: (filters: GameFilterState) => void;
};

const controlClass = 'neo-input text-sm';

export default function GameFilterControls({
  filters,
  mechanics,
  playerCounts,
  groups,
  hasDurationData,
  hasComplexityData,
  hasPlayModeData,
  onChange
}: Props) {
  function setFilter(key: keyof GameFilterState, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="grid gap-2 rounded-[1.6rem] border-2 border-slate-950 bg-[rgba(255,255,255,0.8)] p-3 sm:grid-cols-2 lg:grid-cols-7">
      <select value={filters.groupId} onChange={(event) => setFilter('groupId', event.target.value)} disabled={!groups.length} className={controlClass} aria-label="Groep">
        <option value="">{groups.length ? 'Alle groepen' : 'Geen groepen beschikbaar'}</option>
        {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
      </select>

      <select value={filters.players} onChange={(event) => setFilter('players', event.target.value)} disabled={!playerCounts.length} className={controlClass} aria-label="Spelersaantal">
        <option value="">{playerCounts.length ? 'Alle aanbevolen spelers' : 'Geen spelersdata beschikbaar'}</option>
        {playerCounts.map((count) => <option key={count} value={count}>{count} speler{count === 1 ? '' : 's'}</option>)}
      </select>

      <select value={filters.duration} onChange={(event) => setFilter('duration', event.target.value)} disabled={!hasDurationData} className={controlClass} aria-label="Speelduur">
        <option value="">{hasDurationData ? 'Alle speelduur' : 'Geen speelduur beschikbaar'}</option>
        <option value="30">tot 30 min</option>
        <option value="60">tot 60 min</option>
        <option value="120">tot 120 min</option>
        <option value="121">120+ min</option>
      </select>

      <select value={filters.complexity} onChange={(event) => setFilter('complexity', event.target.value)} disabled={!hasComplexityData} className={controlClass} aria-label="Complexiteit">
        <option value="">{hasComplexityData ? 'Alle complexiteit' : 'Geen complexiteitsdata beschikbaar'}</option>
        <option value="light">Licht</option>
        <option value="medium">Gemiddeld</option>
        <option value="heavy">Zwaar</option>
      </select>

      <select value={filters.mechanic} onChange={(event) => setFilter('mechanic', event.target.value)} disabled={!mechanics.length} className={`${controlClass} lg:col-span-2`} aria-label="Mechanics">
        <option value="">{mechanics.length ? 'Alle mechanics' : 'Geen mechanics beschikbaar'}</option>
        {mechanics.map((mechanic) => <option key={mechanic} value={mechanic}>{mechanic}</option>)}
      </select>

      <div className="flex gap-2">
        <select value={filters.playMode} onChange={(event) => setFilter('playMode', event.target.value)} disabled={!hasPlayModeData} className={`${controlClass} min-w-0 flex-1`} aria-label="Co-op of competitive">
          <option value="">{hasPlayModeData ? 'Alle types' : 'Geen typedata beschikbaar'}</option>
          <option value="cooperative">Co-op</option>
          <option value="competitive">Competitive</option>
        </select>
        <button
          type="button"
          onClick={() => onChange(emptyGameFilters)}
          disabled={!hasActiveGameFilters(filters)}
          className="neo-button neo-button-ghost px-3 text-slate-500 disabled:opacity-40"
          title="Filters wissen"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}

