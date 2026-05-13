import { NextResponse } from 'next/server';
import { DEFAULT_BGG_USERNAME } from '@/lib/defaults';
import { startCollectionSync } from '@/lib/bgg-sync';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const requestedUsername = String(body.username ?? '').trim();
  const username = requestedUsername || DEFAULT_BGG_USERNAME;
  const xml = String(body.xml ?? '').trim();

  try {
    const result = await startCollectionSync({
      username,
      ...(xml ? { xml } : {})
    });

    return NextResponse.json(result, { status: result.started ? 202 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'BGG synchronisatie mislukt.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

