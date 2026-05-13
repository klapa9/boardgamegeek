import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const CACHEABLE_IMAGE_HOSTS = new Set(['cf.geekdo-images.com', 'cf.geekdo-static.com']);
const IMAGE_CACHE_ROOT = path.join(process.cwd(), '.cache', 'bgg-images');

type ImageKind = 'thumb' | 'full';

type CachedImageParams = {
  url: string;
  kind: ImageKind;
  bggId?: number | null;
};

type CachedImageFile = {
  body: Buffer;
  contentType: string;
};

type CacheMeta = {
  contentType: string;
  sourceUrl: string;
  fetchedAt: string;
};

const BGG_IMAGE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari',
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
};

function normalizeRemoteUrl(url: string | null | undefined) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !CACHEABLE_IMAGE_HOSTS.has(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function cacheKey({ url, kind, bggId }: CachedImageParams) {
  const base = bggId ? `${kind}-${bggId}` : `${kind}-${crypto.createHash('sha1').update(url).digest('hex')}`;
  return base.toLowerCase();
}

function cachePaths(params: CachedImageParams) {
  const key = cacheKey(params);
  const directory = path.join(IMAGE_CACHE_ROOT, params.kind);
  return {
    directory,
    bodyPath: path.join(directory, `${key}.bin`),
    metaPath: path.join(directory, `${key}.json`)
  };
}

async function ensureCacheDirectory(directory: string) {
  await fs.mkdir(directory, { recursive: true });
}

async function readCachedImage(params: CachedImageParams): Promise<CachedImageFile | null> {
  const { bodyPath, metaPath } = cachePaths(params);

  try {
    const [body, metaRaw] = await Promise.all([
      fs.readFile(bodyPath),
      fs.readFile(metaPath, 'utf8')
    ]);
    const meta = JSON.parse(metaRaw) as CacheMeta;
    return {
      body,
      contentType: meta.contentType || 'image/jpeg'
    };
  } catch {
    return null;
  }
}

async function writeCachedImage(params: CachedImageParams, file: CachedImageFile) {
  const { directory, bodyPath, metaPath } = cachePaths(params);
  await ensureCacheDirectory(directory);
  await Promise.all([
    fs.writeFile(bodyPath, file.body),
    fs.writeFile(metaPath, JSON.stringify({
      contentType: file.contentType,
      sourceUrl: params.url,
      fetchedAt: new Date().toISOString()
    } satisfies CacheMeta))
  ]);
}

async function downloadRemoteImage(url: string): Promise<CachedImageFile> {
  const response = await fetch(url, {
    headers: BGG_IMAGE_HEADERS,
    cache: 'no-store',
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`Afbeelding ophalen mislukt met HTTP ${response.status}.`);
  }

  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') ?? 'image/jpeg'
  };
}

export function cachedImageUrl(url: string | null | undefined, kind: ImageKind, bggId?: number | null) {
  const normalizedUrl = normalizeRemoteUrl(url);
  if (!normalizedUrl) return url ?? null;

  const searchParams = new URLSearchParams({
    kind,
    url: normalizedUrl
  });

  if (bggId) searchParams.set('bggId', String(bggId));
  return `/api/images/bgg?${searchParams.toString()}`;
}

export async function ensureCachedBggImage(url: string | null | undefined, kind: ImageKind, bggId?: number | null) {
  const normalizedUrl = normalizeRemoteUrl(url);
  if (!normalizedUrl) return null;

  const params = { url: normalizedUrl, kind, bggId } satisfies CachedImageParams;
  const existing = await readCachedImage(params);
  if (existing) return existing;

  const downloaded = await downloadRemoteImage(normalizedUrl);
  await writeCachedImage(params, downloaded);
  return downloaded;
}

export async function preloadBggThumbnail(bggId: number | null | undefined, thumbnailUrl: string | null | undefined) {
  if (!thumbnailUrl) return;
  try {
    await ensureCachedBggImage(thumbnailUrl, 'thumb', bggId ?? null);
  } catch {
    // Thumbnail caching is a best-effort optimization.
  }
}

