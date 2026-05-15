const BGG_API_TOKEN = process.env.BGG_API_TOKEN?.trim() || '';
const IS_DEV = process.env.NODE_ENV !== 'production';

export const BGG_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari',
  Accept: 'application/xml,text/xml,*/*',
  'Accept-Language': 'nl-BE,nl;q=0.9,en;q=0.8'
} as const;

function withBggHeaders(init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  for (const [key, value] of Object.entries(BGG_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }

  if (BGG_API_TOKEN && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${BGG_API_TOKEN}`);
  }

  return {
    ...init,
    headers
  } satisfies RequestInit;
}

export async function fetchBgg(url: string, init: RequestInit = {}, context = 'request') {
  const requestInit = withBggHeaders(init);

  if (IS_DEV) {
    console.info(`[BGG:${context}] request`, {
      url,
      hasToken: Boolean(BGG_API_TOKEN),
      method: requestInit.method ?? 'GET'
    });
  }

  try {
    const response = await fetch(url, requestInit);

    if (IS_DEV) {
      console.info(`[BGG:${context}] response`, {
        url,
        status: response.status,
        ok: response.ok
      });
    }

    return response;
  } catch (error) {
    if (IS_DEV) {
      console.error(`[BGG:${context}] network error`, {
        url,
        hasToken: Boolean(BGG_API_TOKEN),
        error: error instanceof Error ? error.message : String(error)
      });
    }
    throw error;
  }
}
