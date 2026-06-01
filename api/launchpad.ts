import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Public launchpad registry (all visitors, wallet optional).
 *
 *   GET  /api/launchpad?network=mainnet  → { tokens, persisted, backend }
 *   POST /api/launchpad { address, network, name?, symbol?, ... }
 *
 * Storage: KV_REST_* → REDIS_URL (Upstash REST) → jsonblob fallback.
 */

interface RegisteredToken {
  address: string;
  network: 'mainnet' | 'testnet';
  devWallet?: string;
  name?: string;
  symbol?: string;
  image?: string;
  createdAt: number;
}

type NetworkKey = 'mainnet' | 'testnet';
type RegistryBlob = Record<NetworkKey, Record<string, RegisteredToken>>;
type RestStore = { url: string; token: string; label: 'kv' | 'redis' };

const KV_URL = process.env.KV_REST_API_URL?.trim();
const KV_TOKEN = process.env.KV_REST_API_TOKEN?.trim();
const REDIS_URL = process.env.REDIS_URL?.trim();
const BLOB_ID =
  process.env.LAUNCHPAD_REGISTRY_BLOB_ID?.trim() ||
  '019e82e5-370b-74f5-8be7-f7f0965cd1e2';
const MAX_TOKENS = 500;
const JSONBLOB_TIMEOUT_MS = 10_000;
const REST_TIMEOUT_MS = 8_000;

function parseRedisUrlToRest(url: string): { url: string; token: string } | null {
  try {
    const u = new URL(url);
    const token = decodeURIComponent(u.password || u.username || '');
    if (!token || !u.hostname) return null;
    return { url: `https://${u.hostname}`, token };
  } catch {
    return null;
  }
}

function restStore(): RestStore | null {
  if (KV_URL && KV_TOKEN) {
    return { url: KV_URL, token: KV_TOKEN, label: 'kv' };
  }
  if (REDIS_URL) {
    const parsed = parseRedisUrlToRest(REDIS_URL);
    if (parsed) return { ...parsed, label: 'redis' };
  }
  return null;
}

function blobEnabled(): boolean {
  return Boolean(BLOB_ID);
}

function kvKey(network: NetworkKey): string {
  return `openfragment:tokens:${network}`;
}

function jsonBlobUrl(): string {
  return `https://jsonblob.com/api/jsonBlob/${BLOB_ID}`;
}

