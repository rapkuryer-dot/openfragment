import { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Coins,
  ExternalLink,
  Layers,
  Rocket,
  ShieldCheck,
  Wallet,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DEPLOY_CONTRACT_TON,
  DEPLOY_PLATFORM_FEE_TON,
  DEPLOY_TOTAL_TON,
  TRANSFER_FEE_PERCENT,
} from '../lib/platformFees';
import { GRADUATION_TON, GRADUATION_NEAR } from '../lib/launchpad';
import { XIcon } from '@/components/XIcon';
import { TelegramIcon } from '@/components/TelegramIcon';
import { OFLogo } from '@/pages/LandingPage';
import {
  GITHUB_REPO_URL,
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_MAILTO,
  TELEGRAM_COMMUNITY_URL,
  X_URL,
} from '../lib/siteLinks';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'difference', label: 'Why us' },
  { id: 'wallets', label: 'Wallets' },
  { id: 'deploy', label: 'Deploy' },
  { id: 'fees', label: 'Fees' },
  { id: 'launchpad', label: 'Launchpad' },
  { id: 'manage', label: 'Manage' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'security', label: 'Security' },
  { id: 'faq', label: 'FAQ' },
  { id: 'support', label: 'Support' },
] as const;

export function DocsPage() {
  const [active, setActive] = useState<string>('overview');

  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean,
    ) as HTMLElement[];
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.2, 0.5] },
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <header
        className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/95 backdrop-blur-md"
        aria-label="Documentation site header"
      >
        <div className="mx-auto flex h-[56px] max-w-[1200px] items-center justify-between gap-4 px-6 max-sm:px-4">
          <a
            href="/"
            className="flex min-w-0 items-center gap-2.5 text-[16px] font-bold hover:opacity-80 transition-opacity"
            title="Back to home"
          >
            <OFLogo size={28} />
            <span className="font-display tracking-tight truncate">
              OPEN<span className="text-[#0098EA]">FRAGMENT</span>
            </span>
          </a>
          <nav
            className="flex items-center gap-1 max-sm:gap-0.5"
            aria-label="Documentation navigation"
          >
            <DocsTopLink href="/">Home</DocsTopLink>
            <DocsTopLink href="/create">Create</DocsTopLink>
            <DocsTopLink href="/launchpad">Launchpad</DocsTopLink>
            <DocsTopLink href="/manage">Manage</DocsTopLink>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex h-9 items-center rounded-full px-3 text-[13px] font-semibold text-muted-foreground hover:bg-[#F0F1F3] hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex size-9 items-center justify-center rounded-full text-foreground hover:bg-[#F0F1F3] transition-colors"
              title="@openfragment on X"
              aria-label="X"
            >
              <XIcon className="size-3.5" />
            </a>
            <a
              href={TELEGRAM_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex size-9 items-center justify-center rounded-full text-[#229ED9] hover:bg-[#F0F1F3] transition-colors"
              title="Telegram"
              aria-label="Telegram"
            >
              <TelegramIcon className="size-[17px]" />
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-6 pb-20 pt-8 max-sm:px-4">
      <header className="mb-10 rounded-3xl border border-black/[0.06] bg-gradient-to-br from-[#0098EA]/8 via-white to-[#005EFF]/5 p-8 md:p-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#0098EA]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0098EA]">
          <BookOpen className="size-3.5" />
          Documentation
        </div>
        <h1 className="mt-4 font-display text-[32px] md:text-[40px] font-bold tracking-tight">
          OpenFragment on TON
        </h1>
        <p className="mt-3 max-w-[640px] text-[16px] leading-relaxed text-muted-foreground">
          Everything you need to launch a TEP-74 jetton, list it on the public
          launchpad, and trade on STON.fi — without giving up custody of your
          wallet.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            asChild
            className="rounded-full h-11 px-6 font-bold"
            style={{ background: '#0098EA' }}
          >
            <a href="/create">
              <Rocket className="size-4" />
              Launch a token
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full h-11 px-6 font-bold"
          >
            <a href="/launchpad">Browse launchpad</a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full h-11 px-6 font-bold"
          >
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              GitHub
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full h-11 px-6 font-bold"
          >
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
              title="@openfragment on X"
            >
              <XIcon className="size-3.5" />
              @openfragment
            </a>
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        <nav
          className="lg:sticky lg:top-[72px] shrink-0 lg:w-[200px] rounded-2xl border border-black/[0.06] bg-[#FAFAFB] p-3 max-h-[calc(100vh-88px)] lg:overflow-y-auto"
          aria-label="Documentation sections"
        >
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            On this page
          </p>
          <ul className="space-y-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ${
                    active === s.id
                      ? 'bg-[#0098EA] text-white'
                      : 'text-muted-foreground hover:bg-white hover:text-foreground'
                  }`}
                >
                  {active === s.id ? (
                    <ChevronRight className="size-3.5 shrink-0" />
                  ) : null}
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="min-w-0 flex-1 space-y-14 text-[15px] leading-[1.65] text-foreground/90">
          <DocSection id="overview" title="Overview">
            <p>
              <strong>OpenFragment</strong> is a mainnet-ready launchpad for
              jettons (TON fungible tokens). You connect any{' '}
              <strong>TON Connect 2</strong> wallet (mobile, browser extension,
              or Telegram), fill in name, symbol, logo and socials, and deploy a
              standard minter + wallet in one signed transaction.
            </p>
            <p className="mt-3 text-muted-foreground">
              The site is a static dApp: we never hold your keys. Signing
              happens only inside the wallet you choose. After deploy your token
              is listed on the public launchpad and can be traded on STON.fi,
              DeDust, and Tonviewer like any other TEP-74 jetton.
            </p>
            <ul className="mt-4 space-y-2 list-disc pl-5 text-muted-foreground">
              <li>
                <strong className="text-foreground">Create</strong> — deploy +
                initial mint
              </li>
              <li>
                <strong className="text-foreground">Launchpad</strong> — public
                directory of tokens launched here (no wallet required to browse)
              </li>
              <li>
                <strong className="text-foreground">Manage</strong> — mint more,
                revoke admin, update metadata, burn
              </li>
            </ul>
            <Callout title="Network">
              Production runs on <strong>TON mainnet</strong>. Testnet is only
              available when explicitly enabled in the deployment environment.
            </Callout>
          </DocSection>

          <DocSection
            id="difference"
            title="How we differ from other TON launchpads"
          >
            <p>
              Most meme launchpads on TON (hosted flows, bot-based deploys, or
              opaque bonding curves) expose your deployment to mempool watchers
              and fragmented metadata. OpenFragment is built around a{' '}
              <strong>standard jetton you fully control</strong>.
            </p>
            <CompareTable
              rows={[
                [
                  'Deployment',
                  'Single atomic TON Connect tx: StateInit + mint',
                  'Often multi-step; bots can observe mempool',
                ],
                [
                  'Token standard',
                  'TEP-74 jetton — works in all wallets & DEXes',
                  'Custom curves or non-standard tokens',
                ],
                [
                  'Custody',
                  'Non-custodial; keys stay in your wallet',
                  'Sometimes custodial or bot-held keys',
                ],
                [
                  'Contracts',
                  'Tolk + Acton, tested jetton minter/wallet',
                  'Closed or unaudited templates',
                ],
                [
                  'Metadata',
                  'TEP-64 off-chain JSON; STON.fi / Tonviewer read it',
                  'Incomplete or manual DEX listing',
                ],
                [
                  'Launchpad',
                  'Public registry + live chain data for everyone',
                  'Often wallet-local or closed lists',
                ],
                [
                  'Trading',
                  'Trade on STON.fi / DeDust / Tonviewer day one',
                  'Locked until migration or custom UI only',
                ],
              ]}
            />
            <p className="mt-4 text-muted-foreground">
              We do not run a hidden bonding curve or hold your liquidity. After
              deploy you own the admin wallet until you revoke it — same model
              as a self-deployed jetton, with a guided UI and anti-snipe launch
              flow.
            </p>
          </DocSection>

          <DocSection id="wallets" title="Supported wallets">
            <p>
              OpenFragment uses the open <strong>TON Connect 2</strong>{' '}
              standard. When you click <strong>Connect Wallet</strong>, the app
              shows every wallet your browser or Telegram session supports — you
              are not limited to a single provider.
            </p>
            <ul className="mt-4 space-y-2 list-disc pl-5 text-muted-foreground">
              <li>
                <strong className="text-foreground">Tonkeeper</strong> — mobile
                and extension
              </li>
              <li>
                <strong className="text-foreground">MyTonWallet</strong> —
                browser and desktop
              </li>
              <li>
                <strong className="text-foreground">Tonhub</strong>,{' '}
                <strong className="text-foreground">OpenMask</strong>,{' '}
                <strong className="text-foreground">XTON Wallet</strong> and
                other TON Connect wallets
              </li>
              <li>
                <strong className="text-foreground">Telegram Wallet</strong> —
                open the dApp inside Telegram; TON Connect routes the sign
                request to your Telegram wallet
              </li>
            </ul>
            <Callout title="Network">
              Pick the same network in the wallet and in OpenFragment (mainnet
              for production). If the wallet is on testnet while the app is on
              mainnet, deploy will fail with a network mismatch — switch network
              in the wallet and reconnect.
            </Callout>
            <p className="mt-4 text-muted-foreground">
              Manage and Create use the same connection. You can disconnect and
              connect a different wallet at any time before signing.
            </p>
          </DocSection>

          <DocSection id="deploy" title="Deploying a token">
            <ol className="space-y-4 list-decimal pl-5">
              <li>
                Open{' '}
                <a
                  href="/create"
                  className="text-[#0098EA] font-semibold hover:underline"
                >
                  Create
                </a>{' '}
                and click <strong>Connect Wallet</strong>. Choose Tonkeeper,
                MyTonWallet, Telegram Wallet, or any other TON Connect option in
                the list.
              </li>
              <li>
                Upload a logo (validated server-side), set name, symbol,
                decimals (usually 9), description and optional social URLs.
              </li>
              <li>
                Set initial mint amount — this is credited to your connected
                wallet on deploy.
              </li>
              <li>
                Confirm <strong>{DEPLOY_TOTAL_TON} TON</strong> total:{' '}
                {DEPLOY_CONTRACT_TON} TON to the contract +{' '}
                {DEPLOY_PLATFORM_FEE_TON} TON platform fee.
              </li>
              <li>
                Approve the transaction in your wallet app (push notification on
                mobile or the extension popup in the browser).
              </li>
              <li>
                After confirmation, the jetton appears in your wallet and is
                registered on the launchpad automatically for all visitors.
              </li>
            </ol>
            <Callout title="Mainnet safety">
              On mainnet you must type{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[13px]">
                DEPLOY
              </code>{' '}
              to confirm — this prevents accidental spends.
            </Callout>
          </DocSection>

          <DocSection id="fees" title="Fees">
            <FeeRow
              label="Deploy (total)"
              value={`${DEPLOY_TOTAL_TON} TON`}
              detail={`${DEPLOY_CONTRACT_TON} TON contract + ${DEPLOY_PLATFORM_FEE_TON} TON platform`}
            />
            <FeeRow
              label="Transfer tax"
              value={`${TRANSFER_FEE_PERCENT}%`}
              detail="On owner-initiated jetton transfers (incl. many DEX buys from your wallet). Baked into the on-chain wallet code for tokens deployed via OpenFragment."
            />
            <p className="mt-4 text-[13px] text-muted-foreground">
              Network gas for mint, transfer and DEX swaps is paid separately in
              TON as usual. Revoking admin does not remove the transfer tax — it
              is part of the deployed contract.
            </p>
          </DocSection>

          <DocSection id="launchpad" title="Public launchpad">
            <p>
              The{' '}
              <a
                href="/launchpad"
                className="text-[#0098EA] font-semibold hover:underline"
              >
                Launchpad
              </a>{' '}
              lists every token registered through OpenFragment. You do not need
              to connect a wallet to browse.
            </p>
            <ul className="mt-3 space-y-2 list-disc pl-5 text-muted-foreground">
              <li>Live supply and metadata from Toncenter</li>
              <li>USD mcap when STON.fi has a price</li>
              <li>
                <strong className="text-foreground">Graduated</strong> filter —
                tokens near the {GRADUATION_TON.toLocaleString('en-US')} TON
                migration benchmark (~{Math.round(GRADUATION_NEAR * 100)}%+
                progress)
              </li>
              <li>Dev wallet and contract address on each card</li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              Registry is stored on a shared backend (Vercel Redis / KV when
              linked, with a public fallback) so tokens stay visible across
              browsers and devices — no wallet needed to browse.
            </p>
            <p className="mt-3 text-muted-foreground">
              Cards load in two stages: the list appears immediately, then
              on-chain supply and DEX prices refresh in the background.
            </p>
          </DocSection>

          <DocSection id="manage" title="Managing your jetton">
            <p>
              Open{' '}
              <a
                href="/manage"
                className="text-[#0098EA] font-semibold hover:underline"
              >
                Manage
              </a>{' '}
              and paste your jetton master address.
            </p>
            <ul className="mt-3 space-y-2 list-disc pl-5 text-muted-foreground">
              <li>Mint additional supply (while admin is active)</li>
              <li>Update metadata / social links on-chain</li>
              <li>Transfer admin or revoke admin permanently (locks supply)</li>
              <li>Burn from your wallet</li>
            </ul>
          </DocSection>

          <DocSection id="contracts" title="Smart contracts">
            <p>
              Jetton minter and wallet are written in <strong>Tolk</strong>,
              built with <strong>Acton</strong>, and follow{' '}
              <strong>TEP-74</strong> / <strong>TEP-64</strong>. Platform fee
              config (treasury + {TRANSFER_FEE_PERCENT}% transfer tax) is stored
              in minter storage at deploy time.
            </p>
            <p className="mt-3 text-muted-foreground">
              Public source — frontend, documentation UI, and Tolk contracts:{' '}
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#0098EA] font-semibold hover:underline"
              >
                github.com/rapkuryer-dot/openfragment
                <ExternalLink className="size-3.5" />
              </a>
              . Production backend is not published (same model as closed server
              stacks on major trading products).
            </p>
            <p className="mt-3 text-muted-foreground">
              Updates & announcements:{' '}
              <a
                href={X_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#0098EA] font-semibold hover:underline"
              >
                @openfragment on X
                <ExternalLink className="size-3.5" />
              </a>
            </p>
          </DocSection>

          <DocSection id="security" title="Security">
            <ul className="space-y-3">
              <SecItem
                icon={<ShieldCheck className="size-4" />}
                title="Non-custodial"
                text="TON Connect only — we never receive your seed phrase."
              />
              <SecItem
                icon={<Zap className="size-4" />}
                title="Toncenter proxy"
                text="API keys stay on the server; the browser calls /api/toncenter."
              />
              <SecItem
                icon={<Layers className="size-4" />}
                title="Strict CSP"
                text="Content-Security-Policy and security headers on production."
              />
              <SecItem
                icon={<Wallet className="size-4" />}
                title="Logo upload checks"
                text="Server validates image magic bytes before hosting."
              />
            </ul>
          </DocSection>

          <DocSection id="faq" title="FAQ">
            <Faq
              q="Can I trade immediately after deploy?"
              a="Yes. Your jetton is a standard TEP-74 token. Use the Trade link on the launchpad or open STON.fi / DeDust with your contract address."
            />
            <Faq
              q="Why is my token not on the launchpad?"
              a="Only tokens deployed through OpenFragment are registered. If you deployed before a registry fix, open Launchpad once from the same browser used for deploy to sync, or deploy again."
            />
            <Faq
              q="What happens when I revoke admin?"
              a="No further mints are possible. Supply is fixed. Transfer tax remains as deployed."
            />
            <Faq
              q="Which wallet should I use?"
              a="Any TON Connect 2 wallet works. Tonkeeper and MyTonWallet are the most common on desktop; Telegram Wallet is convenient if you open OpenFragment inside Telegram."
            />
            <Faq
              q="Need help?"
              a={
                <>
                  Follow{' '}
                  <a
                    href={X_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0098EA] font-semibold hover:underline"
                  >
                    @openfragment on X
                  </a>
                  , join{' '}
                  <a
                    href={TELEGRAM_COMMUNITY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0098EA] font-semibold hover:underline"
                  >
                    Telegram
                  </a>
                  , or email{' '}
                  <a
                    href={SUPPORT_EMAIL_MAILTO}
                    className="text-[#0098EA] font-semibold hover:underline"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </>
              }
            />
          </DocSection>

          <DocSection id="support" title="Support & contact">
            <p>
              For bugs, partnership questions, or help with a stuck deploy,
              reach us through any channel below. Include your jetton address
              and a screenshot of the wallet error if something failed on-chain.
            </p>
            <ul className="mt-4 space-y-3">
              <li className="rounded-2xl border border-black/[0.06] bg-[#FAFAFB] px-4 py-3.5">
                <p className="font-bold">X (Twitter)</p>
                <a
                  href={X_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[#0098EA] font-semibold hover:underline"
                >
                  @openfragment
                  <ExternalLink className="size-3.5" />
                </a>
              </li>
              <li className="rounded-2xl border border-black/[0.06] bg-[#FAFAFB] px-4 py-3.5">
                <p className="font-bold">Telegram</p>
                <a
                  href={TELEGRAM_COMMUNITY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[#0098EA] font-semibold hover:underline"
                >
                  OPENFRAGMENT community
                  <ExternalLink className="size-3.5" />
                </a>
              </li>
              <li className="rounded-2xl border border-black/[0.06] bg-[#FAFAFB] px-4 py-3.5">
                <p className="font-bold">Email</p>
                <a
                  href={SUPPORT_EMAIL_MAILTO}
                  className="mt-1 text-[#0098EA] font-semibold hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
              </li>
              <li className="rounded-2xl border border-black/[0.06] bg-[#FAFAFB] px-4 py-3.5">
                <p className="font-bold">Source code</p>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[#0098EA] font-semibold hover:underline"
                >
                  {GITHUB_REPO_URL.replace('https://github.com/', '')}
                  <ExternalLink className="size-3.5" />
                </a>
              </li>
            </ul>
          </DocSection>
        </article>
      </div>
      </div>
    </div>
  );
}

function DocsTopLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="inline-flex h-9 items-center rounded-full px-3 text-[13px] font-semibold text-muted-foreground hover:bg-[#F0F1F3] hover:text-foreground transition-colors max-sm:px-2 max-sm:text-[12px]"
    >
      {children}
    </a>
  );
}

function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-[88px]">
      <h2 className="font-display text-[22px] md:text-[26px] font-bold tracking-tight text-[#0A0A0B]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Callout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-[#0098EA]/20 bg-[#0098EA]/5 px-4 py-3.5">
      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#0098EA]">
        {title}
      </p>
      <div className="mt-1.5 text-[14px] text-foreground/85">{children}</div>
    </div>
  );
}

function CompareTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-black/[0.06]">
      <table className="w-full min-w-[520px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-black/[0.06] bg-[#FAFAFB]">
            <th className="px-4 py-3 font-bold">Topic</th>
            <th className="px-4 py-3 font-bold text-[#0098EA]">OpenFragment</th>
            <th className="px-4 py-3 font-bold text-muted-foreground">
              Typical launchpads
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([topic, us, them]) => (
            <tr
              key={topic}
              className="border-b border-black/[0.04] last:border-0"
            >
              <td className="px-4 py-3 font-semibold">{topic}</td>
              <td className="px-4 py-3">{us}</td>
              <td className="px-4 py-3 text-muted-foreground">{them}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeeRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-2xl border border-black/[0.06] bg-[#FAFAFB] px-4 py-3.5 mt-3 first:mt-0">
      <div className="flex items-center gap-2 font-semibold">
        <Coins className="size-4 text-[#0098EA]" />
        {label}
      </div>
      <div className="text-right">
        <div className="font-display text-[18px] font-bold text-[#0098EA]">
          {value}
        </div>
        <div className="text-[12px] text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}

function SecItem({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <li className="flex gap-3 rounded-2xl border border-black/[0.06] bg-white px-4 py-3.5">
      <span className="mt-0.5 text-[#0098EA]">{icon}</span>
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-0.5 text-[14px] text-muted-foreground">{text}</p>
      </div>
    </li>
  );
}

function Faq({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-[#FAFAFB] px-4 py-3.5">
      <p className="font-bold">{q}</p>
      <p className="mt-1.5 text-[14px] text-muted-foreground">{a}</p>
    </div>
  );
}
