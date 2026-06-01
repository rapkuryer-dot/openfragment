import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  RefreshCw,
  Rocket,
  ShieldCheck,
  ShieldOff,
  ExternalLink,
  TrendingUp,
  Flame,
  Clock,
  Copy,
  Check,
  GraduationCap,
} from 'lucide-react';
import {
  fetchLaunchpad,
  GRADUATION_TON,
  GRADUATION_NEAR,
  type LaunchpadToken,
} from '../lib/launchpad';
import {
  tonviewerJettonUrl,
  stonFiSwapTonToJettonUrl,
  tonviewerPathSegment,
} from '../lib/explorerLinks';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Props {
  network: 'mainnet' | 'testnet';
}

type ViewKey = 'new' | 'mcap' | 'supply' | 'graduated';

export function LaunchpadPage({ network }: Props) {
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['launchpad', network],
    queryFn: () => fetchLaunchpad(network),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewKey>('new');

  const graduatingCount = useMemo(
    () =>
      (data ?? []).filter((t) => (t.graduationProgress ?? 0) >= GRADUATION_NEAR)
        .length,
    [data],
  );

  const tokens = useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    let filtered = q
      ? list.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.symbol.toLowerCase().includes(q) ||
            t.address.toLowerCase().includes(q),
        )
      : list;

    if (view === 'graduated') {
      // Tokens that have migrated or are almost there (≥ 80% of the target).
      filtered = filtered.filter(
        (t) => (t.graduationProgress ?? 0) >= GRADUATION_NEAR,
      );
    }

    const sorted = [...filtered];
    if (view === 'mcap') {
      sorted.sort((a, b) => (b.marketCapUsd ?? -1) - (a.marketCapUsd ?? -1));
    } else if (view === 'supply') {
      sorted.sort((a, b) => b.circulatingSupply - a.circulatingSupply);
    } else if (view === 'graduated') {
      sorted.sort(
        (a, b) => (b.graduationProgress ?? 0) - (a.graduationProgress ?? 0),
      );
    } else {
      sorted.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }
    return sorted;
  }, [data, query, view]);

  const totalMcap = useMemo(
    () => (data ?? []).reduce((acc, t) => acc + (t.marketCapUsd ?? 0), 0),
    [data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0098EA]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0098EA]">
            <Rocket className="size-3.5" />
            Launchpad
          </div>
          <h1 className="mt-3 font-display text-[28px] font-bold tracking-tight max-sm:text-[24px]">
            Tokens launched on OpenFragment
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-[560px]">
            Every jetton minted through OpenFragment, live from the TON
            blockchain — supply, market cap and the dev wallet behind it.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatPill label="Tokens" value={String((data ?? []).length)} />
          <StatPill label="Total mcap" value={formatUsd(totalMcap)} />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-[420px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, symbol or address"
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-0.5 rounded-full p-[3px]"
            style={{ background: '#F0F1F3' }}
          >
            <ViewButton active={view === 'new'} onClick={() => setView('new')} icon={<Clock className="size-3.5" />}>
              New
            </ViewButton>
            <ViewButton active={view === 'mcap'} onClick={() => setView('mcap')} icon={<TrendingUp className="size-3.5" />}>
              Mcap
            </ViewButton>
            <ViewButton active={view === 'supply'} onClick={() => setView('supply')} icon={<Flame className="size-3.5" />}>
              Supply
            </ViewButton>
            <ViewButton
              active={view === 'graduated'}
              onClick={() => setView('graduated')}
              icon={<GraduationCap className="size-3.5" />}
              badge={graduatingCount > 0 ? graduatingCount : undefined}
              title={`Tokens that migrated or are close to the ${GRADUATION_TON.toLocaleString('en-US')} TON migration target`}
            >
              Graduated
            </ViewButton>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            title="Refresh"
            className="rounded-full border border-black/[0.08] size-10 hover:bg-[#F0F1F3]"
          >
            <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonGrid />
      ) : isError ? (
        <EmptyBox
          title="Couldn't load the launchpad"
          desc="The indexer is busy. Try refreshing in a moment."
        />
      ) : tokens.length === 0 ? (
        <EmptyBox
          title={
            query
              ? 'No tokens match your search'
              : view === 'graduated'
                ? 'No tokens graduating yet'
                : 'No tokens launched yet'
          }
          desc={
            query
              ? 'Try a different name, symbol or address.'
              : view === 'graduated'
                ? `Tokens appear here once they approach the ${GRADUATION_TON.toLocaleString('en-US')} TON migration target.`
                : 'Be the first — deploy a jetton from the Create tab and it will appear here.'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tokens.map((t) => (
            <TokenCard key={t.address} token={t} network={network} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-2.5 text-center min-w-[110px]">
      <div className="font-display text-[18px] font-bold tracking-tight tabular-nums">
        {value}
      </div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  children,
  badge,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: number;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[13px] font-bold transition-colors ${
        active
          ? 'bg-[#0098EA] text-white'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {children}
      {badge != null && (
        <span
          className={`ml-0.5 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-4 ${
            active ? 'bg-white/25 text-white' : 'bg-[#0098EA]/15 text-[#0098EA]'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function TokenCard({
  token,
  network,
}: {
  token: LaunchpadToken;
  network: 'mainnet' | 'testnet';
}) {
  const [imgError, setImgError] = useState(false);
  const initial = token.symbol.charAt(0).toUpperCase();

  return (
    <div className="group relative flex flex-col rounded-2xl border border-black/[0.06] bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0098EA]/35 hover:shadow-[0_16px_40px_-24px_rgba(0,94,255,0.35)]">
      <div className="flex items-start gap-3.5">
        <Avatar className="size-12 border-2 border-border">
          {token.image && !imgError ? (
            <AvatarImage
              src={token.image}
              alt={token.name}
              onError={() => setImgError(true)}
            />
          ) : null}
          <AvatarFallback className="bg-[#0098EA] text-white text-lg font-extrabold">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-display text-[16px] font-bold tracking-tight">
              {token.name}
            </span>
            {token.graduated && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--success)]/12 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[var(--success)]"
                title="Graduated — migrated to a DEX"
              >
                <GraduationCap className="size-2.5" />
                Grad
              </span>
            )}
          </div>
          <div className="font-mono text-[12.5px] font-semibold text-[#0098EA]">
            ${token.symbol}
          </div>
        </div>
        {token.adminRevoked ? (
          <Badge
            variant="outline"
            className="shrink-0 gap-1 border-[var(--success)]/25 bg-[var(--success)]/10 text-[var(--success)] text-[10px]"
            title="Admin revoked — supply is locked"
          >
            <ShieldCheck className="size-3" />
            Locked
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="shrink-0 gap-1 text-[10px] text-muted-foreground"
            title="Admin can still mint"
          >
            <ShieldOff className="size-3" />
            Mintable
          </Badge>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric
          label="Mcap"
          value={token.marketCapUsd != null ? formatUsd(token.marketCapUsd) : '—'}
          hint={token.marketCapUsd == null ? 'No liquidity yet' : undefined}
          accent
        />
        <Metric label="Supply" value={formatCompact(token.circulatingSupply)} />
      </div>

      <MigrationBar token={token} />

      <div className="mt-3.5 space-y-2 border-t border-border pt-3.5">
        <Row label="Dev wallet">
          {token.devWallet ? (
            <a
              href={`${network === 'testnet' ? 'https://testnet.tonviewer.com' : 'https://tonviewer.com'}/${tonviewerPathSegment(token.devWallet)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[12.5px] font-semibold text-[#0098EA] hover:underline"
              title={token.devWallet}
            >
              {shorten(token.devWallet)}
            </a>
          ) : (
            <span className="font-mono text-[12.5px] font-semibold text-muted-foreground">
              revoked
            </span>
          )}
        </Row>
        <Row label="Contract">
          <CopyAddress value={token.address} />
        </Row>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          asChild
          size="sm"
          className="flex-1 rounded-full h-9 text-xs font-bold"
          style={{ background: '#0098EA' }}
        >
          <a
            href={tonviewerJettonUrl(network, token.address)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="size-3.5" />
            Tonviewer
          </a>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="flex-1 rounded-full h-9 text-xs font-bold"
        >
          <a
            href={stonFiSwapTonToJettonUrl(token.address)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Trade
          </a>
        </Button>
      </div>
    </div>
  );
}

function MigrationBar({ token }: { token: LaunchpadToken }) {
  // No price / no target → nothing meaningful to show.
  if (token.graduationProgress == null) return null;
  const pct = Math.max(0, Math.min(100, token.graduationProgress * 100));
  const graduated = token.graduated === true;
  return (
    <div className="mt-3.5">
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
        <span className="text-muted-foreground">
          {graduated ? 'Migrated to DEX' : 'Migration progress'}
        </span>
        <span className={graduated ? 'text-[var(--success)]' : 'text-[#0098EA]'}>
          {pct.toFixed(pct < 10 ? 1 : 0)}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.max(pct, 2)}%`,
            background: graduated
              ? 'var(--success)'
              : 'linear-gradient(90deg,#0098EA,#005EFF)',
          }}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-0.5 font-display text-[17px] font-bold tracking-tight tabular-nums ${
          accent ? 'text-[#0098EA]' : ''
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function CopyAddress({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex items-center gap-1.5 font-mono text-[12.5px] font-semibold text-foreground/80 hover:text-[#0098EA] transition-colors"
      title={`Copy ${value}`}
    >
      {shorten(value)}
      {copied ? (
        <Check className="size-3.5 text-[var(--success)]" />
      ) : (
        <Copy className="size-3.5 opacity-60" />
      )}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3.5">
              <div className="size-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/3 rounded bg-muted" />
                <div className="h-3 w-1/3 rounded bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-14 rounded-xl bg-muted" />
              <div className="h-14 rounded-xl bg-muted" />
            </div>
            <div className="h-9 rounded-full bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyBox({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-[260px] flex-col items-center justify-center text-center">
        <div className="mb-3.5 flex size-14 items-center justify-center rounded-2xl bg-[#0098EA]/10 text-[#0098EA]">
          <Rocket className="size-7" />
        </div>
        <div className="font-display text-[17px] font-bold">{title}</div>
        <p className="mt-1.5 max-w-[360px] text-sm text-muted-foreground">
          {desc}
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------------- formatting ---------------- */

function shorten(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '$0';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(n);
}
