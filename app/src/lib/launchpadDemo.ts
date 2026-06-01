import type { Network } from './ton';

/** Preview tokens for launchpad UI (not on-chain). Addresses use raw `0:ded…` prefix. */
export function isDemoLaunchpadAddress(address: string): boolean {
  return address.startsWith('0:ded');
}

const DEMO_NAMES: { name: string; symbol: string; seed: string }[] = [
  { name: 'Fragment Pepe', symbol: 'FPEPE', seed: 'fpepe' },
  { name: 'Open Moon', symbol: 'OMOON', seed: 'omoon' },
  { name: 'Tolk Cat', symbol: 'TCAT', seed: 'tcat' },
  { name: 'Blast Hamster', symbol: 'BHAM', seed: 'bham' },
  { name: 'Neon Frog', symbol: 'NFROG', seed: 'nfrog' },
  { name: 'Vault Duck', symbol: 'VDUCK', seed: 'vduck' },
  { name: 'Sigma Whale', symbol: 'SWHL', seed: 'swhl' },
  { name: 'Pixel Shiba', symbol: 'PSHIB', seed: 'pshib' },
  { name: 'Turbo Crab', symbol: 'TCRAB', seed: 'tcrab' },
  { name: 'Laser Owl', symbol: 'LOWL', seed: 'lowl' },
  { name: 'Chad Potato', symbol: 'CPOT', seed: 'cpot' },
  { name: 'Ghost Panda', symbol: 'GPND', seed: 'gpnd' },
  { name: 'Rocket Sloth', symbol: 'RSLO', seed: 'rslo' },
  { name: 'Diamond Ape', symbol: 'DAPE', seed: 'dape' },
  { name: 'Cyber Koala', symbol: 'CKOA', seed: 'ckoa' },
  { name: 'Magma Fox', symbol: 'MFOX', seed: 'mfox' },
  { name: 'Zen Penguin', symbol: 'ZPEN', seed: 'zpen' },
  { name: 'Alpha Corgi', symbol: 'ACOR', seed: 'acor' },
  { name: 'Bolt Tiger', symbol: 'BTGR', seed: 'btgr' },
  { name: 'Cosmic Bear', symbol: 'CBEAR', seed: 'cbear' },
  { name: 'Glitch Bunny', symbol: 'GBUN', seed: 'gbun' },
  { name: 'Hyper Seal', symbol: 'HSEL', seed: 'hsel' },
  { name: 'Iron Llama', symbol: 'ILLM', seed: 'illm' },
  { name: 'Jungle Bot', symbol: 'JBOT', seed: 'jbot' },
  { name: 'Karma Snake', symbol: 'KSNK', seed: 'ksnk' },
  { name: 'Lunar Wolf', symbol: 'LWOLF', seed: 'lwolf' },
  { name: 'Meta Crab', symbol: 'MCRB', seed: 'mcrb' },
  { name: 'Nova Fish', symbol: 'NFISH', seed: 'nfish' },
  { name: 'Omega Bat', symbol: 'OBAT', seed: 'obat' },
  { name: 'Prime Goat', symbol: 'PGOAT', seed: 'pgoat' },
  { name: 'Quantum Bee', symbol: 'QBEE', seed: 'qbee' },
  { name: 'Rogue Elk', symbol: 'RELK', seed: 'relk' },
  { name: 'Solar Moth', symbol: 'SMOTH', seed: 'smoth' },
  { name: 'Trinity Ant', symbol: 'TANT', seed: 'tant' },
  { name: 'Ultra Wasp', symbol: 'UWASP', seed: 'uwasp' },
];

/** ~$68k migration target at typical TON USD — 50–60k mcap ≈ 74–88% progress. */
const NEAR_GRADUATE_MCAPS = [52_000, 54_500, 56_000, 57_500, 59_000, 60_500];

function demoAddress(index: number): string {
  const hex = index.toString(16).padStart(2, '0');
  return `0:ded0000000000000000000000000000000000000000000000000000000000${hex}`;
}

export function buildLaunchpadDemoTokens(
  network: Network,
  graduationTargetUsd: number,
) {
  if (network !== 'mainnet') return [];
  // On by default (set VITE_LAUNCHPAD_DEMO=false to hide preview rows).
  if (import.meta.env.VITE_LAUNCHPAD_DEMO === 'false') return [];

  const now = Date.now();
  const supply = 1_000_000_000;
  const nearSet = new Set([0, 1, 2, 3, 4, 5]);

  return DEMO_NAMES.map((meta, i) => {
    const address = demoAddress(i + 1);
    const createdAt = now - (i + 1) * 3_600_000;
    const nearGrad = nearSet.has(i);
    const marketCapUsd = nearGrad
      ? NEAR_GRADUATE_MCAPS[i]!
      : Math.round(800 + ((i * 7919) % 18_000));
    const graduationProgress = marketCapUsd / graduationTargetUsd;
    const graduated = graduationProgress >= 1;

    return {
      address,
      network,
      name: meta.name,
      symbol: meta.symbol,
      decimals: 9,
      description: nearGrad
        ? 'Preview — almost at migration target'
        : 'Preview token for launchpad layout',
      image: undefined,
      totalSupply: BigInt(supply) * 1_000_000_000n,
      circulatingSupply: supply,
      mintable: i % 4 !== 0,
      devWallet:
        i % 7 === 0
          ? null
          : `0:dedev0000000000000000000000000000000000000000000000000000000${(i + 1).toString(16).padStart(2, '0')}`,
      adminRevoked: i % 7 === 0,
      createdAt,
      marketCapUsd,
      graduationTargetUsd,
      graduationProgress,
      graduated,
      isDemo: true,
    };
  });
}
