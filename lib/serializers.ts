import { Availability, CollectionGame, CollectionSyncState, Game, Player, Rating, Session } from '@prisma/client';

export function serializeSession(session: Session) {
  return {
    id: session.id,
    title: session.title,
    chosen_day: session.chosenDay,
    locked: session.locked,
    created_at: session.createdAt.toISOString()
  };
}

export function serializePlayer(player: Player) {
  return {
    id: player.id,
    session_id: player.sessionId,
    name: player.name,
    created_at: player.createdAt.toISOString()
  };
}

export function serializeGame(game: Game) {
  return {
    id: game.id,
    session_id: game.sessionId,
    title: game.title,
    bgg_id: game.bggId,
    year_published: game.yearPublished,
    image_url: game.imageUrl,
    min_players: game.minPlayers,
    max_players: game.maxPlayers,
    playing_time: game.playingTime,
    bgg_rating: game.bggRating,
    bgg_weight: game.bggWeight,
    mechanics: game.mechanics,
    play_mode: game.playMode,
    community_players: game.communityPlayers,
    added_by: game.addedBy,
    created_at: game.createdAt.toISOString()
  };
}

export function serializeCollectionGame(game: CollectionGame) {
  return {
    id: game.id,
    bgg_id: game.bggId,
    title: game.title,
    year_published: game.yearPublished,
    image_url: game.imageUrl,
    min_players: game.minPlayers,
    max_players: game.maxPlayers,
    playing_time: game.playingTime,
    bgg_rating: game.bggRating,
    bgg_weight: game.bggWeight,
    mechanics: game.mechanics,
    play_mode: game.playMode,
    community_players: game.communityPlayers,
    hidden: game.hidden,
    source: game.source,
    created_at: game.createdAt.toISOString()
  };
}

export function serializeCollectionSyncState(state: CollectionSyncState | null) {
  if (!state) return null;
  return {
    bgg_username: state.bggUsername,
    last_synced_at: state.lastSyncedAt?.toISOString() ?? null,
    last_status: state.lastStatus
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
