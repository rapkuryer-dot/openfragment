import { useEffect, useState } from 'react';

/** CoinGecko public endpoint; CORS OK from browsers. */
const TON_USD_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd';

const REFRESH_MS = 30_000;

export function TonPriceTicker() {
  const [usd, setUsd] = useState<number | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let intervalId = 0;

    const tick = async () => {
      try {
        const res = await fetch(TON_USD_URL);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as {
          'the-open-network'?: { usd?: number };
        };
        const v = data['the-open-network']?.usd;
        if (typeof v !== 'number' || !Number.isFinite(v))
          throw new Error('bad');
        if (!cancelled) {
          setUsd(v);
          setStale(false);
        }
      } catch {
        if (!cancelled) setStale(true);
      }
    };

    void tick();
    intervalId = window.setInterval(() => void tick(), REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const formatted =
    usd != null
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: usd < 1 ? 4 : 2,
        }).format(usd)
      : stale
        ? '—'
        : '…';

  return (
    <div
      className="fixed bottom-4 left-4 z-40 max-sm:bottom-3 max-sm:left-3 max-sm:right-auto pointer-events-none"
      aria-live="polite"
      aria-label="TON to US dollar price"
    >
      <div className="pointer-events-auto rounded-full border border-black/[0.08] bg-white/90 px-3.5 py-2 shadow-sm backdrop-blur-md font-display text-[13px] font-semibold text-[#0A0A0B] tabular-nums">
        <span className="text-[#0098EA]">TON</span>
        <span className="mx-1.5 text-black/25">/</span>
        <span>USD</span>
        <span className="ml-2 text-black/80">{formatted}</span>
      </div>
    </div>
  );
}
