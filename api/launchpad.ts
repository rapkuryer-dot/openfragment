import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  listTokens,
  storageBackend,
  upsertToken,
  type RegisteredToken,
} from './launchpadRegistry';

/**
 * Public launchpad registry (all visitors, wallet optional).
 *
 *   GET  /api/launchpad?network=mainnet  → { tokens, persisted, backend }
 *   POST /api/launchpad { address, network, name?, symbol?, ... }
 */

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
