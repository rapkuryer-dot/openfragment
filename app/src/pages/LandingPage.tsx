import { useEffect, useRef, useState, type ReactNode, type MouseEvent as RMouseEvent } from 'react';
import {
  ArrowUpRight,
  ShieldCheck,
  Zap,
  EyeOff,
  Sparkles,
  Lock,
  Boxes,
  Layers,
  ChevronRight,
  Wallet,
  Rocket,
  CheckCircle2,
  CircuitBoard,
  KeyRound,
  Fingerprint,
} from 'lucide-react';

interface Props {
  onLaunch: () => void;
}

const X_URL = 'https://x.com/openfragment';

export function LandingPage({ onLaunch }: Props) {
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const onMouse = (e: globalThis.MouseEvent) =>
      setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener('mousemove', onMouse);
    return () => window.removeEventListener('mousemove', onMouse);
  }, []);

  return (
    <div className="of-landing relative min-h-screen text-[#0A0A0B] font-sans antialiased overflow-x-hidden bg-white">
      <Nav onLaunch={onLaunch} />
      <Hero onLaunch={onLaunch} mouse={mouse} />
      <Marquee />
      <Stats />
      <Features />
      <HowItWorks />
      <Security />
      <CTA onLaunch={onLaunch} />
      <Footer />
    </div>
  );
}

/* ---------- Reveal: IntersectionObserver-based ---------- */

