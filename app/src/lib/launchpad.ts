import { Address } from '@ton/core';
import {
  buildLaunchpadDemoTokens,
  isDemoLaunchpadAddress,
  isLaunchpadDemoEnabled,
} from './launchpadDemo';
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
  address: string;
  isDemo?: boolean;
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
  circulatingSupply: number;
  mintable: boolean;
  devWallet: string | null;
  adminRevoked: boolean;
  createdAt?: number;
  priceUsd?: number;
  marketCapUsd?: number;
  graduationTargetUsd?: number;
  graduationProgress?: number;
  graduated?: boolean;
}

export const GRADUATION_TON = 1500;
export const GRADUATION_NEAR = 0.8;

const LS_KEY = 'of:launchpad:deploys';
const STON_CONCURRENCY = 4;
const STON_TIMEOUT_MS = 4_000;
const REGISTRY_TIMEOUT_MS = 3_500;
const TONCENTER_TIMEOUT_MS = 10_000;
const TON_USD_TTL_MS = 5 * 60_000;
const DEFAULT_GRADUATION_TARGET_USD = 68_000;
const TONCENTER_MAX_RETRIES = 1;

const BLOCKED_LAUNCHPAD = new Set([
  'EQBUzM_DIIpqt495xlZRPgbHVSvf6_kDbaelk2QMpbBiXmZX',
  '0:54cccfc3208a6ab78f79c656513e06c7552bdfebf9036da7a593640ca5b0625e',
]);

let tonUsdCache: { v: number; at: number } | null = null;
let tonUsdInflight: Promise<number | undefined> | null = null;
let tonUsdFailAt: number | null = null;
const TON_USD_FAIL_COOLDOWN_MS = 90_000;

function isBlockedAddress(address: string): boolean {
  const raw = rawAddress(address);
  if (raw && BLOCKED_LAUNCHPAD.has(raw)) return true;
  return BLOCKED_LAUNCHPAD.has(address.trim());
}

function pruneBlockedLocalDeploys(): void {
  const prev = getLocalDeploys();
  const list = prev.filter((t) => !isBlockedAddress(t.address));
  if (list.length !== prev.length) saveLocalDeploys(list);
}

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
    /* quota / disabled */
  }
}

async function postToRegistry(token: RegisteredToken): Promise<boolean> {
  try {
    const res = await fetch(`${originBase()}/api/launchpad`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(token),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { persisted?: boolean };
    return json.persisted === true;
  } catch {
    return false;
  }
}

export async function syncLocalDeploysToRegistry(
  network: Network,
): Promise<void> {
  const local = getLocalDeploys().filter((t) => t.network === network);
  if (local.length === 0) return;

  const registry = await fetchRegistry(network);
  const inRegistry = new Set(
    registry
      .map((t) => rawAddress(t.address))
      .filter((r): r is string => r != null),
  );

  const missing = local.filter((t) => {
    const raw = rawAddress(t.address);
    return raw != null && !inRegistry.has(raw);
  });

  await Promise.allSettled(missing.map((t) => postToRegistry(t)));
}

export async function registerDeploy(token: RegisteredToken): Promise<void> {
  if (isBlockedAddress(token.address)) return;
  const local = getLocalDeploys();
  if (!local.some((t) => t.address === token.address)) {
    saveLocalDeploys([...local, token]);
  }
  let ok = await postToRegistry(token);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 400));
    ok = await postToRegistry(token);
  }
  if (!ok && import.meta.env.DEV) {
    console.warn('[launchpad] Could not persist token to public registry');
  }
}

