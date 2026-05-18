type BggExpansionCandidate = {
  title: string;
  itemType?: string | null;
  categories?: string[] | null;
};

type RpgCoreRuleCandidate = {
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

export function isRpgCoreRule(candidate: RpgCoreRuleCandidate) {
  if (candidate.itemType !== 'rpgitem') return false;

  const normalizedCategories = (candidate.categories ?? []).map((category) => category.toLowerCase());
  return normalizedCategories.includes('core rules (min needed to play)')
    || normalizedCategories.includes('alternate rules (variant core rules)');
}