function Reveal({
  children,
  as: Tag = 'div',
  delay = 0,
  y = 28,
  className = '',
}: {
  children: ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Component = Tag as React.ElementType;
  return (
    <Component
      ref={ref}
      className={`of-reveal ${shown ? 'of-reveal--in' : ''} ${className}`}
      style={
        {
          '--rev-delay': `${delay}ms`,
          '--rev-y': `${y}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </Component>
  );
}

/** Line-based reveal — wraps each child in overflow:hidden and slides it up.
 *  Use for hero headings (clean, no space-collapsing issues). */
function RevealLines({
  lines,
  className = '',
  delay = 0,
  stagger = 110,
}: {
  lines: ReactNode[];
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="of-line">
          <span
            className={`of-line-inner ${shown ? 'of-line-inner--in' : ''}`}
            style={{ transitionDelay: `${delay + i * stagger}ms` }}
          >
            {line}
          </span>
        </span>
      ))}
    </div>
  );
}

/* ---------- Magnetic button with shine sweep (opposite cursor direction) ---------- */

function MagneticButton({
  onClick,
  children,
  className = '',
}: {
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);

  const handleMove = (e: RMouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / rect.width; // -0.5 .. 0.5
    const dy = (e.clientY - cy) / rect.height;
    // Magnetic pull: button follows cursor slightly
    el.style.setProperty('--mb-tx', `${dx * 14}px`);
    el.style.setProperty('--mb-ty', `${dy * 10}px`);
    // Shine sweep goes opposite direction
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    el.style.setProperty('--mb-shine', `${100 - px}%`);
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--mb-tx', '0px');
    el.style.setProperty('--mb-ty', '0px');
    el.style.setProperty('--mb-shine', '50%');
  };

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`of-magnetic group relative inline-flex items-center justify-center overflow-hidden ${className}`}
    >
      <span className="of-magnetic-inner relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
      <span className="of-magnetic-shine" aria-hidden />
    </button>
  );
}

/* ---------- Logo ---------- */

export function OFLogo({
  size = 32,
  fg,
}: {
  size?: number;
  fg?: string;
}) {
  const c = fg ?? 'currentColor';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className="shrink-0"
      aria-label="OpenFragment logo"
    >
      {/* C-shape (thick rounded bracket) */}
      <path
        d="M 22 10
           L 60 10
           L 60 26
           L 32 26
           A 6 6 0 0 0 26 32
           L 26 68
           A 6 6 0 0 0 32 74
           L 74 74
           A 6 6 0 0 0 80 68
           L 80 46
           L 94 46
           L 94 78
           A 12 12 0 0 1 82 90
           L 18 90
           A 12 12 0 0 1 6 78
           L 6 22
           A 12 12 0 0 1 18 10
           Z"
        fill={c}
      />
      {/* Blue accent square top-right */}
      <rect x="66" y="10" width="28" height="28" rx="5" fill="#0098EA" />
    </svg>
  );
}

function XIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.49 7.42L22 22h-6.828l-4.77-6.24L4.8 22H2.044l6.94-7.94L2 2h6.914l4.32 5.71L18.244 2Zm-1.197 18h1.51L7.05 4H5.428l11.62 16Z" />
    </svg>
  );
}

/* ---------- Nav ---------- */

function Nav({ onLaunch }: { onLaunch: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'backdrop-blur-xl bg-white/80 border-b border-black/[0.06]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-[#0A0A0B]">
          <OFLogo size={30} />
          <div className="font-display text-[16px] font-bold tracking-[0.12em]">
            OPEN<span className="text-[#0098EA]">FRAGMENT</span>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-1 bg-[#F4F4F5] rounded-full p-1">
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#how">How it works</NavLink>
          <NavLink href="#security">Security</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex size-9 items-center justify-center rounded-full border border-black/[0.08] text-black/70 hover:text-black hover:border-black/[0.2] transition-colors"
            title="@openfragment on X"
          >
            <XIcon className="size-3.5" />
          </a>
          <button
            onClick={onLaunch}
            className="group flex items-center gap-1.5 bg-[#0A0A0B] text-white text-[13px] font-semibold px-4 py-2 rounded-full hover:bg-[#0098EA] transition-colors"
          >
            Launch App
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="of-navlink relative px-4 py-1.5 text-[13px] font-semibold text-black/70 rounded-full transition-colors duration-200 hover:text-[#0098EA]"
    >
      <span className="relative z-10">{children}</span>
    </a>
  );
}

/* ---------- Hero ---------- */

function Hero({
  onLaunch,
  mouse,
}: {
  onLaunch: () => void;
  mouse: { x: number; y: number };
}) {
  return (
    <section
      className="relative overflow-hidden pt-20 pb-28 px-6 min-h-[88vh] flex items-center"
      style={{
        background: `radial-gradient(1200px 600px at ${50 + (mouse.x - 0.5) * 8}% ${-10 + (mouse.y - 0.5) * 4}%, rgba(0,152,234,0.08), transparent 60%), linear-gradient(180deg, #FFFFFF 0%, #FAFBFD 100%)`,
      }}
    >
      <GridBackdrop />
      <FloatingOrbs mouse={mouse} />

      <div className="max-w-[1100px] mx-auto relative w-full">
        <div className="text-center max-w-[920px] mx-auto">
          <RevealLines
            className="font-display font-bold text-[clamp(44px,8vw,104px)] leading-[0.95] tracking-[-0.035em] text-balance"
            delay={120}
            lines={[
              <>The fastest way to launch</>,
              <>
                a{' '}
                <span className="relative inline-block align-baseline">
                  <span className="bg-gradient-to-r from-[#0098EA] via-[#1FA9FF] to-[#005EFF] bg-clip-text text-transparent">
                    memecoin
                  </span>
                  <svg viewBox="0 0 200 12" className="absolute -bottom-2 left-0 w-full h-2 text-[#0098EA]/35">
                    <path d="M2 8 Q 50 2 100 6 T 198 5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </span>{' '}
                on TON.
              </>,
            ]}
          />

          <Reveal delay={520} y={20}>
            <p className="of-prose mt-9 text-[18px] md:text-[20px] leading-[1.58] text-black/65 max-w-[680px] mx-auto">
              OpenFragment is a native TON launchpad built on Tolk + Acton. Deploy, mint
              and distribute tokens in seconds — with built-in protection that makes
              your launch{' '}
              <span className="text-black font-semibold">impossible to snipe</span>.
            </p>
          </Reveal>

          <Reveal delay={680} y={22}>
            <div className="mt-12 flex flex-col items-center gap-5">
              <MagneticButton
                onClick={onLaunch}
                className="bg-gradient-to-r from-[#0098EA] to-[#005EFF] text-white font-bold rounded-full h-[68px] px-12 text-[18px] shadow-[0_18px_60px_-12px_rgba(0,94,255,0.55)] hover:shadow-[0_24px_70px_-12px_rgba(0,94,255,0.75)]"
              >
                <Sparkles className="size-5" />
                <span className="tracking-tight">Launch Now</span>
                <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </MagneticButton>
              <a
                href="#how"
                className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-black/65 hover:text-[#0098EA] transition-colors"
              >
                See how it works
                <ChevronRight className="size-4" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={860} y={16}>
            <div className="mt-16 flex items-center justify-center gap-x-8 gap-y-3 flex-wrap font-display">
              <HeroPill icon={<ShieldCheck className="size-3.5" />} label="Non-custodial" />
              <HeroDot />
              <HeroPill icon={<EyeOff className="size-3.5" />} label="Anti-sniper" />
              <HeroDot />
              <HeroPill icon={<Zap className="size-3.5" />} label="Sub-second deploys" />
              <HeroDot />
              <HeroPill icon={<Lock className="size-3.5" />} label="Audited Tolk contracts" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function HeroPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold tracking-tight text-black/70">
      <span className="text-[#0098EA]">{icon}</span>
      {label}
    </span>
  );
}

function HeroDot() {
  return <span className="hidden md:inline-block size-1 rounded-full bg-black/15" />;
}

function GridBackdrop() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 opacity-[0.32] pointer-events-none"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(10,10,11,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(10,10,11,0.06) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)',
      }}
    />
  );
}

