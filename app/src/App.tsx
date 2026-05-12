import { useEffect } from 'react';
import { TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react';
import { THEME } from '@tonconnect/ui-react';
import { ChevronDown, Check, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { DeployPage } from './pages/DeployPage';
import { ManagePage } from './pages/ManagePage';
import { LandingPage } from './pages/LandingPage';
import { OFLogo } from './pages/LandingPage';
import { TelegramIcon } from '@/components/TelegramIcon';
import { TELEGRAM_COMMUNITY_URL } from '@/lib/siteLinks';
import { TonPriceTicker } from '@/components/TonPriceTicker';
import { useRouter } from './lib/router';

export const useTheme = () => ({ theme: 'light' as const, toggle: () => {} });

export default function App() {
  const { page, network, address, go, setTestnet, setAddress } = useRouter();
  const allowTestnet = import.meta.env.VITE_ALLOW_TESTNET === 'true';
  const [tonConnectUI] = useTonConnectUI();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    tonConnectUI.uiOptions = {
      uiPreferences: { theme: THEME.LIGHT },
    };
  }, [tonConnectUI, page]);

  return (
    <>
      <TonPriceTicker />
      {page === 'landing' ? (
        <LandingPage
          onLaunch={() =>
            window.open('/create', '_blank', 'noopener,noreferrer')
          }
        />
      ) : (
        <div className="min-h-full flex flex-col">
          <header
            className="flex items-center justify-between px-7 h-[60px] border-b fixed top-0 left-0 right-0 z-50 max-sm:px-4 max-sm:h-auto max-sm:flex-wrap max-sm:gap-2.5 max-sm:py-3"
            style={{
              background: '#fff',
              borderBottomColor: 'rgba(0,0,0,0.06)',
            }}
          >
            <div className="flex items-center gap-6 max-sm:gap-2.5 max-sm:w-full max-sm:justify-between">
              <button
                onClick={() => go('landing')}
                className="flex items-center gap-2.5 text-[17px] font-bold max-sm:text-[15px] hover:opacity-80 transition-opacity"
                title="Back to home"
              >
                <OFLogo size={32} />
                <span className="font-display tracking-tight">
                  OPEN<span className="text-[#0098EA]">FRAGMENT</span>
                </span>
              </button>
              <nav
                className="flex gap-0.5 p-[3px] h-10 rounded-full items-center max-sm:h-9"
                style={{ background: '#F0F1F3' }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-full px-4 h-[34px] text-[15px] font-bold max-sm:h-[30px] max-sm:px-3.5 max-sm:text-[13px] hover:bg-transparent ${
                    page === 'create'
                      ? 'bg-[#0098EA] text-white hover:bg-[#0098EA] hover:text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => go('create')}
                >
                  Create
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-full px-4 h-[34px] text-[15px] font-bold max-sm:h-[30px] max-sm:px-3.5 max-sm:text-[13px] hover:bg-transparent ${
                    page === 'manage'
                      ? 'bg-[#0098EA] text-white hover:bg-[#0098EA] hover:text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => go('manage')}
                >
                  Manage
                </Button>
              </nav>
            </div>
            <div className="flex items-center gap-2.5">
              {allowTestnet ? (
                <NetworkDropdown network={network} setTestnet={setTestnet} />
              ) : (
                <Button
                  variant="ghost"
                  className="rounded-full h-10 px-3 text-[15px] font-bold max-sm:h-9 max-sm:text-sm max-sm:px-2.5"
                  style={{ background: '#F0F1F3', color: 'var(--foreground)' }}
                  title="Network locked to Mainnet"
                >
                  <Circle
                    className="size-2 fill-current mr-2"
                    style={{ color: 'var(--success)' }}
                  />
                  Mainnet
                </Button>
              )}
              <a
                href={TELEGRAM_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-10 items-center justify-center rounded-full border border-black/[0.08] text-[#229ED9] hover:bg-[#F0F1F3] hover:border-black/[0.12] transition-colors max-sm:size-9"
                title="OPENFRAGMENT on Telegram"
                aria-label="Telegram community"
              >
                <TelegramIcon className="size-[18px]" />
              </a>
              <TonConnectButton />
            </div>
          </header>

          <main
            key={page}
            className="of-page-enter flex-1 max-w-[960px] w-full mx-auto px-6 pt-24 pb-15 max-sm:px-4 max-sm:pt-28 max-sm:pb-12"
          >
            {page === 'create' ? (
              <DeployPage network={network} />
            ) : (
              <ManagePage
                network={network}
                initialAddress={address}
                onAddressChange={setAddress}
              />
            )}
          </main>
        </div>
      )}
    </>
  );
}

function NetworkDropdown({
  network,
  setTestnet,
}: {
  network: 'mainnet' | 'testnet';
  setTestnet: (testnet: boolean) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="rounded-full h-10 px-3 gap-1.5 text-[15px] font-bold max-sm:h-9 max-sm:text-sm max-sm:px-2.5"
          style={{ background: '#F0F1F3', color: 'var(--foreground)' }}
        >
          <Circle
            className="size-2 fill-current"
            style={{
              color:
                network === 'testnet' ? 'var(--warning)' : 'var(--success)',
            }}
          />
          {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px] rounded-xl p-2">
        <DropdownMenuItem
          className="rounded-xl px-3.5 py-3 text-[15px] font-medium gap-2.5 cursor-pointer"
          onClick={() => setTestnet(false)}
        >
          <Circle
            className="size-2 fill-current"
            style={{ color: 'var(--success)' }}
          />
          Mainnet
          {network === 'mainnet' && <Check className="size-4 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-xl px-3.5 py-3 text-[15px] font-medium gap-2.5 cursor-pointer"
          onClick={() => setTestnet(true)}
        >
          <Circle
            className="size-2 fill-current"
            style={{ color: 'var(--warning)' }}
          />
          Testnet
          {network === 'testnet' && <Check className="size-4 ml-auto" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
