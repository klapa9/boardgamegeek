type BggExpansionCandidate = {
  title: string;
  itemType?: string | null;
  categories?: string[] | null;
};

export function looksLikeFanExpansionTitle(title: string) {
  const normalized = title.toLowerCase();
  return normalized.includes('fan expansion') || normalized.includes('fan expedition');
}

export function isBggExpansion(candidate: BggExpansionCandidate) {
  if (candidate.itemType === 'boardgameexpansion') return true;

  const normalizedCategories = (candidate.categories ?? []).map((category) => category.toLowerCase());
  if (normalizedCategories.includes('expansion for base-game')) return true;
  if (normalizedCategories.includes('fan expansion')) return true;

  return looksLikeFanExpansionTitle(candidate.title);
}
