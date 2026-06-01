import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useTickerOverDark } from '@/hooks/useTickerOverDark';

/** CoinGecko public endpoint; CORS OK from browsers. */
const TON_USD_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd';

/** Public source page the price is read from (shown on hover / click). */
const TON_SOURCE_URL = 'https://www.coingecko.com/en/coins/toncoin';

const REFRESH_MS = 30_000;

const pillBase =
  'group pointer-events-auto inline-flex items-center gap-1 rounded-full border shadow-sm backdrop-blur-md font-display text-[11px] font-semibold tabular-nums leading-tight whitespace-nowrap px-2.5 py-1.5 min-h-[30px] transition-[border-color,background-color,color] duration-200';

export function TonPriceTicker() {
  const [usd, setUsd] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const onLanding =
    typeof window !== 'undefined' && window.location.pathname === '/';
  const overDark = useTickerOverDark(onLanding);

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

  const dark = onLanding && overDark;

  return (
    <div
      data-ton-ticker-probe
      className="fixed bottom-4 left-4 z-40 max-sm:bottom-3 max-sm:left-3 pointer-events-none"
      aria-live="polite"
      aria-label="TON to US dollar price"
    >
      <a
        href={TON_SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Price source: CoinGecko · open Toncoin"
        className={
          dark
            ? `${pillBase} border-white/20 bg-[#0A0A0B]/90 text-white hover:border-[#3DA8FF]/45`
            : `${pillBase} border-black/[0.08] bg-white/92 text-[#0A0A0B] hover:border-[#0098EA]/40 hover:bg-white`
        }
      >
        <span className={dark ? 'text-[#3DA8FF]' : 'text-[#0098EA]'}>TON</span>
        <span className={dark ? 'text-white/35' : 'text-black/25'}>/</span>
        <span className={dark ? 'text-white/55' : 'text-black/45'}>USD</span>
        <span className={dark ? 'text-white/95' : 'text-black/85'}>{formatted}</span>
        <ExternalLink
          className={`size-2.5 shrink-0 ${
            dark
              ? 'text-white/40 group-hover:text-[#3DA8FF]'
              : 'text-black/30 group-hover:text-[#0098EA]'
          }`}
        />
      </a>
    </div>
  );
}
