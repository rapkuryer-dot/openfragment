import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Minimal probe — registry logic restored after Vercel cold-start is confirmed. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    method: req.method ?? 'GET',
    probe: 'launchpad-v2',
  });
}
