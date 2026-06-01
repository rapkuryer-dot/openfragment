import { TonClient } from '@ton/ton';
import { Address, beginCell } from '@ton/core';
import { QueryClient } from '@tanstack/react-query';

export type Network = 'mainnet' | 'testnet';

export const queryClient = new QueryClient();

const clients: Record<string, TonClient> = {};

const DIRECT_V2: Record<Network, string> = {
  mainnet: 'https://toncenter.com/api/v2/jsonRPC',
  testnet: 'https://testnet.toncenter.com/api/v2/jsonRPC',
};
const DIRECT_V3: Record<Network, string> = {
  mainnet: 'https://toncenter.com/api/v3',
  testnet: 'https://testnet.toncenter.com/api/v3',
};

function originBase(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/**
 * In production all Toncenter traffic goes through the same-origin
 * `/api/toncenter` proxy, which injects the API key server-side (the key is
 * never shipped in the browser bundle). Local `vite dev` has no serverless
 * functions, so it talks to Toncenter directly in keyless mode.
 */
function v2Endpoint(network: Network): string {
  if (import.meta.env.DEV) return DIRECT_V2[network];
  return `${originBase()}/api/toncenter?network=${network}`;
}

function buildV3Url(
  network: Network,
  path: string,
  params: Record<string, string | string[]>,
): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((item) => search.append(k, item));
    else search.append(k, v);
  }
  if (import.meta.env.DEV) {
    return `${DIRECT_V3[network]}${path}?${search.toString()}`;
  }
  const proxy = new URLSearchParams({ network, path });
  for (const [k, v] of search.entries()) proxy.append(k, v);
  return `${originBase()}/api/toncenter?${proxy.toString()}`;
}

export function getTonClient(network: Network): TonClient {
  if (!clients[network]) {
    clients[network] = new TonClient({ endpoint: v2Endpoint(network) });
  }
  return clients[network]!;
}

export async function getWalletAddress(
  client: TonClient,
  minterAddress: Address,
  ownerAddress: Address,
): Promise<Address> {
  const result = await client.runMethod(minterAddress, 'get_wallet_address', [
    {
      type: 'slice',
      cell: beginCell().storeAddress(ownerAddress).endCell(),
    },
  ]);
  return result.stack.readAddress();
}

export interface JettonMasterInfo {
  address: string;
  totalSupply: bigint;
  mintable: boolean;
  adminAddress: Address | null;
  metadata: {
    name?: string;
    symbol?: string;
    decimals?: string;
    description?: string;
    image?: string;
    twitter?: string;
    telegram?: string;
    website?: string;
    /** TEP-64 semi-chain off-chain JSON URL (TonAPI / Tonscan). */
    metadataUri?: string;
  };
}

async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  maxRetries = 4,
): Promise<Response> {
  let delay = 1000;
  for (let i = 0; i <= maxRetries; i++) {
    const res = await fetch(url, init);
    if (res.status === 429 && i < maxRetries) {
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
      continue;
    }
    return res;
  }
  throw new Error('Max retries exceeded');
}

function readMetaString(
  entry: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  if (!entry) return undefined;
  const direct = entry[key];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const extra = entry.extra;
  if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
    const v = (extra as Record<string, unknown>)[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function parseSocialLinksJson(raw: string | undefined): {
  twitter?: string;
  telegram?: string;
} {
  if (!raw) return {};
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return {};
    let twitter: string | undefined;
    let telegram: string | undefined;
    for (const item of arr) {
      if (typeof item !== 'string' || !item.trim()) continue;
      const u = item.toLowerCase();
      if (!twitter && (u.includes('twitter.com') || u.includes('x.com'))) {
        twitter = item.trim();
      }
      if (!telegram && u.includes('t.me')) telegram = item.trim();
    }
    return { twitter, telegram };
  } catch {
    return {};
  }
}

function parseWebsitesJson(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return undefined;
    for (const item of arr) {
      if (typeof item === 'string' && item.trim()) return item.trim();
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function parseMaster(
  master: Record<string, unknown>,
  metadataMap: Record<string, unknown> | undefined,
): JettonMasterInfo {
  const rawAddr = master.address as string;
  const metaEntry = (
    metadataMap?.[rawAddr] as
      | { token_info?: Record<string, unknown>[] }
      | undefined
  )?.token_info?.[0] as Record<string, unknown> | undefined;

  const socialFromLinks = parseSocialLinksJson(
    readMetaString(metaEntry, 'social') ??
      readMetaString(metaEntry, 'social_links'),
  );

  let adminAddr: Address | null = null;
  try {
    if (master.admin_address)
      adminAddr = Address.parse(master.admin_address as string);
  } catch {
    /* addr_none */
  }

  const jettonContent = master.jetton_content as
    | Record<string, unknown>
    | undefined;

  return {
    address: rawAddr,
    totalSupply: BigInt((master.total_supply as string) ?? '0'),
    mintable: Boolean(master.mintable),
    adminAddress: adminAddr,
    metadata: {
      name:
        (typeof metaEntry?.name === 'string' && metaEntry.name) || undefined,
      symbol:
        (typeof metaEntry?.symbol === 'string' && metaEntry.symbol) ||
        undefined,
      decimals:
        (metaEntry?.extra &&
        typeof metaEntry.extra === 'object' &&
        !Array.isArray(metaEntry.extra) &&
        typeof (metaEntry.extra as Record<string, unknown>).decimals ===
          'string'
          ? (metaEntry.extra as Record<string, string>).decimals
          : undefined) ||
        (typeof jettonContent?.decimals === 'string'
          ? (jettonContent.decimals as string)
          : undefined) ||
        undefined,
      description:
        (typeof metaEntry?.description === 'string' && metaEntry.description) ||
        undefined,
      image:
        (typeof metaEntry?.image === 'string' && metaEntry.image) || undefined,
      twitter: readMetaString(metaEntry, 'twitter') ?? socialFromLinks.twitter,
      telegram:
        readMetaString(metaEntry, 'telegram') ?? socialFromLinks.telegram,
      website:
        readMetaString(metaEntry, 'website') ??
        parseWebsitesJson(readMetaString(metaEntry, 'websites')),
      metadataUri: readMetaString(metaEntry, 'uri'),
    },
  };
}

export async function fetchJettonMaster(
  network: Network,
  address: string,
): Promise<JettonMasterInfo> {
  const url = buildV3Url(network, '/jetton/masters', {
    address,
    limit: '1',
    offset: '0',
  });
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`Toncenter API error: ${res.status}`);

  const json = await res.json();
  const masters = json.jetton_masters;
  if (!masters || masters.length === 0) throw new Error('Jetton not found');

  return parseMaster(masters[0], json.metadata);
}

/** Batch lookup for the launchpad: one request for many addresses. */
export async function fetchJettonMasters(
  network: Network,
  addresses: string[],
  options?: { maxRetries?: number; timeoutMs?: number },
): Promise<JettonMasterInfo[]> {
  if (addresses.length === 0) return [];
  const url = buildV3Url(network, '/jetton/masters', {
    address: addresses,
    limit: String(Math.min(addresses.length, 1000)),
    offset: '0',
  });
  const res = await fetchWithRetry(
    url,
    options?.timeoutMs
      ? { signal: AbortSignal.timeout(options.timeoutMs) }
      : undefined,
    options?.maxRetries ?? 4,
  );
  if (!res.ok) throw new Error(`Toncenter API error: ${res.status}`);
  const json = await res.json();
  const masters = (json.jetton_masters ?? []) as Record<string, unknown>[];
  return masters.map((m) => parseMaster(m, json.metadata));
}
