/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly TONCENTER_MAINNET_API_KEY?: string;
  readonly TONCENTER_TESTNET_API_KEY?: string;
  readonly VITE_LAUNCHPAD_DEMO?: string;
  readonly VITE_ALLOW_TESTNET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
