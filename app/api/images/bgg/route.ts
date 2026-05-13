import { NextResponse } from 'next/server';
import { ensureCachedBggImage } from '@/lib/image-cache';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');
  const kind = searchParams.get('kind');
  const rawBggId = searchParams.get('bggId');
  const bggId = rawBggId ? Number(rawBggId) : null;

  if (!rawUrl) return NextResponse.json({ error: 'Afbeeldings-url ontbreekt.' }, { status: 400 });
  if (kind !== 'thumb' && kind !== 'full') return NextResponse.json({ error: 'Ongeldige afbeeldingsvariant.' }, { status: 400 });

  try {
    const image = await ensureCachedBggImage(rawUrl, kind, Number.isFinite(bggId) ? bggId : null);
    if (!image) return NextResponse.json({ error: 'Deze afbeeldingsbron is niet toegestaan.' }, { status: 400 });

    return new NextResponse(new Uint8Array(image.body), {
      headers: {
        'Content-Type': image.contentType,
        'Cache-Control': kind === 'thumb'
          ? 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800'
          : 'public, max-age=3600, s-maxage=2592000, stale-while-revalidate=604800'
      }
    });
  } catch {
    return NextResponse.json({ error: 'Afbeelding tijdelijk niet bereikbaar.' }, { status: 502 });
  }
}

