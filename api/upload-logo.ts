import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Buffer } from 'node:buffer';

const CATBOX = 'https://catbox.moe/user/api.php';
const STASH = 'https://0x0.st';
const MAX_BYTES = 96 * 1024;
const UPSTREAM_MS = 7_000;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '200kb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  try {
    const raw = req.body;
    let parsed: Record<string, unknown>;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        res.status(400).end('Invalid JSON');
        return;
      }
    } else {
      parsed = (raw as Record<string, unknown> | null) ?? {};
    }

    const fileBase64 = parsed.fileBase64;
    const filename = parsed.filename;
    const mimeType = parsed.mimeType;

    if (typeof fileBase64 !== 'string' || typeof filename !== 'string') {
      res.status(400).end('Expected JSON: { fileBase64, filename, mimeType? }');
      return;
    }

    const buf = Buffer.from(fileBase64, 'base64');
    if (buf.length === 0 || buf.length > MAX_BYTES) {
      res.status(400).end('Invalid file size');
      return;
    }

    const safeName = filename.replace(/[^\w.\-]+/g, '_').slice(0, 120);
    const type =
      typeof mimeType === 'string' && mimeType.length > 0
        ? mimeType
        : 'application/octet-stream';

    const bin = new Uint8Array(buf);

    const postCatbox = () => {
      const fd = new FormData();
      fd.append('reqtype', 'fileupload');
      fd.append('fileToUpload', new Blob([bin], { type }), safeName);
      return fetch(CATBOX, {
        method: 'POST',
        body: fd,
        signal: AbortSignal.timeout(UPSTREAM_MS),
      });
    };

    const post0x0 = () => {
      const fd = new FormData();
      fd.append('file', new Blob([bin], { type }), safeName);
      return fetch(STASH, {
        method: 'POST',
        body: fd,
        signal: AbortSignal.timeout(UPSTREAM_MS),
      });
    };

    const [rc, rs] = await Promise.all([postCatbox(), post0x0()]);
    const tc = (await rc.text()).trim();
    const ts = (await rs.text()).trim();

    const pick =
      rc.ok && tc.startsWith('https://')
        ? tc
        : rs.ok && ts.startsWith('https://')
          ? ts
          : null;

    if (!pick) {
      res.status(502).end(tc || ts || 'Image hosts failed');
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(pick);
  } catch (e) {
    console.error('[api/upload-logo]', e);
    res.status(500).end('Upload failed');
  }
}
