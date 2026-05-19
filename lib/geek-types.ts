export const GEEK_TYPES = ['boardgame', 'rpg'] as const;

export type GeekType = (typeof GEEK_TYPES)[number];

export function normalizeGeekType(value: unknown): GeekType {
  return value === 'rpg' || value === 'rpgitem' ? 'rpg' : 'boardgame';
}

export function geekApiBaseUrl(geekType: GeekType) {
  return geekType === 'rpg'
    ? 'https://rpggeek.com/xmlapi2'
    : 'https://boardgamegeek.com/xmlapi2';
}

export function geekApiItemType(geekType: GeekType) {
  return geekType === 'rpg' ? 'rpgitem' : 'boardgame';
}

export function geekTypeLabel(geekType: GeekType) {
  return geekType === 'rpg' ? 'RPGGeek' : 'BoardGameGeek';
}

export function geekTypeBadgeLabel(geekType: GeekType) {
  return geekType === 'rpg' ? 'RPG' : 'Boardgame';
}