async function fetchRegistry(network: Network): Promise<RegisteredToken[]> {
  try {
    const res = await fetch(
      `${originBase()}/api/launchpad?network=${network}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
      },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { tokens?: RegisteredToken[] };
    return Array.isArray(json.tokens) ? json.tokens : [];
  } catch {
    return [];
  }
}

async function fetchTonUsd(): Promise<number | undefined> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd',
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!res.ok) return undefined;
    const json = (await res.json()) as {
      'the-open-network'?: { usd?: number };
    };
    const v = json['the-open-network']?.usd;
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

async function fetchTonUsdCached(): Promise<number | undefined> {
  if (tonUsdCache && Date.now() - tonUsdCache.at < TON_USD_TTL_MS) {
    return tonUsdCache.v;
  }
  if (tonUsdFailAt && Date.now() - tonUsdFailAt < TON_USD_FAIL_COOLDOWN_MS) {
    return undefined;
  }
  if (!tonUsdInflight) {
    tonUsdInflight = fetchTonUsd().finally(() => {
      tonUsdInflight = null;
    });
  }
  const v = await tonUsdInflight;
  if (v != null) {
    tonUsdCache = { v, at: Date.now() };
    tonUsdFailAt = null;
  } else {
    tonUsdFailAt = Date.now();
  }
  return v;
}

function graduationTargetUsd(tonUsd: number | undefined): number {
  return tonUsd != null
    ? GRADUATION_TON * tonUsd
    : DEFAULT_GRADUATION_TARGET_USD;
}

function tokenFromRegistry(
  reg: RegisteredToken,
  network: Network,
  targetUsd: number,
): LaunchpadToken {
  const supply = 1_000_000_000;
  return {
    address: reg.address,
    network,
    name: reg.name ?? 'Unknown Token',
    symbol: reg.symbol ?? '???',
    decimals: 9,
    image: reg.image,
    totalSupply: BigInt(supply) * 1_000_000_000n,
    circulatingSupply: supply,
    mintable: true,
    devWallet: reg.devWallet ?? null,
    adminRevoked: false,
    createdAt: reg.createdAt,
    graduationTargetUsd: targetUsd,
  };
}

function mergeTokens(
  network: Network,
  registry: RegisteredToken[],
  local: RegisteredToken[],
  targetUsd: number,
): LaunchpadToken[] {
  const byRaw = new Map<string, RegisteredToken>();
  for (const t of [...registry, ...local]) {
    if (isBlockedAddress(t.address)) continue;
    const raw = rawAddress(t.address);
    if (!raw || isDemoLaunchpadAddress(raw)) continue;
    const existing = byRaw.get(raw);
    if (!existing || t.createdAt < existing.createdAt) {
      byRaw.set(raw, { ...t, address: raw });
    }
  }

  const real: LaunchpadToken[] = [...byRaw.values()].map((reg) =>
    tokenFromRegistry(reg, network, targetUsd),
  );
  const demo = buildLaunchpadDemoTokens(network, targetUsd) as LaunchpadToken[];

  const merged = new Map<string, LaunchpadToken>();
  for (const t of [...demo, ...real]) merged.set(t.address, t);

  const tokens = [...merged.values()];
  tokens.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return tokens;
}

/** Synchronous snapshot for instant first paint (demo cards only, dev builds). */
export function getLaunchpadDemoSnapshot(network: Network): LaunchpadToken[] {
  if (!isLaunchpadDemoEnabled()) return [];
  return buildLaunchpadDemoTokens(
    network,
    DEFAULT_GRADUATION_TARGET_USD,
  ) as LaunchpadToken[];
}

export function isRealLaunchpadToken(t: LaunchpadToken): boolean {
  return !t.isDemo && !isDemoLaunchpadAddress(t.address);
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return out;
}

async function fetchPriceUsd(
  network: Network,
  friendlyAddress: string,
): Promise<number | undefined> {
  if (network !== 'mainnet' || isDemoLaunchpadAddress(friendlyAddress)) {
    return undefined;
  }
  try {
    const res = await fetch(
      `https://api.ston.fi/v1/assets/${encodeURIComponent(friendlyAddress)}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(STON_TIMEOUT_MS),
      },
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
      const n =
        typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {
    /* no liquidity */
  }
  return undefined;
}

function applyGraduationTarget(
  tokens: LaunchpadToken[],
  targetUsd: number,
): LaunchpadToken[] {
  return tokens.map((t) => {
    const next = { ...t, graduationTargetUsd: targetUsd };
    if (t.marketCapUsd != null) {
      next.graduationProgress = t.marketCapUsd / targetUsd;
      next.graduated = next.graduationProgress >= 1;
    }
    return next;
  });
}

/** Fast path: demo snapshot + registry (no Toncenter / STON / CoinGecko). */
export async function fetchLaunchpadShell(
  network: Network,
): Promise<LaunchpadToken[]> {
  pruneBlockedLocalDeploys();
  void syncLocalDeploysToRegistry(network);

  const [registry, local] = await Promise.all([
    fetchRegistry(network),
    Promise.resolve(getLocalDeploys().filter((t) => t.network === network)),
  ]);

  return mergeTokens(network, registry, local, DEFAULT_GRADUATION_TARGET_USD);
}

/** Enrich real tokens from chain + STON; demo-only returns immediately. */
export async function enrichLaunchpadTokens(
  network: Network,
  tokens: LaunchpadToken[],
): Promise<LaunchpadToken[]> {
  const real = tokens.filter(
    (t) => !t.isDemo && !isDemoLaunchpadAddress(t.address),
  );

  if (real.length === 0) {
    void fetchTonUsdCached();
    return applyGraduationTarget(tokens, DEFAULT_GRADUATION_TARGET_USD);
  }

  const tonUsd = await fetchTonUsdCached();
  const targetUsd = graduationTargetUsd(tonUsd);

  const realRaws = real.map((t) => t.address);
  const masterByRaw = new Map<
    string,
    Awaited<ReturnType<typeof fetchJettonMasters>>[number]
  >();

  try {
    const masters = await fetchJettonMasters(network, realRaws, {
      maxRetries: TONCENTER_MAX_RETRIES,
      timeoutMs: TONCENTER_TIMEOUT_MS,
    });
    for (const m of masters) {
      const raw = rawAddress(m.address) ?? m.address;
      masterByRaw.set(raw, m);
    }
  } catch {
    /* registry metadata is enough */
  }

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

  const out: LaunchpadToken[] = tokens.map((t) => {
    if (t.isDemo || isDemoLaunchpadAddress(t.address)) {
      return { ...t, graduationTargetUsd: targetUsd };
    }

    const m = masterByRaw.get(t.address);
    const decimals = parseInt(m?.metadata.decimals ?? '9') || 9;
    const totalSupply = m?.totalSupply ?? t.totalSupply;
    const circulatingSupply = Number(totalSupply) / 10 ** decimals;
    friendlyByRaw.set(t.address, friendlyOf(t.address));

    return {
      ...t,
      name: m?.metadata.name ?? t.name,
      symbol: m?.metadata.symbol ?? t.symbol,
      decimals,
      description: m?.metadata.description ?? t.description,
      image: m?.metadata.image ?? t.image,
      twitter: m?.metadata.twitter,
      telegram: m?.metadata.telegram,
      website: m?.metadata.website,
      metadataUri: m?.metadata.metadataUri,
      totalSupply,
      circulatingSupply,
      mintable: m?.mintable ?? t.mintable,
      devWallet: m?.adminAddress
        ? m.adminAddress.toString({
            bounceable: true,
            testOnly: network === 'testnet',
          })
        : t.devWallet,
      adminRevoked: m ? m.adminAddress === null : t.adminRevoked,
      graduationTargetUsd: targetUsd,
    };
  });

  await mapPool(real, STON_CONCURRENCY, async (t) => {
    const price = await fetchPriceUsd(
      network,
      friendlyByRaw.get(t.address) ?? t.address,
    );
    if (price != null) {
      t.priceUsd = price;
      t.marketCapUsd = price * t.circulatingSupply;
      t.graduationProgress = t.marketCapUsd / targetUsd;
      t.graduated = t.graduationProgress >= 1;
    }
    return t;
  });

  return out;
}

export async function fetchLaunchpad(
  network: Network,
): Promise<LaunchpadToken[]> {
  const shell = await fetchLaunchpadShell(network);
  if (shell.length === 0) return shell;
  return enrichLaunchpadTokens(network, shell);
}

/** Dev-only timing breakdown (call from console or tests). */
export async function benchmarkLaunchpadLoad(
  network: Network = 'mainnet',
): Promise<Record<string, number>> {
  const t0 = performance.now();
  const registry = await fetchRegistry(network);
  const tRegistry = performance.now();
  const shell = await fetchLaunchpadShell(network);
  const tShell = performance.now();
  const enriched = await enrichLaunchpadTokens(network, shell);
  const tEnrich = performance.now();
  return {
    registryMs: Math.round(tRegistry - t0),
    shellMs: Math.round(tShell - tRegistry),
    enrichMs: Math.round(tEnrich - tShell),
    totalMs: Math.round(tEnrich - t0),
    tokenCount: enriched.length,
    realCount: enriched.filter((t) => !t.isDemo).length,
  };
}
