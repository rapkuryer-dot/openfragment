import { useEffect, useState } from 'react';

const TICKER_PROBE = '[data-ton-ticker-probe]';

/**
 * Dark pill only when the pixel under the TON ticker (ignoring the ticker itself)
 * hits the landing reveal panel — not when a hidden panel sits under the white layer.
 */
export function useTickerOverDark(enabled: boolean): boolean {
  const [overDark, setOverDark] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setOverDark(false);
      return;
    }

    const check = () => {
      const x = 88;
      const y = window.innerHeight - 28;
      const stack = document.elementsFromPoint(x, y);

      for (const el of stack) {
        if (el.closest(TICKER_PROBE)) continue;
        if (el.closest('.of-reveal-content')) {
          setOverDark(false);
          return;
        }
        if (el.closest('.of-reveal-panel')) {
          setOverDark(true);
          return;
        }
      }
      setOverDark(false);
    };

    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check, { passive: true });
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [enabled]);

  return overDark;
}
