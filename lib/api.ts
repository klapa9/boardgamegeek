import { SessionBundle } from '@/lib/types';

function readableNetworkError(error: unknown) {
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return 'De server is tijdelijk niet bereikbaar. Controleer je verbinding en probeer opnieuw.';
  }
  return 'De server is tijdelijk niet bereikbaar. Probeer opnieuw.';
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {})
      },
      cache: 'no-store'
    });
  } catch (error) {
    throw new Error(readableNetworkError(error));
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : `Er ging iets mis (${response.status}).`;
    throw new Error(message);
  }
  return data as T;
}

export async function loadSessionBundle(sessionId: string): Promise<SessionBundle> {
  return api<SessionBundle>(`/api/sessions/${sessionId}`);
}