async function redisRest(command: unknown[], store: RestStore): Promise<unknown> {
  const res = await fetch(store.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${store.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(REST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${store.label} REST ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
  }
  const json = (await res.json()) as { result?: unknown };
  return json.result;
}

async function readBlob(): Promise<RegistryBlob> {
  const res = await fetch(jsonBlobUrl(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(JSONBLOB_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`jsonblob GET ${res.status}`);
  const json = (await res.json()) as Partial<RegistryBlob>;
  return {
    mainnet:
      json.mainnet && typeof json.mainnet === 'object' && !Array.isArray(json.mainnet)
        ? json.mainnet
        : {},
    testnet:
      json.testnet && typeof json.testnet === 'object' && !Array.isArray(json.testnet)
        ? json.testnet
        : {},
  };
}

async function writeBlob(data: RegistryBlob): Promise<void> {
  const res = await fetch(jsonBlobUrl(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(JSONBLOB_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`jsonblob PUT ${res.status}`);
}

function tokenKey(address: string): string {
  return address.trim();
}

function sortNewest(tokens: RegisteredToken[]): RegisteredToken[] {
  return [...tokens].sort((a, b) => b.createdAt - a.createdAt);
}

function tokensFromHgetall(raw: unknown): RegisteredToken[] {
  const tokens: RegisteredToken[] = [];
  if (Array.isArray(raw)) {
    for (let i = 1; i < raw.length; i += 2) {
      try {
        tokens.push(JSON.parse(String(raw[i])) as RegisteredToken);
      } catch {
        /* skip malformed */
      }
    }
  } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const v of Object.values(raw as Record<string, string>)) {
      try {
        tokens.push(JSON.parse(String(v)) as RegisteredToken);
      } catch {
        /* skip malformed */
      }
    }
  }
  return tokens;
}

function mergeCreatedAt(entry: RegisteredToken, prevRaw: string | null | undefined): void {
  if (!prevRaw) return;
  try {
    const prev = JSON.parse(prevRaw) as RegisteredToken;
    if (prev.createdAt < entry.createdAt) entry.createdAt = prev.createdAt;
  } catch {
    /* keep new createdAt */
  }
}

function storageBackend(): 'kv' | 'redis' | 'jsonblob' | 'none' {
  const store = restStore();
  if (store) return store.label;
  if (blobEnabled()) return 'jsonblob';
  return 'none';
}

async function listTokens(
  network: NetworkKey,
): Promise<{ tokens: RegisteredToken[]; persisted: boolean; backend: string }> {
  const store = restStore();
  if (store) {
    try {
      const raw = await redisRest(['HGETALL', kvKey(network)], store);
      return {
        tokens: sortNewest(tokensFromHgetall(raw)).slice(0, MAX_TOKENS),
        persisted: true,
        backend: store.label,
      };
    } catch (e) {
      console.error('[launchpad] REST list failed', e);
      if (!blobEnabled()) throw e;
    }
  }

  if (blobEnabled()) {
    const blob = await readBlob();
    const tokens = Object.values(blob[network] ?? {});
    return {
      tokens: sortNewest(tokens).slice(0, MAX_TOKENS),
      persisted: true,
      backend: 'jsonblob',
    };
  }

  return { tokens: [], persisted: false, backend: 'none' };
}

async function upsertToken(
  entry: RegisteredToken,
): Promise<{ persisted: boolean; backend: string }> {
  const network = entry.network;
  const key = tokenKey(entry.address);
  const hashKey = kvKey(network);
  const store = restStore();

  if (store) {
    try {
      const prev = (await redisRest(['HGET', hashKey, key], store)) as string | null;
      mergeCreatedAt(entry, prev);
      await redisRest(['HSET', hashKey, key, JSON.stringify(entry)], store);
      return { persisted: true, backend: store.label };
    } catch (e) {
      console.error('[launchpad] REST upsert failed', e);
      if (!blobEnabled()) throw e;
    }
  }

  if (blobEnabled()) {
    const blob = await readBlob();
    const bucket = blob[network] ?? {};
    const prev = bucket[key];
    if (prev && prev.createdAt < entry.createdAt) {
      entry.createdAt = prev.createdAt;
    }
    bucket[key] = entry;
    blob[network] = bucket;

    const all = Object.values(blob.mainnet).length + Object.values(blob.testnet).length;
    if (all > MAX_TOKENS) {
      const sorted = sortNewest([
        ...Object.values(blob.mainnet),
        ...Object.values(blob.testnet),
      ]);
      const keep = new Set(
        sorted.slice(0, MAX_TOKENS).map((t) => `${t.network}:${tokenKey(t.address)}`),
      );
      for (const net of ['mainnet', 'testnet'] as const) {
        for (const k of Object.keys(blob[net])) {
          if (!keep.has(`${net}:${k}`)) delete blob[net][k];
        }
      }
    }

    await writeBlob(blob);
    return { persisted: true, backend: 'jsonblob' };
  }

  return { persisted: false, backend: 'none' };
}

function sanitize(s: unknown, max: number): string | undefined {
  if (typeof s !== 'string') return undefined;
  const t = s.trim().slice(0, max);
  return t.length ? t : undefined;
}

function parseCreatedAt(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : Date.now();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const n = Array.isArray(req.query.network)
        ? req.query.network[0]
        : req.query.network;
      const network = n === 'testnet' ? 'testnet' : 'mainnet';

      const { tokens, persisted, backend } = await listTokens(network);

      res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
      res.status(200).json({
        tokens,
        persisted,
        backend: persisted ? backend : storageBackend(),
      });
      return;
    }

    if (req.method === 'POST') {
      const body =
        typeof req.body === 'string'
          ? (JSON.parse(req.body) as Record<string, unknown>)
          : ((req.body as Record<string, unknown> | null) ?? {});

      const address = sanitize(body.address, 80);
      if (!address) {
        res.status(400).json({ error: 'address required' });
        return;
      }
      const network = body.network === 'testnet' ? 'testnet' : 'mainnet';

      const entry: RegisteredToken = {
        address,
        network,
        devWallet: sanitize(body.devWallet, 80),
        name: sanitize(body.name, 64),
        symbol: sanitize(body.symbol, 32),
        image: sanitize(body.image, 1024),
        createdAt: parseCreatedAt(body.createdAt),
      };

      const { persisted, backend } = await upsertToken(entry);
      res.status(200).json({ ok: true, persisted, backend });
      return;
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (e) {
    console.error('[api/launchpad]', e);
    res.status(500).json({ error: 'Registry error' });
  }
}
