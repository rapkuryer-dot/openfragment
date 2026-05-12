import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Buffer } from 'node:buffer';

const CATBOX = 'https://catbox.moe/user/api.php';
const MAX_BYTES = 96 * 1024;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  try {
    const raw = req.body;
    const parsed =
      typeof raw === 'string'
        ? (JSON.parse(raw) as Record<string, unknown>)
        : (raw as Record<string, unknown> | null) ?? {};

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

    const fd = new FormData();
    fd.append('reqtype', 'fileupload');
    fd.append(
      'fileToUpload',
      new Blob([new Uint8Array(buf)], { type }),
      safeName,
    );

    const upstream = await fetch(CATBOX, {
      method: 'POST',
      body: fd,
      signal: AbortSignal.timeout(45_000),
    });

    const text = (await upstream.text()).trim();
    if (!upstream.ok) {
      res.status(502).end(text || 'Catbox HTTP error');
      return;
    }
    if (!text.startsWith('https://')) {
      res.status(502).end(text || 'Unexpected catbox response');
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(text);
  } catch (e) {
    console.error('[api/upload-logo]', e);
    res.status(500).end('Upload failed');
  }
}
