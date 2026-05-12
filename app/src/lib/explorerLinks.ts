import { Address } from '@ton/core';

export type ExplorerNetwork = 'mainnet' | 'testnet';

/** Friendly bounceable address for explorers (EQ… / kQ…). */
export function tryFriendlyJettonAddress(
  raw: string,
  network: ExplorerNetwork,
): string | null {
  try {
    return Address.parse(raw.trim()).toString({
      bounceable: true,
      testOnly: network === 'testnet',
    });
  } catch {
    return null;
  }
}

export function tonviewerJettonUrl(
  network: ExplorerNetwork,
  friendlyJetton: string,
): string {
  const base =
    network === 'testnet'
      ? 'https://testnet.tonviewer.com'
      : 'https://tonviewer.com';
  return `${base}/${friendlyJetton}`;
}

export function tonscanJettonUrl(friendlyJetton: string): string {
  return `https://tonscan.org/jetton/${encodeURIComponent(friendlyJetton)}`;
}

/** DYOR token page (RU path matches their site). */
export function dyorTokenUrl(friendlyJetton: string): string {
  return `https://dyor.io/ru/token/${encodeURIComponent(friendlyJetton)}`;
}

/** STON.fi swap TON → jetton (same pattern as app.ston.fi). */
export function stonFiSwapTonToJettonUrl(friendlyJetton: string): string {
  const p = new URLSearchParams({
    chartVisible: 'false',
    ft: 'TON',
    tt: friendlyJetton.trim(),
  });
  return `https://app.ston.fi/swap?${p.toString()}`;
}

/** DeDust portfolio for the connected wallet (holdings). */
export function dedustPortfolioUrl(walletFriendly: string): string {
  return `https://dedust.io/ru/portfolio/${encodeURIComponent(walletFriendly.trim())}`;
}
