/**
 * TonAPI / Tonscan stack merges jetton display fields from an off-chain JSON
 * document pointed to by the TEP-64 on-chain `uri` key (semi-chain layout).
 * On-chain `social` strings are NOT read by github.com/tonkeeper/tongo tep64 parser.
 */

export function isAsciiOnlyUri(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 127) return false;
  }
  return true;
}

/** Returns an error message or null if valid / empty. */
export function validateHttpsAsciiMetadataUri(url: string): string | null {
  const t = url.trim();
  if (!t) return null;
  if (!isAsciiOnlyUri(t)) {
    return 'Metadata JSON URL must be ASCII only (TEP-64 uri).';
  }
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') {
      return 'Metadata JSON URL must start with https://';
    }
  } catch {
    return 'Invalid Metadata JSON URL';
  }
  return null;
}

/** If `raw` is non-empty, it must be a valid https URL (TonAPI / DYOR / links). */
export function validateOptionalHttpsUrl(
  fieldLabel: string,
  raw: string,
): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') {
      return `${fieldLabel}: use an https:// link`;
    }
  } catch {
    return `${fieldLabel}: invalid URL`;
  }
  return null;
}

export type TonApiJettonJsonInput = {
  name: string;
  symbol: string;
  decimals: string;
  description?: string;
  /** Public image URL (TonAPI JSON usually expects `image`, not raw base64). */
  image?: string;
  twitter?: string;
  telegram?: string;
  /** Primary project site (also added to `websites` in JSON). */
  website?: string;
  websites?: string[];
};

/** JSON shape similar to ton-assets jettons (see tonkeeper/ton-assets). */
export function buildTonApiJettonMetadataJson(
  input: TonApiJettonJsonInput,
): string {
  const social: string[] = [];
  if (input.twitter?.trim()) social.push(input.twitter.trim());
  if (input.telegram?.trim()) social.push(input.telegram.trim());

  const obj: Record<string, unknown> = {
    name: input.name.trim(),
    symbol: input.symbol.trim(),
    decimals: input.decimals.trim(),
  };
  if (input.description?.trim()) obj.description = input.description.trim();
  if (input.image?.trim()) obj.image = input.image.trim();
  if (social.length > 0) obj.social = social;
  const sites: string[] = [];
  if (input.website?.trim()) sites.push(input.website.trim());
  if (input.websites?.length) {
    for (const w of input.websites) {
      const t = w.trim();
      if (t && !sites.includes(t)) sites.push(t);
    }
  }
  obj.websites = sites;

  return `${JSON.stringify(obj, null, 2)}\n`;
}

const FETCH_TIMEOUT_MS = 22_000;
/** Logo upload: keep short so deploy never “hangs” on dead proxies. */
const LOGO_FETCH_MS = 14_000;

async function fetchWithTimeoutMs(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const tid = globalThis.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    globalThis.clearTimeout(tid);
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetchWithTimeoutMs(input, init, FETCH_TIMEOUT_MS);
}

/**
 * Hosted logo URL for metadata. Production: only `/api/upload-logo` (server
 * talks to catbox / mirror) — never call `/_img` or catbox from the browser on
 * Vercel (multipart via edge rewrite often hangs). Dev: Vite `/_img` proxy.
 */
export type LogoUploadInput = {
  base64: string;
  mimeType: string;
  filename: string;
};

