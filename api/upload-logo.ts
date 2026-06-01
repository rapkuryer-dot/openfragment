import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Buffer } from 'node:buffer';

const CATBOX = 'https://catbox.moe/user/api.php';
const STASH = 'https://0x0.st';
const MAX_BYTES = 96 * 1024;
const UPSTREAM_MS = 7_000;

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

/**
 * Confirm the raw bytes really are one of the allowed image formats by checking
 * the file signature (magic numbers). Prevents this endpoint from being abused
 * as an open relay to host arbitrary content (malware/phishing) via catbox/0x0.
 */
function sniffImageMime(bytes: Uint8Array): string | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  // GIF: "GIF87a" / "GIF89a"
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'image/gif';
  }
  // WEBP: "RIFF"...."WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

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

    const bin = new Uint8Array(buf);

    // Verify the actual bytes are a real image; never trust the client MIME.
    const sniffed = sniffImageMime(bin);
    if (!sniffed) {
      res.status(415).end('Only PNG, JPEG, WebP or GIF images are allowed');
      return;
    }
    if (
      typeof mimeType === 'string' &&
      mimeType.length > 0 &&
      !ALLOWED_MIME.has(mimeType)
    ) {
      res.status(415).end('Unsupported image type');
      return;
    }

    const safeName = filename.replace(/[^\w.\-]+/g, '_').slice(0, 120);
    const type = sniffed;

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
