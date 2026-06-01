import { Address } from '@ton/core';
import { fetchJettonMasters, type Network } from './ton';

export interface RegisteredToken {
  address: string;
  network: Network;
  devWallet?: string;
  name?: string;
  symbol?: string;
  image?: string;
  createdAt: number;
}

export interface LaunchpadToken {
  /** Raw `0:hex` address (canonical key). */
  address: string;
  network: Network;
  name: string;
  symbol: string;
  decimals: number;
  description?: string;
  image?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  metadataUri?: string;
  totalSupply: bigint;
  /** Human-readable circulating supply (totalSupply / 10^decimals). */
  circulatingSupply: number;
  mintable: boolean;
  /** Dev / owner wallet (jetton admin). null = admin revoked. */
  devWallet: string | null;
  adminRevoked: boolean;
  /** Unix ms when first registered (deploy time), if known. */
  createdAt?: number;
  /** USD price from STON.fi, when the token has DEX liquidity. */
  priceUsd?: number;
  /** USD market cap = price × circulating supply, when price is known. */
  marketCapUsd?: number;
}

const LS_KEY = 'of:launchpad:deploys';

function originBase(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

function rawAddress(raw: string): string | null {
  try {
    return Address.parse(raw.trim()).toRawString();
  } catch {
    return null;
  }
}

/* ---------------- local (per-browser) registry ---------------- */

export function getLocalDeploys(): RegisteredToken[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as RegisteredToken[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveLocalDeploys(list: RegisteredToken[]) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(list.slice(-200)));
  } catch {
    /* quota / disabled — non-fatal */
  }
}

/** Record a freshly deployed token: shared registry (best-effort) + local. */
export async function registerDeploy(token: RegisteredToken): Promise<void> {
  const local = getLocalDeploys();
  if (!local.some((t) => t.address === token.address)) {
    saveLocalDeploys([...local, token]);
  }
  try {
    await fetch(`${originBase()}/api/launchpad`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(token),
    });
  } catch {
    /* registry offline — local copy still shows it for this visitor */
  }
}

/* ---------------- shared registry ---------------- */

async function fetchRegistry(network: Network): Promise<RegisteredToken[]> {
  try {
    const res = await fetch(
      `${originBase()}/api/launchpad?network=${network}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { tokens?: RegisteredToken[] };
    return Array.isArray(json.tokens) ? json.tokens : [];
  } catch {
    return [];
  }
}

/* ---------------- price (best-effort, STON.fi) ---------------- */

async function fetchPriceUsd(
  network: Network,
  friendlyAddress: string,
): Promise<number | undefined> {
  if (network !== 'mainnet') return undefined;
  try {
    const res = await fetch(
      `https://api.ston.fi/v1/assets/${encodeURIComponent(friendlyAddress)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return undefined;
    const json = (await res.json()) as { asset?: Record<string, unknown> };
    const a = json.asset ?? {};
    for (const k of [
      'dex_price_usd',
      'price_usd',
      'usd_price',
      'dex_usd_price',
    ]) {
      const v = a[k];
      const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {
    /* no liquidity / API down */
  }
  return undefined;
}

/* ---------------- main fetch ---------------- */

export async function fetchLaunchpad(
  network: Network,
): Promise<LaunchpadToken[]> {
  const [registry, local] = await Promise.all([
    fetchRegistry(network),
    Promise.resolve(getLocalDeploys().filter((t) => t.network === network)),
  ]);

  // Dedup by raw address; keep earliest createdAt + any dev wallet hint.
  const byRaw = new Map<string, RegisteredToken>();
  for (const t of [...registry, ...local]) {
    const raw = rawAddress(t.address);
    if (!raw) continue;
    const existing = byRaw.get(raw);
    if (!existing || t.createdAt < existing.createdAt) {
      byRaw.set(raw, { ...t, address: raw });
    }
  }

  const rawAddresses = [...byRaw.keys()];
  if (rawAddresses.length === 0) return [];

  const masters = await fetchJettonMasters(network, rawAddresses);
  const masterByRaw = new Map(
    masters.map((m) => [rawAddress(m.address) ?? m.address, m]),
  );

  const friendlyByRaw = new Map<string, string>();
  const friendlyOf = (raw: string): string => {
    try {
      return Address.parse(raw).toString({
        bounceable: true,
        testOnly: network === 'testnet',
      });
    } catch {
      return raw;
    }
  };

  const tokens: LaunchpadToken[] = [];
  for (const raw of rawAddresses) {
    const m = masterByRaw.get(raw);
    const reg = byRaw.get(raw)!;
    const decimals = parseInt(m?.metadata.decimals ?? '9') || 9;
    const totalSupply = m?.totalSupply ?? 0n;
    friendlyByRaw.set(raw, friendlyOf(raw));

    tokens.push({
      address: raw,
      network,
      name: m?.metadata.name ?? reg.name ?? 'Unknown Token',
      symbol: m?.metadata.symbol ?? reg.symbol ?? '???',
      decimals,
      description: m?.metadata.description,
      image: m?.metadata.image ?? reg.image,
      twitter: m?.metadata.twitter,
      telegram: m?.metadata.telegram,
      website: m?.metadata.website,
      metadataUri: m?.metadata.metadataUri,
      totalSupply,
      circulatingSupply: Number(totalSupply) / 10 ** decimals,
      mintable: m?.mintable ?? true,
      devWallet: m?.adminAddress
        ? m.adminAddress.toString({
            bounceable: true,
            testOnly: network === 'testnet',
          })
        : (reg.devWallet ?? null),
      adminRevoked: m ? m.adminAddress === null : false,
      createdAt: reg.createdAt,
    });
  }

  // Enrich with prices in parallel (best-effort; never blocks the list).
  await Promise.allSettled(
    tokens.map(async (t) => {
      const price = await fetchPriceUsd(
        network,
        friendlyByRaw.get(t.address) ?? t.address,
      );
      if (price != null) {
        t.priceUsd = price;
        t.marketCapUsd = price * t.circulatingSupply;
      }
    }),
  );

  // newest first
  tokens.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return tokens;
}