export async function uploadImageToCatbox(
  input: LogoUploadInput,
): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const origin = window.location.origin;

  const toBlob = () =>
    new Blob(
      [Uint8Array.from(atob(input.base64), (c) => c.charCodeAt(0))],
      { type: input.mimeType },
    );

  const tryParseUrl = async (res: Response, label: string) => {
    const text = (await res.text()).trim();
    console.log(`[OPENFRAGMENT] ${label} → HTTP ${res.status}`);
    if (res.ok && text.startsWith('https://')) {
      console.log('[OPENFRAGMENT] Image hosted at:', text);
      return text;
    }
    return null;
  };

  try {
    const res = await fetchWithTimeoutMs(
      `${origin}/api/upload-logo`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: input.base64,
          filename: input.filename,
          mimeType: input.mimeType,
        }),
      },
      LOGO_FETCH_MS,
    );
    const url = await tryParseUrl(res, 'api/upload-logo');
    if (url) return url;
  } catch (err) {
    console.warn('[OPENFRAGMENT] api/upload-logo failed:', err);
  }

  if (import.meta.env.DEV) {
    try {
      const fd = new FormData();
      fd.append('reqtype', 'fileupload');
      fd.append('fileToUpload', toBlob(), input.filename);
      const res = await fetchWithTimeoutMs(
        `${origin}/_img`,
        { method: 'POST', body: fd },
        LOGO_FETCH_MS,
      );
      const url = await tryParseUrl(res, 'catbox (/_img dev proxy)');
      if (url) return url;
    } catch (err) {
      console.warn('[OPENFRAGMENT] /_img failed:', err);
    }
  }

  return null;
}

async function postJson(url: string, body: string): Promise<Response> {
  return fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body,
  });
}

/** jsonblob returns `Location` as full https URL or `/api/jsonBlob/{id}`; `x-jsonblob-id` may be bare id. */
function resolveJsonBlobPublicUrl(locationOrId: string | null): string | null {
  if (!locationOrId) return null;
  const loc = locationOrId.trim();
  if (!loc) return null;
  if (loc.startsWith('https://')) return loc;
  if (loc.startsWith('http://')) return `https://${loc.slice('http://'.length)}`;
  if (loc.startsWith('/')) return `https://jsonblob.com${loc}`;
  return `https://jsonblob.com/api/jsonBlob/${loc.replace(/^\/+/, '')}`;
}

/** Prefer Location / x-jsonblob-id; if fetch followed redirects, use final URL. */
function pickJsonBlobUrlFromResponse(r: Response): string | null {
  const fromHeader = resolveJsonBlobPublicUrl(
    r.headers.get('Location') || r.headers.get('x-jsonblob-id'),
  );
  if (fromHeader) return fromHeader;
  try {
    const u = new URL(r.url);
    if (u.hostname === 'jsonblob.com' && u.pathname.startsWith('/api/jsonBlob/')) {
      return `${u.origin}${u.pathname}`;
    }
  } catch {
    /* noop */
  }
  return null;
}

export async function uploadMetadataJson(
  input: TonApiJettonJsonInput,
): Promise<string | null> {
  const body = buildTonApiJettonMetadataJson(input);
  console.log(
    '[OPENFRAGMENT] Uploading metadata JSON, size:',
    body.length,
    'bytes',
  );

  const attempts: Array<{
    name: string;
    post: () => Promise<Response>;
    extract: (r: Response) => Promise<string | null>;
  }> = [
    {
      name: 'jsonblob (same-origin proxy)',
      post: () =>
        postJson(
          typeof window !== 'undefined'
            ? `${window.location.origin}/_meta`
            : '/_meta',
          body,
        ),
      extract: async (r) => pickJsonBlobUrlFromResponse(r),
    },
    {
      name: 'jsonblob (direct)',
      post: () => postJson('https://jsonblob.com/api/jsonBlob', body),
      extract: async (r) => pickJsonBlobUrlFromResponse(r),
    },
    {
      name: 'npoint.io',
      post: () => postJson('https://api.npoint.io/', body),
      extract: async (r) => {
        try {
          const j = (await r.json()) as { id?: string };
          return j.id ? `https://api.npoint.io/${j.id}` : null;
        } catch {
          return null;
        }
      },
    },
  ];

  for (const a of attempts) {
    try {
      const res = await a.post();
      console.log(`[OPENFRAGMENT] ${a.name} → HTTP ${res.status}`);
      if (!res.ok) continue;
      const url = await a.extract(res);
      if (url && isAsciiOnlyUri(url)) {
        console.log(`[OPENFRAGMENT] Metadata hosted at: ${url}`);
        return url;
      }
    } catch (err) {
      console.warn(`[OPENFRAGMENT] ${a.name} failed:`, err);
    }
  }
  return null;
}
