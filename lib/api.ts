import { SessionBundle } from '@/lib/types';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? 'Er ging iets mis');
  return data as T;
}

export async function loadSessionBundle(sessionId: string): Promise<SessionBundle> {
  return api<SessionBundle>(`/api/sessions/${sessionId}`);
}
