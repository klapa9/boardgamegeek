export const GEEK_TYPES = ['boardgame', 'rpgitem'] as const;

export type GeekType = (typeof GEEK_TYPES)[number];

export function normalizeGeekType(value: unknown): GeekType {
  return value === 'rpgitem' ? 'rpgitem' : 'boardgame';
}

export function geekApiBaseUrl(geekType: GeekType) {
  return geekType === 'rpgitem'
    ? 'https://rpggeek.com/xmlapi2'
    : 'https://boardgamegeek.com/xmlapi2';
}

export function geekTypeLabel(geekType: GeekType) {
  return geekType === 'rpgitem' ? 'RPGGeek' : 'BoardGameGeek';
}

export function geekTypeBadgeLabel(geekType: GeekType) {
  return geekType === 'rpgitem' ? 'RPG' : 'Boardgame';
}
