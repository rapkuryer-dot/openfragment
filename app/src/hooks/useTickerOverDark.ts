import { useEffect, useState } from 'react';

/**
 * True when the bottom-left TON ticker sits over the visible dark reveal panel
 * (not merely when the panel exists in the document).
 */
export function useTickerOverDark(enabled: boolean): boolean {
  const [overDark, setOverDark] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setOverDark(false);
      return;
    }

    const panel = document.querySelector('.of-reveal-panel');
    if (!panel) return;

    const check = () => {
      const rect = panel.getBoundingClientRect();
      const tickerY = window.innerHeight - 32;
      setOverDark(rect.top <= tickerY && rect.bottom > tickerY - 24);
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
