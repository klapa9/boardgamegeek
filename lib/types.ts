export type BggRankDto = {
  id: number | null;
  name: string;
  friendly_name: string;
  value: number | null;
  bayes_average: number | null;
};

export type CommunityPlayerPollDto = {
  label: string;
  player_count: number;
  best_votes: number;
  recommended_votes: number;
  not_recommended_votes: number;
  total_votes: number;
  recommended: boolean;
};

export type PlannerDateDto = {
  id: string;
  session_id: string;
  date: string;
  created_at: string;
};

export type SessionDto = {
  id: string;
  title: string;
  meeting_time: string;
  organizer_user_profile_id: string | null;
  planning_mode: 'fixed_day' | 'vote_dates';
  game_selection_mode: 'no_preselect' | 'host_pick' | 'players_pick';
  chosen_day: string | null;
  chosen_game_id: string | null;
  locked: boolean;
  created_at: string;
  date_options: PlannerDateDto[];
};

export type PlayerDto = {
  id: string;
  session_id: string;
  user_profile_id: string | null;
  name: string;
  created_at: string;
};

export type UserProfileDto = {
  id: string;
  clerk_user_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
};

export type GameDto = {
  id: string;
  session_id: string;
  title: string;
  bgg_id: number | null;
  year_published: number | null;
  thumbnail_url: string | null;
  image_url: string | null;
  min_players: number | null;
  max_players: number | null;
  playing_time: number | null;
  min_age: number | null;
  bgg_rating: number | null;
  bgg_bayes_rating: number | null;
  bgg_weight: number | null;
  mechanics: string[];
  categories: string[];
  designers: string[];
  play_mode: string | null;
  community_players: number[];
  player_count_poll: CommunityPlayerPollDto[];
  ranks: BggRankDto[];
  last_synced_at: string | null;
  added_by: string | null;
  created_at: string;
};

export type CollectionGameDto = {
  id: string;
  bgg_id: number | null;
  title: string;
  year_published: number | null;
  thumbnail_url: string | null;
  image_url: string | null;
  min_players: number | null;
  max_players: number | null;
  playing_time: number | null;
  min_age: number | null;
  bgg_rating: number | null;
  bgg_bayes_rating: number | null;
  bgg_weight: number | null;
  mechanics: string[];
  categories: string[];
  designers: string[];
  play_mode: string | null;
  community_players: number[];
  player_count_poll: CommunityPlayerPollDto[];
  ranks: BggRankDto[];
  in_bgg_collection: boolean;
  manually_added: boolean;
  manually_removed: boolean;
  hidden: boolean;
  source: string;
  last_synced_at: string | null;
  created_at: string;
};

export type CollectionGroupDto = {
  id: string;
  name: string;
  game_count: number;
  game_ids: string[];
  preview_games: CollectionGameDto[];
  created_at: string;
};

export type CollectionSyncStateDto = {
  bgg_username: string | null;
  last_synced_at: string | null;
  last_status: string | null;
  sync_in_progress: boolean;
  sync_started_at: string | null;
  sync_finished_at: string | null;
  total_games: number;
  processed_games: number;
};

export type FilteredBggExpansionDto = {
  id: string;
  bgg_id: number;
  title: string;
  year_published: number | null;
  thumbnail_url: string | null;
  image_url: string | null;
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
  viewer_profile: UserProfileDto | null;
  viewer_player_id: string | null;
  viewer_is_organizer: boolean;
};

export type CollectionBundle = {
  games: CollectionGameDto[];
  groups: CollectionGroupDto[];
  added_games: CollectionGameDto[];
  removed_games: CollectionGameDto[];
  filtered_bgg_expansions: FilteredBggExpansionDto[];
  sync_state: CollectionSyncStateDto | null;
};

export type BggSearchResult = {
  bggId: number;
  title: string;
  yearPublished: number | null;
};

export type BggGameDetails = BggSearchResult & {
  thumbnailUrl: string | null;
  imageUrl: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  minAge: number | null;
  averageRating: number | null;
  bayesAverage: number | null;
  averageWeight: number | null;
  mechanics: string[];
  categories: string[];
  designers: string[];
  playMode: string | null;
  communityPlayers: number[];
  playerCountPoll: CommunityPlayerPollDto[];
  ranks: BggRankDto[];
};

