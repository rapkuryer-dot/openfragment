import { useEffect, useState } from 'react';

/**
 * True when the landing page dark footer / reveal panel occupies the viewport
 * (used for nav + TON ticker contrast).
 */
export function useDarkFooterZone(selector = '.of-reveal-panel'): boolean {
  const [overDark, setOverDark] = useState(false);

  useEffect(() => {
    const el = document.querySelector(selector);
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        setOverDark(
          Boolean(entry?.isIntersecting && (entry.intersectionRatio ?? 0) > 0.12),
        );
      },
      { threshold: [0, 0.12, 0.28, 0.45] },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [selector]);

  return overDark;
}
