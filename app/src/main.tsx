import './polyfills';

import { StrictMode, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { AppProviders } from './providers/AppProviders';
import { RootErrorBoundary } from './components/RootErrorBoundary';
import {
  clearBootReloadFlag,
  isChunkLoadError,
  setupBootRecovery,
  showBootError,
  tryReloadOnceForChunkError,
} from './bootRecovery';

import './styles.css';

setupBootRecovery();

function BootedApp() {
  useEffect(() => {
    clearBootReloadFlag();
  }, []);

  return (
    <RootErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </RootErrorBoundary>
  );
}

function BootSplash() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-white"
      aria-busy="true"
      aria-label="Loading OpenFragment"
    >
      <div
        className="size-8 rounded-full border-[3px] border-[#0098EA]/20 border-t-[#0098EA] animate-spin"
        role="presentation"
      />
    </div>
  );
}

function mount() {
  document.getElementById('of-boot-splash')?.remove();

  const el = document.getElementById('root');
  if (!el) {
    throw new Error('Root element #root not found');
  }

  createRoot(el).render(
    <StrictMode>
      <Suspense fallback={<BootSplash />}>
        <BootedApp />
      </Suspense>
    </StrictMode>,
  );
}

try {
  mount();
} catch (err) {
  if (isChunkLoadError(err) && tryReloadOnceForChunkError()) {
    /* reloading */
  } else {
    showBootError(err);
    console.error('[OPENFRAGMENT] Bootstrap failed', err);
  }
}
