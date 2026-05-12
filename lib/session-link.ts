function slugifySegment(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return normalized || 'spelavond';
}

export function sessionPath(sessionId: string, sessionTitle?: string | null) {
  if (!sessionTitle?.trim()) return `/s/${sessionId}`;
  return `/s/${sessionId}/${slugifySegment(sessionTitle)}`;
}

export function sessionUrl(origin: string, sessionId: string, sessionTitle?: string | null) {
  return `${origin}${sessionPath(sessionId, sessionTitle)}`;
}
