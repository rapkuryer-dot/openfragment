import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Server-side Toncenter proxy. Keeps TONCENTER_* API keys out of the browser
 * bundle: the client calls `/api/toncenter` (same origin) and this function
 * injects the key and forwards to Toncenter.
 *
 *  - GET  /api/toncenter?network=mainnet&path=/jetton/masters&<query>  → v3 REST
 *  - POST /api/toncenter?network=mainnet   (body = JSON-RPC)           → v2 jsonRPC
 */

const UPSTREAM_MS = 12_000;

const BASE: Record<string, string> = {
  mainnet: 'https://toncenter.com',
  testnet: 'https://testnet.toncenter.com',
};

// Only these v3 REST paths may be proxied (prevents open-proxy / SSRF abuse).
const ALLOWED_V3_PATHS = new Set([
  '/jetton/masters',
  '/jetton/wallets',
  '/accountStates',
]);

function apiKey(network: string): string | undefined {
  return network === 'testnet'
    ? process.env.TONCENTER_TESTNET_API_KEY
    : process.env.TONCENTER_MAINNET_API_KEY;
}

function networkOf(req: VercelRequest): 'mainnet' | 'testnet' {
  const n = Array.isArray(req.query.network)
    ? req.query.network[0]
    : req.query.network;
  return n === 'testnet' ? 'testnet' : 'mainnet';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const network = networkOf(req);
  const base = BASE[network]!;
  const key = apiKey(network);

  try {
    if (req.method === 'POST') {
      const upstream = await fetch(`${base}/api/v2/jsonRPC`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { 'X-API-Key': key } : {}),
        },
        body:
          typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
        signal: AbortSignal.timeout(UPSTREAM_MS),
      });
      const text = await upstream.text();
      res.status(upstream.status);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(text);
      return;
    }

    if (req.method === 'GET') {
      const rawPath = Array.isArray(req.query.path)
        ? req.query.path[0]
        : req.query.path;
      const path = typeof rawPath === 'string' ? rawPath : '';
      if (!ALLOWED_V3_PATHS.has(path)) {
        res.status(400).json({ error: 'Unsupported path' });
        return;
      }

      const search = new URLSearchParams();
      for (const [k, v] of Object.entries(req.query)) {
        if (k === 'network' || k === 'path') continue;
        if (Array.isArray(v)) {
          for (const item of v) search.append(k, item);
        } else if (typeof v === 'string') {
          search.append(k, v);
        }
      }

      const qs = search.toString();
      const upstream = await fetch(
        `${base}/api/v3${path}${qs ? `?${qs}` : ''}`,
        {
          headers: key ? { 'X-API-Key': key } : undefined,
          signal: AbortSignal.timeout(UPSTREAM_MS),
        },
      );
      const text = await upstream.text();
      res.status(upstream.status);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
      res.send(text);
      return;
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (e) {
    console.error('[api/toncenter]', e);
    res.status(502).json({ error: 'Upstream request failed' });
  }
}
