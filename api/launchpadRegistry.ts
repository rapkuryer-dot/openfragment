/**
 * Shared launchpad registry — works for all visitors without a wallet.
 *
 * 1. Vercel KV / Upstash (KV_REST_API_URL + KV_REST_API_TOKEN) when linked.
 * 2. jsonblob.com fallback (LAUNCHPAD_REGISTRY_BLOB_ID or built-in default).
 */

export interface RegisteredToken {
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

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const BLOB_ID =
  process.env.LAUNCHPAD_REGISTRY_BLOB_ID?.trim() ||
  '019e82e5-370b-74f5-8be7-f7f0965cd1e2';
const MAX_TOKENS = 500;
const JSONBLOB_TIMEOUT_MS = 10_000;

/** Default public registry blob (empty lists). Override via env if needed. */
export const DEFAULT_LAUNCHPAD_REGISTRY_BLOB_ID = BLOB_ID;

function kvEnabled(): boolean {
  return Boolean(KV_URL && KV_TOKEN);
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

async function kv(command: unknown[]): Promise<unknown> {
  const res = await fetch(KV_URL!, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`KV ${res.status}`);
  const json = (await res.json()) as { result?: unknown };
  return json.result;
}

function emptyBlob(): RegistryBlob {
  return { mainnet: {}, testnet: {} };
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

export function storageBackend(): 'kv' | 'jsonblob' | 'none' {
  if (kvEnabled()) return 'kv';
  if (blobEnabled()) return 'jsonblob';
  return 'none';
}

export async function listTokens(
  network: NetworkKey,
): Promise<{ tokens: RegisteredToken[]; persisted: boolean; backend: string }> {
  if (kvEnabled()) {
    const raw = (await kv(['HGETALL', kvKey(network)])) as unknown[] | null;
    const tokens: RegisteredToken[] = [];
    if (Array.isArray(raw)) {
      for (let i = 1; i < raw.length; i += 2) {
        try {
          tokens.push(JSON.parse(String(raw[i])) as RegisteredToken);
        } catch {
          /* skip malformed */
        }
      }
    }
    return {
      tokens: sortNewest(tokens).slice(0, MAX_TOKENS),
      persisted: true,
      backend: 'kv',
    };
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

export async function upsertToken(
  entry: RegisteredToken,
): Promise<{ persisted: boolean; backend: string }> {
  const network = entry.network;
  const key = tokenKey(entry.address);

  if (kvEnabled()) {
    const raw = (await kv(['HGET', kvKey(network), key])) as string | null;
    if (raw) {
      try {
        const prev = JSON.parse(raw) as RegisteredToken;
        if (prev.createdAt < entry.createdAt) entry.createdAt = prev.createdAt;
      } catch {
        /* keep new createdAt */
      }
    }
    await kv(['HSET', kvKey(network), key, JSON.stringify(entry)]);
    return { persisted: true, backend: 'kv' };
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
