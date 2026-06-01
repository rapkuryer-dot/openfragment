import './polyfills';

import { StrictMode, useEffect } from 'react';
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

function mount() {
  const el = document.getElementById('root');
  if (!el) {
    throw new Error('Root element #root not found');
  }

  createRoot(el).render(
    <StrictMode>
      <BootedApp />
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
