const BOOT_RELOAD_KEY = 'of:boot-reload-once';

export function isChunkLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('failed to load module script') ||
    msg.includes('importing a module script failed') ||
    msg.includes('loading chunk') ||
    msg.includes('dynamically imported module') ||
    (err.name === 'TypeError' && msg.includes('failed to fetch'))
  );
}

/** One automatic hard reload when a stale JS chunk fails after deploy. */
export function tryReloadOnceForChunkError(): boolean {
  try {
    if (sessionStorage.getItem(BOOT_RELOAD_KEY) === '1') return false;
    sessionStorage.setItem(BOOT_RELOAD_KEY, '1');
    window.location.reload();
    return true;
  } catch {
    window.location.reload();
    return true;
  }
}

export function clearBootReloadFlag(): void {
  try {
    sessionStorage.removeItem(BOOT_RELOAD_KEY);
  } catch {
    /* noop */
  }
}

export function setupBootRecovery(): void {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    tryReloadOnceForChunkError();
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      if (tryReloadOnceForChunkError()) return;
      showBootError(event.reason);
    }
  });

  window.addEventListener('error', (event) => {
    if (isChunkLoadError(event.error ?? event.message)) {
      event.preventDefault();
      if (tryReloadOnceForChunkError()) return;
      showBootError(event.error ?? event.message);
    }
  });
}

export function showBootError(err: unknown): void {
  const root = document.getElementById('root');
  if (!root) return;

  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Failed to load the app';

  root.innerHTML = `
    <div class="of-boot-error" role="alert">
      <p class="of-boot-error-title">Could not load OpenFragment</p>
      <p class="of-boot-error-msg">${escapeHtml(message.slice(0, 240))}</p>
      <button type="button" class="of-boot-error-btn" onclick="location.reload()">Reload page</button>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
