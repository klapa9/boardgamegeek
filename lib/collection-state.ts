type CollectionStateInput = {
  inBggCollection: boolean;
  manuallyAdded: boolean;
  manuallyRemoved: boolean;
};

export function deriveCollectionPresentation(input: CollectionStateInput) {
  const hidden = input.manuallyRemoved || (!input.inBggCollection && !input.manuallyAdded);
  const source = input.inBggCollection ? 'bgg' : 'manual';

  return {
    hidden,
    source
  } as const;
}
