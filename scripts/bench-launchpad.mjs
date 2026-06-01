/**
 * Launchpad load benchmark (run: npm run bench:launchpad)
 * Measures registry API, CoinGecko, and optional STON sample.
 */

const ORIGIN = process.env.ORIGIN || 'https://www.openfragment.live';

async function timed(label, fn) {
  const t0 = performance.now();
  try {
    const result = await fn();
    const ms = Math.round(performance.now() - t0);
    console.log(`  ${label}: ${ms}ms OK`);
    return { ms, ok: true, result };
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    console.log(
      `  ${label}: ${ms}ms FAIL (${e instanceof Error ? e.message : e})`,
    );
    return { ms, ok: false };
  }
}

async function main() {
  console.log(`Origin: ${ORIGIN}\n`);

  const total0 = performance.now();

  await timed('GET /api/launchpad', async () => {
    const res = await fetch(`${ORIGIN}/api/launchpad?network=mainnet`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return { count: json.tokens?.length ?? 0, backend: json.backend };
  });

  await timed('CoinGecko TON/USD', async () => {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd',
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

  await timed('STON.fi (sample asset)', async () => {
    const res = await fetch(
      'https://api.ston.fi/v1/assets/EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
      { signal: AbortSignal.timeout(5000) },
    );
    return res.status;
  });

  console.log(`\nTotal script: ${Math.round(performance.now() - total0)}ms`);
  console.log(
    '\nIn the app: shell should paint demo cards instantly; enrich runs in background.',
  );
}

main();
