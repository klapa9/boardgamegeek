import { Availability, CollectionSyncState, Game, Player, Rating, Session, SessionDateOption, UserProfile } from '@prisma/client';
import { collectionGameCategoryNames, collectionGameMechanicNames, CollectionGameWithRelations } from '@/lib/collection-games';
import { CollectionGroupWithRelations } from '@/lib/collection-groups';
import { cachedImageUrl } from '@/lib/image-cache';
import { BggRankDto, CommunityPlayerPollDto } from '@/lib/types';

function asPollDtos(value: unknown): CommunityPlayerPollDto[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const playerCount = Number(row.playerCount);
      const bestVotes = Number(row.bestVotes);
      const recommendedVotes = Number(row.recommendedVotes);
      const notRecommendedVotes = Number(row.notRecommendedVotes);
      const totalVotes = Number(row.totalVotes);

      return {
        label: String(row.label ?? ''),
        player_count: Number.isFinite(playerCount) ? playerCount : 0,
        best_votes: Number.isFinite(bestVotes) ? bestVotes : 0,
        recommended_votes: Number.isFinite(recommendedVotes) ? recommendedVotes : 0,
        not_recommended_votes: Number.isFinite(notRecommendedVotes) ? notRecommendedVotes : 0,
        total_votes: Number.isFinite(totalVotes) ? totalVotes : 0,
        recommended: Boolean(row.recommended)
      } satisfies CommunityPlayerPollDto;
    })
    .filter((entry): entry is CommunityPlayerPollDto => Boolean(entry));
}

function asRankDtos(value: unknown): BggRankDto[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const id = row.id === null ? null : Number(row.id);
      const rankValue = row.value === null ? null : Number(row.value);
      const bayesAverage = row.bayesAverage === null ? null : Number(row.bayesAverage);

      return {
        id: id !== null && Number.isFinite(id) ? id : null,
        name: String(row.name ?? ''),
        friendly_name: String(row.friendlyName ?? ''),
        value: rankValue !== null && Number.isFinite(rankValue) ? rankValue : null,
        bayes_average: bayesAverage !== null && Number.isFinite(bayesAverage) ? bayesAverage : null
      } satisfies BggRankDto;
    })
    .filter((entry): entry is BggRankDto => Boolean(entry));
}

export function serializeDateOption(option: SessionDateOption) {
  return {
    id: option.id,
    session_id: option.sessionId,
    date: option.date,
    created_at: option.createdAt.toISOString()
  };
}

export function serializeSession(session: Session, dateOptions: SessionDateOption[] = []) {
  return {
    id: session.id,
    title: session.title,
    organizer_user_profile_id: session.organizerUserProfileId,
    chosen_day: session.chosenDay,
    chosen_game_id: session.chosenGameId,
    locked: session.locked,
    created_at: session.createdAt.toISOString(),
    date_options: dateOptions.map(serializeDateOption)
  };
}

export function serializePlayer(player: Player) {
  return {
    id: player.id,
    session_id: player.sessionId,
    user_profile_id: player.userProfileId,
    name: player.name,
    created_at: player.createdAt.toISOString()
  };
}

export function serializeUserProfile(profile: UserProfile) {
  return {
    id: profile.id,
    clerk_user_id: profile.clerkUserId,
    display_name: profile.displayName,
    created_at: profile.createdAt.toISOString(),
    updated_at: profile.updatedAt.toISOString()
  };
}

export function serializeGame(game: Game) {
  return {
    id: game.id,
    session_id: game.sessionId,
    title: game.title,
    bgg_id: game.bggId,
    year_published: game.yearPublished,
    thumbnail_url: cachedImageUrl(game.thumbnailUrl ?? game.imageUrl, 'thumb', game.bggId),
    image_url: cachedImageUrl(game.imageUrl ?? game.thumbnailUrl, 'full', game.bggId),
    min_players: game.minPlayers,
    max_players: game.maxPlayers,
    playing_time: game.playingTime,
    min_age: game.minAge,
    bgg_rating: game.bggRating,
    bgg_bayes_rating: game.bggBayesRating,
    bgg_weight: game.bggWeight,
    mechanics: game.mechanics,
    categories: game.categories,
    designers: game.designers,
    play_mode: game.playMode,
    community_players: game.communityPlayers,
    player_count_poll: asPollDtos(game.playerCountPoll),
    ranks: asRankDtos(game.ranks),
    last_synced_at: game.lastSyncedAt?.toISOString() ?? null,
    added_by: game.addedBy,
    created_at: game.createdAt.toISOString()
  };
}

export function serializeCollectionGame(game: CollectionGameWithRelations) {
  return {
    id: game.id,
    bgg_id: game.bggId,
    title: game.title,
    year_published: game.yearPublished,
    thumbnail_url: cachedImageUrl(game.thumbnailUrl ?? game.imageUrl, 'thumb', game.bggId),
    image_url: cachedImageUrl(game.imageUrl ?? game.thumbnailUrl, 'full', game.bggId),
    min_players: game.minPlayers,
    max_players: game.maxPlayers,
    playing_time: game.playingTime,
    min_age: game.minAge,
    bgg_rating: game.bggRating,
    bgg_bayes_rating: game.bggBayesRating,
    bgg_weight: game.bggWeight,
    mechanics: collectionGameMechanicNames(game),
    categories: collectionGameCategoryNames(game),
    designers: [...game.designers].sort((left, right) => left.localeCompare(right)),
    play_mode: game.playMode,
    community_players: [...game.communityPlayers].sort((left, right) => left - right),
    player_count_poll: asPollDtos(game.playerCountPoll),
    ranks: asRankDtos(game.ranks),
    in_bgg_collection: game.inBggCollection,
    manually_added: game.manuallyAdded,
    manually_removed: game.manuallyRemoved,
    hidden: game.hidden,
    source: game.source,
    last_synced_at: game.lastSyncedAt?.toISOString() ?? null,
    created_at: game.createdAt.toISOString()
  };
}

export function serializeCollectionGroup(group: CollectionGroupWithRelations) {
  const visibleGames = group.games
    .map((entry) => entry.collectionGame)
    .filter((game) => !game.hidden)
    .sort((left, right) => left.title.localeCompare(right.title));

  return {
    id: group.id,
    name: group.name,
    game_count: visibleGames.length,
    game_ids: visibleGames.map((game) => game.id),
    preview_games: visibleGames.slice(0, 4).map(serializeCollectionGame),
    created_at: group.createdAt.toISOString()
  };
}

export function serializeCollectionSyncState(state: CollectionSyncState | null) {
  if (!state) return null;
  return {
    bgg_username: state.bggUsername,
    last_synced_at: state.lastSyncedAt?.toISOString() ?? null,
    last_status: state.lastStatus,
    sync_in_progress: state.syncInProgress,
    sync_started_at: state.syncStartedAt?.toISOString() ?? null,
    sync_finished_at: state.syncFinishedAt?.toISOString() ?? null,
    total_games: state.totalGames,
    processed_games: state.processedGames
  };
}

export function serializeAvailability(item: Availability) {
  return {
    player_id: item.playerId,
    day: item.day,
    available: item.available
  };
}

export function serializeRating(item: Rating) {
  return {
    player_id: item.playerId,
    game_id: item.gameId,
    score: item.score
  };
}

