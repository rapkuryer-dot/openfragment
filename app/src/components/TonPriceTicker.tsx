import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useTickerOverDark } from '@/hooks/useTickerOverDark';

/** CoinGecko public endpoint; CORS OK from browsers. */
const TON_USD_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd';

/** Public source page the price is read from (shown on hover / click). */
const TON_SOURCE_URL = 'https://www.coingecko.com/en/coins/toncoin';

const REFRESH_MS = 30_000;

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

  /** Landing dark footer — sit above logo row, minimal pill. */
  const onFooter = onLanding && overDark;

  return (
    <div
      data-ton-ticker-probe
      className={`fixed z-40 pointer-events-none ${
        onFooter
          ? 'bottom-[5.5rem] left-4 max-sm:bottom-[5.25rem] max-sm:left-3'
          : 'bottom-3 left-3 max-sm:bottom-2.5 max-sm:left-2.5'
      }`}
      aria-live="polite"
      aria-label="TON to US dollar price"
    >
      <a
        href={TON_SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Price source: CoinGecko · open Toncoin"
        className={`group pointer-events-auto inline-flex items-center rounded-full border shadow-sm backdrop-blur-md font-display font-semibold tabular-nums leading-none transition-all duration-300 ${
          onFooter
            ? 'gap-0 border-white/15 bg-[#0A0A0B]/80 px-1.5 py-0.5 text-[9px] text-white/90 hover:border-[#3DA8FF]/40'
            : 'gap-0 border-black/[0.08] bg-white/90 px-2 py-1 text-[10px] text-[#0A0A0B] hover:border-[#0098EA]/40 hover:bg-white'
        }`}
      >
        {onFooter ? (
          <>
            <span className="text-[#3DA8FF]">TON</span>
            <span className="mx-0.5 text-white/30">·</span>
            <span>{formatted}</span>
          </>
        ) : (
          <>
            <span className="text-[#0098EA]">TON</span>
            <span className="mx-0.5 text-black/25">/</span>
            <span className="text-black/55 text-[9px]">USD</span>
            <span className="ml-1 text-black/80">{formatted}</span>
            <ExternalLink className="ml-0.5 size-2 text-black/25 group-hover:text-[#0098EA]" />
          </>
        )}
      </a>
    </div>
  );
}