function FloatingOrbs({ mouse }: { mouse: { x: number; y: number } }) {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute -top-32 -left-24 size-[420px] rounded-full opacity-50 blur-[80px]"
        style={{
          background: 'radial-gradient(circle, #B5E0FF 0%, transparent 70%)',
          transform: `translate(${mouse.x * 24}px, ${mouse.y * 16}px)`,
          transition: 'transform 0.4s ease-out',
        }}
      />
      <div
        className="absolute top-20 -right-24 size-[480px] rounded-full opacity-40 blur-[90px]"
        style={{
          background: 'radial-gradient(circle, #C8D6FF 0%, transparent 70%)',
          transform: `translate(${-mouse.x * 18}px, ${mouse.y * 22}px)`,
          transition: 'transform 0.4s ease-out',
        }}
      />
    </div>
  );
}

/* ---------- Marquee strip ---------- */

function Marquee() {
  const items = ['TON Connect 2.0', 'Tolk + Acton', 'TEP-64 Jetton', 'Sub-second deploys', 'Anti-sniper shield', 'On-chain metadata', 'Non-custodial', 'STON.fi · DeDust · Geckoterminal'];
  const row = [...items, ...items];
  return (
    <section className="relative py-7 border-y border-black/[0.06] bg-[#FAFAFB] overflow-hidden">
      <div className="of-marquee flex gap-12 whitespace-nowrap font-display text-[12.5px] font-semibold uppercase tracking-[0.28em] text-black/40">
        {row.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-12 shrink-0">
            {it}
            <span className="size-1 rounded-full bg-black/20" />
          </span>
        ))}
      </div>
    </section>
  );
}

/* ---------- Stats ---------- */

