import { useEffect, useState } from 'react';

/** Landing header: expanded (2× height) after user scrolls past the hero. */
export function useLandingNavScroll(threshold = 48): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrolled;
}
