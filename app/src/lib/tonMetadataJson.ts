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

/**
 * Anonymously uploads the jetton metadata JSON to jsonblob.com and returns
 * a public https URL. TonAPI / Tonviewer / Stonks Lab / X1000 / Geckoterminal
 * fetch this URL via the TEP-64 on-chain `uri` key and merge socials/website
 * from it into the displayed token info.
 *
 * Returns `null` if upload fails — caller should fall back to on-chain-only.
 */
/**
 * Uploads a binary image (PNG/JPEG/WebP/GIF) anonymously to catbox.moe and
 * returns the public https URL. Used for jetton logo so TonAPI / Tonviewer
 * don't have to render giant base64 data: URLs (which they ignore or truncate).
 */
export async function uploadImageToCatbox(
  blob: Blob,
  filename: string,
): Promise<string | null> {
  const targets = [
    typeof window !== 'undefined' ? `${window.location.origin}/_img` : '/_img',
    'https://catbox.moe/user/api.php',
  ];
  for (const url of targets) {
    try {
      const fd = new FormData();
      fd.append('reqtype', 'fileupload');
      fd.append('fileToUpload', blob, filename);
      const res = await fetch(url, { method: 'POST', body: fd });
      console.log(`[OPENFRAGMENT] catbox(${url}) → HTTP ${res.status}`);
      if (!res.ok) continue;
      const text = (await res.text()).trim();
      if (text.startsWith('https://')) {
        console.log('[OPENFRAGMENT] Image hosted at:', text);
        return text;
      }
    } catch (err) {
      console.warn(`[OPENFRAGMENT] catbox upload failed:`, err);
    }
  }
  return null;
}

/**
 * Tries multiple anonymous JSON hosts. Returns the first public https URL that
 * succeeded, or `null` if all failed. Order matters: same-origin Vite proxy
 * comes first to dodge browser-level blocking (ad-blockers, privacy extensions,
 * VPN DNS rewriting, corporate proxies).
 */
async function postJson(url: string, body: string): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body,
  });
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
      name: 'jsonblob (via Vite proxy)',
      post: () =>
        postJson(
          typeof window !== 'undefined'
            ? `${window.location.origin}/_meta`
            : '/_meta',
          body,
        ),
      extract: async (r) => {
        const loc = r.headers.get('Location') || r.headers.get('x-jsonblob-id');
        if (!loc) return null;
        const id = loc.startsWith('/')
          ? loc.slice('/api/jsonBlob/'.length)
          : loc;
        return `https://jsonblob.com/api/jsonBlob/${id}`;
      },
    },
    {
      name: 'jsonblob (direct)',
      post: () => postJson('https://jsonblob.com/api/jsonBlob', body),
      extract: async (r) => {
        const loc = r.headers.get('Location');
        if (!loc) return null;
        return loc.startsWith('http') ? loc : `https://jsonblob.com${loc}`;
      },
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
