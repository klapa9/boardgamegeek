import { CollectionGameDto } from '@/lib/types';

export type GameFilterState = {
  players: string;
  duration: string;
  complexity: string;
  mechanic: string;
  playMode: string;
};

export const emptyGameFilters: GameFilterState = {
  players: '',
  duration: '',
  complexity: '',
  mechanic: '',
  playMode: ''
};

export function mechanicOptions(games: CollectionGameDto[]) {
  return Array.from(new Set(games.flatMap((game) => game.mechanics))).sort((a, b) => a.localeCompare(b));
}

export function playerCountOptions(games: CollectionGameDto[]) {
  const counts = new Set<number>();

  for (const game of games) {
    game.community_players.forEach((count) => counts.add(count));
    if (game.min_players && game.max_players) {
      for (let count = game.min_players; count <= game.max_players; count += 1) {
        counts.add(count);
      }
    }
  }

  return Array.from(counts).sort((left, right) => left - right);
}

export function matchesGameFilters(game: CollectionGameDto, filters: GameFilterState) {
  if (filters.players) {
    const players = Number(filters.players);
    if (game.community_players.length) {
      if (!game.community_players.includes(players)) return false;
    } else if (!game.min_players || !game.max_players || players < game.min_players || players > game.max_players) {
      return false;
    }
  }

  if (filters.duration) {
    const duration = game.playing_time;
    if (!duration) return false;
    if (filters.duration === '30' && duration > 30) return false;
    if (filters.duration === '60' && duration > 60) return false;
    if (filters.duration === '120' && duration > 120) return false;
    if (filters.duration === '121' && duration <= 120) return false;
  }

  if (filters.complexity) {
    const weight = game.bgg_weight;
    if (!weight) return false;
    if (filters.complexity === 'light' && weight > 2) return false;
    if (filters.complexity === 'medium' && (weight <= 2 || weight > 3.5)) return false;
    if (filters.complexity === 'heavy' && weight <= 3.5) return false;
  }

  if (filters.mechanic && !game.mechanics.includes(filters.mechanic)) return false;
  if (filters.playMode && game.play_mode !== filters.playMode) return false;

  return true;
}

export function hasActiveGameFilters(filters: GameFilterState) {
  return Object.values(filters).some(Boolean);
}

