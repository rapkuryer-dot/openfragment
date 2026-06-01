# OpenFragment

TON jetton launchpad — deploy TEP-74 tokens via TON Connect, public launchpad, and on-chain manage tools.

**Live:** [openfragment.live](https://www.openfragment.live) · **Docs:** [/docs](https://www.openfragment.live/docs)

**Repository:** [github.com/rapkuryer-dot/openfragment](https://github.com/rapkuryer-dot/openfragment)

## What's included

- `app/` — React + Vite frontend (landing, create, launchpad, manage, documentation)
- `api/` — Vercel serverless routes (launchpad registry, Toncenter proxy, logo upload)
- `contracts/` — Tolk jetton minter & wallet (Acton), tests, deploy scripts
- `wrappers-ts/` — TypeScript wrappers for the app

Wallets: any **TON Connect 2** provider (Tonkeeper, MyTonWallet, Tonhub, OpenMask, **Telegram Wallet**, etc.).

Support: [Telegram](https://t.me/+AwgvDTWzJUQ1MzUy) · rapkuryer@gmail.com

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

## Environment

Copy `.env.example` to `.env` for local Toncenter API keys. On Vercel, link Redis/KV for the shared launchpad registry and set `TONCENTER_MAINNET_API_KEY`.

## Contracts

```bash
acton script contracts/scripts/deploy.tolk
acton run jetton-mint
acton run jetton-info
```

See `contracts/scripts/` for mint, transfer, metadata, and admin flows.
