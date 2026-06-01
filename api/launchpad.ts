import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Launchpad registry. Tokens deployed through OpenFragment are recorded here so
 * the public Launchpad can list them (Toncenter cannot discover jettons by code
 * hash, so we keep our own index of addresses and enrich them live from chain).
 *
 * Storage: Vercel KV / Upstash Redis REST (env: KV_REST_API_URL +
 * KV_REST_API_TOKEN). If those are not set, the endpoint degrades gracefully —
 * GET returns an empty list and POST is a no-op — and the client still shows
 * the visitor's own recent deploys from localStorage.
 *
 *   GET  /api/launchpad?network=mainnet            → { tokens: RegisteredToken[] }
 *   POST /api/launchpad  { address, network, ... } → { ok, persisted }
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

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const MAX_TOKENS = 500;

function kvEnabled(): boolean {
  return Boolean(KV_URL && KV_TOKEN);
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

function key(network: string): string {
  return `openfragment:tokens:${network === 'testnet' ? 'testnet' : 'mainnet'}`;
}

function sanitize(s: unknown, max: number): string | undefined {
  if (typeof s !== 'string') return undefined;
  const t = s.trim().slice(0, max);
  return t.length ? t : undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const n = Array.isArray(req.query.network)
        ? req.query.network[0]
        : req.query.network;
      const network = n === 'testnet' ? 'testnet' : 'mainnet';

      if (!kvEnabled()) {
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({ tokens: [], persisted: false });
        return;
      }

      const raw = (await kv(['HGETALL', key(network)])) as unknown[] | null;
      const tokens: RegisteredToken[] = [];
      if (Array.isArray(raw)) {
        // HGETALL → [field, value, field, value, ...]
        for (let i = 1; i < raw.length; i += 2) {
          try {
            tokens.push(JSON.parse(String(raw[i])) as RegisteredToken);
          } catch {
            /* skip malformed */
          }
        }
      }
      tokens.sort((a, b) => b.createdAt - a.createdAt);

      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
      res.status(200).json({ tokens: tokens.slice(0, MAX_TOKENS), persisted: true });
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
        createdAt: Date.now(),
      };

      if (!kvEnabled()) {
        res.status(200).json({ ok: true, persisted: false });
        return;
      }

      await kv(['HSET', key(network), address, JSON.stringify(entry)]);
      res.status(200).json({ ok: true, persisted: true });
      return;
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (e) {
    console.error('[api/launchpad]', e);
    res.status(500).json({ error: 'Registry error' });
  }
}
