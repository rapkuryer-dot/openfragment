import { beginCell, Cell, Dictionary } from '@ton/core';
import { isAsciiOnlyUri } from './tonMetadataJson';

const ONCHAIN_CONTENT_PREFIX = 0x00;
const OFFCHAIN_CONTENT_PREFIX = 0x01;
const SNAKE_DATA_PREFIX = 0x00;

/**
 * TEP-64 off-chain (semi/pure) content: a single ASCII URI to a JSON file
 * that TonAPI / Tonviewer / STON.fi / Geckoterminal fetch to render token info.
 * This keeps the on-chain state init tiny → wallets emulate the deploy fast,
 * no oversized-message hangs, and full social/website metadata is supported.
 */
export function buildOffchainContent(uri: string): Cell {
  const trimmed = uri.trim();
  if (!isAsciiOnlyUri(trimmed)) {
    throw new Error('Metadata URI must be ASCII only (TEP-64 spec).');
  }
  const data = Buffer.from(trimmed, 'utf-8');
  const firstChunkSize = 126;
  const chunkSize = 127;

  if (data.length <= firstChunkSize) {
    return beginCell()
      .storeUint(OFFCHAIN_CONTENT_PREFIX, 8)
      .storeBuffer(data)
      .endCell();
  }

  const chunks: Buffer[] = [];
  chunks.push(data.subarray(0, firstChunkSize));
  let offset = firstChunkSize;
  while (offset < data.length) {
    const end = Math.min(offset + chunkSize, data.length);
    chunks.push(data.subarray(offset, end));
    offset = end;
  }

  let cell: Cell | null = null;
  for (let i = chunks.length - 1; i >= 0; i--) {
    const builder = beginCell();
    if (i === 0) builder.storeUint(OFFCHAIN_CONTENT_PREFIX, 8);
    builder.storeBuffer(chunks[i]!);
    if (cell) builder.storeRef(cell);
    cell = builder.endCell();
  }
  return cell!;
}

const sha256Keys: Record<string, Buffer> = {};

async function sha256(key: string): Promise<Buffer> {
  if (!sha256Keys[key]) {
    const data = new TextEncoder().encode(key);
    const hash = await crypto.subtle.digest('SHA-256', data);
    sha256Keys[key] = Buffer.from(hash);
  }
  return sha256Keys[key]!;
}

function makeSnakeCell(data: Buffer): Cell {
  const firstChunkSize = 126;
  const chunkSize = 127;

  if (data.length <= firstChunkSize) {
    return beginCell()
      .storeUint(SNAKE_DATA_PREFIX, 8)
      .storeBuffer(data)
      .endCell();
  }

  const chunks: Buffer[] = [];
  chunks.push(data.subarray(0, firstChunkSize));
  let offset = firstChunkSize;
  while (offset < data.length) {
    const end = Math.min(offset + chunkSize, data.length);
    chunks.push(data.subarray(offset, end));
    offset = end;
  }

  let cell: Cell | null = null;
  for (let i = chunks.length - 1; i >= 0; i--) {
    const builder = beginCell();
    if (i === 0) {
      builder.storeUint(SNAKE_DATA_PREFIX, 8);
    }
    builder.storeBuffer(chunks[i]!);
    if (cell) {
      builder.storeRef(cell);
    }
    cell = builder.endCell();
  }
  return cell!;
}

export interface JettonMetadata {
  name: string;
  symbol: string;
  decimals: string;
  description?: string;
  image?: string;
  /** Base64-encoded raw image bytes (PNG/JPEG/WebP). Stored on-chain as `image_data`. */
  imageData?: string;
  /** Full URL, e.g. https://x.com/yourhandle or https://twitter.com/yourhandle */
  twitter?: string;
  /** Full URL, e.g. https://t.me/yourchannel */
  telegram?: string;
  /** Project website (stored on-chain as `websites` JSON array, TonAPI-style). */
  website?: string;
  /**
   * TEP-64 semi-chain: ASCII HTTPS URL of a JSON file (TonAPI / Tonscan merge).
   * Host the output of “Copy JSON for TonAPI” (GitHub raw, gist, static host).
   */
  metadataUri?: string;
}

export async function buildOnchainMetadata(
  metadata: JettonMetadata,
): Promise<Cell> {
  const dict = Dictionary.empty(
    Dictionary.Keys.Buffer(32),
    Dictionary.Values.Cell(),
  );

  const entries: [string, string][] = [
    ['name', metadata.name],
    ['symbol', metadata.symbol],
    ['decimals', metadata.decimals],
  ];
  if (metadata.description) entries.push(['description', metadata.description]);
  if (metadata.image) entries.push(['image', metadata.image]);

  // When an off-chain TEP-64 `uri` JSON is present, ALL socials live there.
  // Skip duplicating them on-chain — it bloats state init and breaks wallet
  // emulation (Tonkeeper hangs on the confirm screen for oversized payloads).
  const hasUri = Boolean(metadata.metadataUri?.trim());
  if (!hasUri) {
    if (metadata.twitter) entries.push(['twitter', metadata.twitter]);
    if (metadata.telegram) entries.push(['telegram', metadata.telegram]);
    const socialLinks: string[] = [];
    if (metadata.twitter?.trim()) socialLinks.push(metadata.twitter.trim());
    if (metadata.telegram?.trim()) socialLinks.push(metadata.telegram.trim());
    if (socialLinks.length > 0) {
      const socialJson = JSON.stringify(socialLinks);
      entries.push(['social', socialJson]);
      entries.push(['social_links', socialJson]);
    }
    if (metadata.website?.trim()) {
      entries.push(['websites', JSON.stringify([metadata.website.trim()])]);
    }
  }

  if (hasUri) {
    const uri = metadata.metadataUri!.trim();
    if (!isAsciiOnlyUri(uri)) {
      throw new Error(
        'Metadata JSON URL must contain only ASCII characters (TEP-64 `uri`). Use an https URL without non-Latin characters.',
      );
    }
    entries.push(['uri', uri]);
  }

  for (const [key, value] of entries) {
    const keyHash = await sha256(key);
    const valueCell = makeSnakeCell(Buffer.from(value, 'utf-8'));
    dict.set(keyHash, valueCell);
  }

  if (metadata.imageData) {
    const keyHash = await sha256('image_data');
    const valueCell = makeSnakeCell(Buffer.from(metadata.imageData, 'base64'));
    dict.set(keyHash, valueCell);
  }

  return beginCell()
    .storeUint(ONCHAIN_CONTENT_PREFIX, 8)
    .storeDict(dict)
    .endCell();
}
