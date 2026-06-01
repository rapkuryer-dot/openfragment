# OpenFragment

TON jetton launchpad — deploy TEP-74 tokens via TON Connect, public launchpad, and on-chain manage tools.

**Live:** [openfragment.live](https://www.openfragment.live) · **Docs:** [/docs](https://www.openfragment.live/docs)

**Open source:** [github.com/rapkuryer-dot/openfragment](https://github.com/rapkuryer-dot/openfragment)  
**X (Twitter):** [@openfragment](https://x.com/openfragment)

## Public repository

This repo publishes the **frontend** and **smart contracts** only. Production backend routes (registry, proxies) are deployed privately and are not part of this tree — same approach as major trading UIs that keep server logic closed.

## What's included

- `app/` — React + Vite (landing, create, launchpad, manage, documentation)
- `contracts/` — Tolk jetton minter & wallet (Acton), tests, deploy scripts
- `wrappers-ts/` — TypeScript wrappers for the app

Wallets: any **TON Connect 2** provider (Tonkeeper, MyTonWallet, Tonhub, OpenMask, **Telegram Wallet**, etc.).

Support: [Telegram](https://t.me/+AwgvDTWzJUQ1MzUy) · [rapkuryer@gmail.com](mailto:rapkuryer@gmail.com)

## Install

```bash
npm ci
```

## Commands

```bash
acton build
acton test
npm run build
npm run typecheck
npm run dev
```

## Local development

Copy `.env.example` to `.env` for Toncenter keys when running contracts or local tooling.

## Contracts

```bash
acton script contracts/scripts/deploy.tolk
acton run jetton-mint
acton run jetton-info
```

See `contracts/scripts/` for mint, transfer, metadata, and admin flows.
