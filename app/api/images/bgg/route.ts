import { NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set(['cf.geekdo-images.com', 'cf.geekdo-static.com']);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');
  if (!rawUrl) return NextResponse.json({ error: 'Afbeeldings-url ontbreekt.' }, { status: 400 });

  let imageUrl: URL;
  try {
    imageUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Ongeldige afbeeldings-url.' }, { status: 400 });
  }

  if (imageUrl.protocol !== 'https:' || !ALLOWED_HOSTS.has(imageUrl.hostname)) {
    return NextResponse.json({ error: 'Deze afbeeldingsbron is niet toegestaan.' }, { status: 400 });
  }

  try {
    const response = await fetch(imageUrl.toString(), { next: { revalidate: 60 * 60 * 24 * 30 } });
    if (!response.ok) return NextResponse.json({ error: 'Afbeelding ophalen mislukt.' }, { status: 502 });

    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800'
      }
    });
  } catch {
    return NextResponse.json({ error: 'Afbeelding tijdelijk niet bereikbaar.' }, { status: 502 });
  }
}