function Stats() {
  const items = [
    { v: '<2s', l: 'Deploy time' },
    { v: '100%', l: 'Snipe-resistance' },
    { v: '0.15 TON', l: 'Avg. fee' },
    { v: 'Tolk Language', l: 'Built on' },
  ];
  return (
    <section className="relative px-6 py-20 border-b border-black/[0.06]">
      <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
        {items.map((s, i) => (
          <Reveal key={s.l} delay={i * 100} y={22}>
            <div>
              <div className="font-display text-[36px] md:text-[46px] font-bold tracking-[-0.025em] leading-[1.05]">
                {s.v}
              </div>
              <div className="mt-2 font-display text-[11.5px] font-semibold text-black/45 uppercase tracking-[0.22em]">
                {s.l}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Features ---------- */

function Features() {
  const features = [
    { icon: <EyeOff className="size-5" />, title: 'Untraceable deploys', desc: 'Token contracts are committed atomically — bots cannot front-run, mempool-watch, or pre-mint your supply.' },
    { icon: <Zap className="size-5" />, title: 'Sub-second mint', desc: 'Tolk-compiled contracts deploy and mint your initial supply in a single transaction. No two-step exposure.' },
    { icon: <ShieldCheck className="size-5" />, title: 'Liquidity shield', desc: 'Initial liquidity launches alongside the contract and cannot be sniped — even on the first block.' },
    { icon: <Lock className="size-5" />, title: 'Non-custodial', desc: 'We never touch your seed phrase. TON Connect signs everything client-side, on your device.' },
    { icon: <Boxes className="size-5" />, title: 'On-chain metadata', desc: 'Logo, socials, website embedded into the jetton — Tonviewer, STON.fi, Geckoterminal all pick it up.' },
    { icon: <Layers className="size-5" />, title: 'TEP-64 compliant', desc: 'Fully standard jetton: works in every wallet, every DEX, every TON explorer from day one.' },
  ];
  return (
    <section id="features" className="relative px-6 py-28">
      <div className="max-w-[1200px] mx-auto">
        <SectionHeader
          eyebrow="Why OpenFragment"
          title="Built for launches that can't be hijacked."
          subtitle="Every other launchpad leaks your token to MEV bots the moment you deploy. We don't."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 110} y={32}>
              <FeatureCard {...f} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const onMove = (e: RMouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className="of-feature group relative bg-white rounded-2xl p-7 h-full transition-all duration-300"
    >
      <span className="of-feature-border" aria-hidden />
      <span className="of-feature-glow" aria-hidden />
      <div className="relative">
        <div className="size-12 rounded-xl bg-gradient-to-br from-[#E8F4FF] to-[#F0F4FF] text-[#0098EA] flex items-center justify-center mb-5 group-hover:scale-[1.06] transition-transform duration-300 ring-1 ring-[#0098EA]/10">
          {icon}
        </div>
        <div className="font-display text-[19px] font-bold tracking-[-0.01em]">{title}</div>
        <div className="mt-2 text-[14px] leading-[1.6] text-black/55">{desc}</div>
      </div>
    </div>
  );
}

/* ---------- How it works ---------- */

function HowItWorks() {
  const steps = [
    { icon: <Wallet className="size-5" />, n: '01', title: 'Connect your TON wallet', desc: 'Tonkeeper, MyTonWallet, Tonhub, OpenMask — any TON Connect 2 wallet works.' },
    { icon: <CircuitBoard className="size-5" />, n: '02', title: 'Fill in token details', desc: 'Name, symbol, supply, description, logo (drag & drop), and socials. Stored on-chain.' },
    { icon: <Rocket className="size-5" />, n: '03', title: 'Sign once, deploy instantly', desc: 'A single transaction creates the contract, mints supply, and locks the metadata.' },
    { icon: <CheckCircle2 className="size-5" />, n: '04', title: 'You\u2019re live everywhere', desc: 'Tonviewer, Tonscan, STON.fi, DeDust, Geckoterminal — explorers index automatically.' },
  ];
  return (
    <section id="how" className="relative px-6 py-28 bg-[#FAFAFB] border-y border-black/[0.06]">
      <div className="max-w-[1200px] mx-auto">
        <SectionHeader eyebrow="How it works" title="From idea to live token in 4 steps." />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 120} y={28}>
              <div className="of-step group relative bg-white border border-black/[0.06] rounded-2xl p-6 h-full transition-all duration-300 overflow-hidden">
                <span className="of-step-bar" aria-hidden />
                <div className="relative flex items-center justify-between mb-3">
                  <div className="of-step-icon size-10 rounded-xl bg-gradient-to-br from-[#E8F4FF] to-[#F0F4FF] text-[#0098EA] flex items-center justify-center transition-transform duration-300">
                    {s.icon}
                  </div>
                  <div className="font-mono text-[11.5px] font-semibold text-[#0098EA] tracking-wider">
                    {s.n}
                  </div>
                </div>
                <div className="relative font-display text-[17px] font-bold tracking-[-0.01em]">{s.title}</div>
                <div className="relative mt-1.5 text-[13.5px] leading-[1.55] text-black/55">{s.desc}</div>
                {i < steps.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 size-5 text-black/15" />
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Security ---------- */

function Security() {
  const points = [
    { icon: <KeyRound className="size-4" />, t: 'No seed phrase, ever', d: 'OpenFragment is a static, client-side dApp. We don\u2019t collect, request, or store keys.' },
    { icon: <Fingerprint className="size-4" />, t: 'Signing in your wallet', d: 'Every transaction is signed inside Tonkeeper / MyTonWallet via TON Connect 2.' },
    { icon: <ShieldCheck className="size-4" />, t: 'Audited Tolk contracts', d: 'Open-source jetton contracts compiled with Tolk on the Acton platform.' },
    { icon: <EyeOff className="size-4" />, t: 'Anti-sniper at contract level', d: 'Protection is enforced by the contract itself, not by a paywall or off-chain service.' },
  ];

  return (
    <section id="security" className="relative px-6 py-28">
      <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
        <div>
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-[#0098EA]/10 text-[#0098EA] text-[11px] font-display font-bold uppercase tracking-[0.22em] px-3 py-1.5 rounded-full">
              <ShieldCheck className="size-3.5" />
              Security
            </div>
          </Reveal>
          <Reveal delay={120} y={26}>
            <h2 className="mt-5 font-display text-[clamp(32px,5vw,56px)] font-bold leading-[1.02] tracking-[-0.03em]">
              Your keys never leave your wallet.
            </h2>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-5 text-[16.5px] leading-[1.6] text-black/60 max-w-[520px]">
              OpenFragment is engineered so that signing power stays where it
              belongs — in your wallet. There is no backend that holds funds and
              no place for a key to leak.
            </p>
          </Reveal>

          <div className="mt-9 grid sm:grid-cols-2 gap-3">
            {points.map((p, i) => (
              <Reveal key={p.t} delay={300 + i * 90} y={24}>
                <SecurityPoint icon={p.icon} title={p.t} desc={p.d} />
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={200} y={24}>
          <SecurityVisual />
        </Reveal>
      </div>
    </section>
  );
}

function SecurityPoint({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="of-sec group relative bg-white border border-black/[0.06] rounded-2xl p-5 h-full overflow-hidden transition-all duration-300">
      <span className="of-sec-sweep" aria-hidden />
      <div className="relative">
        <div className="flex items-center gap-2.5">
          <span className="of-sec-icon size-9 rounded-lg bg-[#0098EA]/10 text-[#0098EA] flex items-center justify-center transition-all duration-300">
            {icon}
          </span>
          <span className="font-display text-[14px] font-bold tracking-[-0.005em]">
            {title}
          </span>
        </div>
        <p className="mt-2.5 text-[13px] leading-[1.6] text-black/55">{desc}</p>
      </div>
    </div>
  );
}

function SecurityVisual() {
  return (
    <div className="relative aspect-square max-w-[480px] mx-auto w-full">
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-50"
        style={{ background: 'radial-gradient(circle at 50% 45%, rgba(0,152,234,0.28), transparent 60%)' }}
      />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full border"
          style={{
            borderColor: `rgba(0,152,234,${0.05 + i * 0.04})`,
            transform: `scale(${1 - i * 0.13})`,
          }}
        />
      ))}
      {[0, 90, 180, 270].map((deg, i) => (
        <div
          key={deg}
          className="absolute inset-0"
          style={{
            transform: `rotate(${deg}deg)`,
            animation: `of-spin ${30 + i * 7}s linear infinite`,
          }}
        >
          <span className="absolute left-1/2 -top-1.5 -translate-x-1/2 size-2.5 rounded-full bg-[#0098EA] shadow-[0_0_14px_rgba(0,152,234,0.6)]" />
        </div>
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative text-center">
          <div className="absolute inset-0 rounded-[28px] blur-2xl bg-[#0098EA]/25" />
          <div
            className="relative mx-auto size-[180px] rounded-[28px] flex items-center justify-center bg-white border border-black/[0.06]"
            style={{
              boxShadow:
                '0 30px 80px -30px rgba(0,94,255,0.35), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            <ShieldCheck className="size-16 text-[#0098EA]" strokeWidth={1.6} />
          </div>
          <div className="mt-7">
            <div className="font-display text-[16px] font-bold text-[#0098EA] uppercase tracking-[0.26em]">
              TON Connect 2.0
            </div>
            <div className="mt-2 font-display text-[15px] text-black/65 tracking-[-0.01em]">
              End-to-end signed in your wallet
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- CTA ---------- */

function CTA({ onLaunch }: { onLaunch: () => void }) {
  return (
    <section className="of-fullbleed relative overflow-hidden bg-[#05070D] text-white">
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(800px 320px at 50% 0%, rgba(0,152,234,0.55), transparent 60%), radial-gradient(800px 360px at 50% 100%, rgba(0,40,120,0.55), transparent 60%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.08]"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)',
        }}
      />
      <div className="relative px-6 py-32 md:py-40 text-center max-w-[1100px] mx-auto">
        <Reveal y={30}>
          <h2 className="font-display text-[clamp(36px,6vw,72px)] font-bold leading-[1.02] tracking-[-0.03em]">
            Launch your token.
            <br />
            <span className="bg-gradient-to-r from-[#7ED4FF] via-[#A8C7FF] to-[#7ED4FF] bg-clip-text text-transparent">
              No bots, no leaks, no waiting.
            </span>
          </h2>
        </Reveal>
        <Reveal delay={200}>
          <p className="mt-6 text-[16.5px] text-white/60 max-w-[560px] mx-auto">
            Free to try on testnet. Pay only TON gas to deploy on mainnet.
          </p>
        </Reveal>
        <Reveal delay={350}>
          <div className="mt-12">
            <MagneticButton
              onClick={onLaunch}
              className="bg-white text-[#05070D] font-bold rounded-full h-[64px] px-10 text-[17px] shadow-[0_20px_60px_-12px_rgba(0,150,234,0.5)] hover:bg-[#0098EA] hover:text-white"
            >
              <Sparkles className="size-5" />
              <span className="tracking-tight">Launch Now</span>
              <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </MagneticButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Section header / Footer ---------- */

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-16 max-w-[820px]">
      <Reveal>
        <div className="of-eyebrow inline-flex items-center gap-2.5 rounded-full pl-2 pr-4 py-1.5">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-[#0098EA] to-[#005EFF] shadow-[0_2px_8px_-1px_rgba(0,94,255,0.5)]">
            <span className="size-1.5 rounded-full bg-white" />
          </span>
          <span className="font-display text-[11.5px] font-bold uppercase tracking-[0.26em] text-[#0A0A0B]">
            {eyebrow}
          </span>
        </div>
      </Reveal>
      <Reveal delay={120} y={26}>
        <h2 className="mt-6 font-display text-[clamp(34px,5.6vw,64px)] font-bold leading-[1.02] tracking-[-0.035em]">
          <span className="bg-gradient-to-br from-black via-[#0A0A0B] to-black/70 bg-clip-text text-transparent">
            {title}
          </span>
        </h2>
      </Reveal>
      {subtitle && (
        <Reveal delay={240}>
          <p className="mt-5 text-[17px] md:text-[18px] text-black/55 leading-[1.6] max-w-[640px]">
            {subtitle}
          </p>
        </Reveal>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative px-6 py-10 border-t border-black/[0.06] bg-white">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[13px] text-black/50">
        <div className="flex items-center gap-2.5">
          <OFLogo size={26} />
          <span className="font-display font-bold tracking-[0.12em] text-black">
            OPEN<span className="text-[#0098EA]">FRAGMENT</span>
          </span>
          <span className="ml-2">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#features" className="hover:text-black transition-colors">Features</a>
          <a href="#how" className="hover:text-black transition-colors">How it works</a>
          <a href="#security" className="hover:text-black transition-colors">Security</a>
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-black transition-colors"
            title="@openfragment on X"
          >
            <XIcon className="size-3" />
            X / Twitter
          </a>
          <a href="https://ton.org" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">
            TON
          </a>
        </div>
      </div>
    </footer>
  );
}
