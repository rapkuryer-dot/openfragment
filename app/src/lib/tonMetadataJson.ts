/**
 * TonAPI / Tonscan stack merges jetton display fields from an off-chain JSON
 * document pointed to by the TEP-64 on-chain `uri` key (semi-chain layout).
 * On-chain `social` strings are NOT read by github.com/tonkeeper/tongo tep64 parser.
 */

export function isAsciiOnlyUri(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 127) return false;
  }
  return true;
}

/** Returns an error message or null if valid / empty. */
export function validateHttpsAsciiMetadataUri(url: string): string | null {
  const t = url.trim();
  if (!t) return null;
  if (!isAsciiOnlyUri(t)) {
    return 'Metadata JSON URL must be ASCII only (TEP-64 uri).';
  }
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') {
      return 'Metadata JSON URL must start with https://';
    }
  } catch {
    return 'Invalid Metadata JSON URL';
  }
  return null;
}

/** If `raw` is non-empty, it must be a valid https URL (TonAPI / DYOR / links). */
export function validateOptionalHttpsUrl(
  fieldLabel: string,
  raw: string,
): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') {
      return `${fieldLabel}: use an https:// link`;
    }
  } catch {
    return `${fieldLabel}: invalid URL`;
  }
  return null;
}

export type TonApiJettonJsonInput = {
  name: string;
  symbol: string;
  decimals: string;
  description?: string;
  /** Public image URL (TonAPI JSON usually expects `image`, not raw base64). */
  image?: string;
  twitter?: string;
  telegram?: string;
  /** Primary project site (also added to `websites` in JSON). */
  website?: string;
  websites?: string[];
};

/** JSON shape similar to ton-assets jettons (see tonkeeper/ton-assets). */
export function buildTonApiJettonMetadataJson(
  input: TonApiJettonJsonInput,
): string {
  const social: string[] = [];
  if (input.twitter?.trim()) social.push(input.twitter.trim());
  if (input.telegram?.trim()) social.push(input.telegram.trim());

  const obj: Record<string, unknown> = {
    name: input.name.trim(),
    symbol: input.symbol.trim(),
    decimals: input.decimals.trim(),
  };
  if (input.description?.trim()) obj.description = input.description.trim();
  if (input.image?.trim()) obj.image = input.image.trim();
  if (social.length > 0) obj.social = social;
  const sites: string[] = [];
  if (input.website?.trim()) sites.push(input.website.trim());
  if (input.websites?.length) {
    for (const w of input.websites) {
      const t = w.trim();
      if (t && !sites.includes(t)) sites.push(t);
    }
  }
  obj.websites = sites;

  return `${JSON.stringify(obj, null, 2)}\n`;
}
