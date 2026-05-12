export type PlannerDateDto = {
  id: string;
  session_id: string;
  date: string;
  created_at: string;
};

export type SessionDto = {
  id: string;
  title: string;
  chosen_day: string | null;
  chosen_game_id: string | null;
  locked: boolean;
  created_at: string;
  date_options: PlannerDateDto[];
};

export type PlayerDto = {
  id: string;
  session_id: string;
  name: string;
  created_at: string;
};

export type GameDto = {
  id: string;
  session_id: string;
  title: string;
  bgg_id: number | null;
  year_published: number | null;
  image_url: string | null;
  min_players: number | null;
  max_players: number | null;
  playing_time: number | null;
  bgg_rating: number | null;
  bgg_weight: number | null;
  mechanics: string[];
  play_mode: string | null;
  community_players: number[];
  added_by: string | null;
  created_at: string;
};

export type CollectionGameDto = {
  id: string;
  bgg_id: number | null;
  title: string;
  year_published: number | null;
  image_url: string | null;
  min_players: number | null;
  max_players: number | null;
  playing_time: number | null;
  bgg_rating: number | null;
  bgg_weight: number | null;
  mechanics: string[];
  play_mode: string | null;
  community_players: number[];
  hidden: boolean;
  source: string;
  created_at: string;
};

export type CollectionSyncStateDto = {
  bgg_username: string | null;
  last_synced_at: string | null;
  last_status: string | null;
};

export type AvailabilityDto = {
  player_id: string;
  day: string;
  available: boolean;
};

export type RatingDto = {
  player_id: string;
  game_id: string;
  score: number;
};

export type SessionBundle = {
  session: SessionDto;
  players: PlayerDto[];
  games: GameDto[];
  availability: AvailabilityDto[];
  ratings: RatingDto[];
};

export type CollectionBundle = {
  games: CollectionGameDto[];
  sync_state: CollectionSyncStateDto | null;
};

export type BggSearchResult = {
  bggId: number;
  title: string;
  yearPublished: number | null;
};

export type BggGameDetails = BggSearchResult & {
  imageUrl: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  averageRating: number | null;
  averageWeight: number | null;
  mechanics: string[];
  playMode: string | null;
  communityPlayers: number[];
};
