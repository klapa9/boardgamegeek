const CACHEABLE_IMAGE_HOSTS = new Set(['cf.geekdo-images.com', 'cf.geekdo-static.com']);

export function cachedImageUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !CACHEABLE_IMAGE_HOSTS.has(parsed.hostname)) return url;
    return `/api/images/bgg?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}
