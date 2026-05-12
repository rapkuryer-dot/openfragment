import { useState, useRef, type FormEvent, type DragEvent } from 'react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Address, toNano, beginCell, storeStateInit } from '@ton/core';
import {
  CheckCircle,
  ExternalLink,
  Copy,
  AlertCircle,
  Info,
  CheckCircle2,
  UploadCloud,
  X as XIcon,
  Image as ImageIcon,
} from 'lucide-react';
import { buildDeployMessage, parseUnits } from '../lib/deploy';
import { getErrorMessage, isCancelledTransactionError } from '../lib/errors';
import {
  uploadImageToCatbox,
  uploadMetadataJson,
  validateOptionalHttpsUrl,
} from '../lib/tonMetadataJson';
import {
  dyorTokenUrl,
  dedustPortfolioUrl,
  stonFiSwapTonToJettonUrl,
  tonscanJettonUrl,
  tryFriendlyJettonAddress,
  tonviewerJettonUrl,
} from '../lib/explorerLinks';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Props {
  network: 'mainnet' | 'testnet';
}

export function DeployPage({ network }: Props) {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState('9');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<{
    name: string;
    type: string;
    size: number;
    base64: string;
    dataUrl: string;
  } | null>(null);
  const [imageDragOver, setImageDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [mainnetConfirm, setMainnetConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);

  const ownerAddress = wallet?.account?.address
    ? Address.parse(wallet.account.address)
    : null;

  const isConnected = !!wallet;

  async function handleDeploy(e: FormEvent) {
    e.preventDefault();

    if (!isConnected) {
      tonConnectUI.openModal();
      return;
    }

    if (!ownerAddress) return;

    const expectedChain = network === 'mainnet' ? '-239' : '-3';
    const walletChain = wallet?.account?.chain;
    if (walletChain && walletChain !== expectedChain) {
      setStatus({
        type: 'error',
        message: `Wallet network mismatch. Switch Tonkeeper to ${network === 'mainnet' ? 'Mainnet' : 'Testnet'} and reconnect.`,
      });
      return;
    }

    if (network === 'mainnet' && mainnetConfirm.trim().toUpperCase() !== 'DEPLOY') {
      setStatus({
        type: 'error',
        message: 'Type DEPLOY to confirm mainnet deployment',
      });
      return;
    }

    if (!name.trim() || !symbol.trim()) {
      setStatus({ type: 'error', message: 'Name and symbol are required' });
      return;
    }

    const dec = parseInt(decimals);
    if (isNaN(dec) || dec < 0 || dec > 18) {
      setStatus({
        type: 'error',
        message: 'Decimals must be between 0 and 18',
      });
      return;
    }

    const mintAmountParsed = parseFloat(mintAmount);
    if (isNaN(mintAmountParsed) || mintAmountParsed <= 0) {
      setStatus({ type: 'error', message: 'Enter a valid mint amount' });
      return;
    }

    for (const [label, val] of [
      ['Website', websiteUrl],
      ['X (Twitter)', twitterUrl],
      ['Telegram', telegramUrl],
    ] as const) {
      const uerr = validateOptionalHttpsUrl(label, val);
      if (uerr) {
        setStatus({ type: 'error', message: uerr });
        return;
      }
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Preparing deployment...' });

    try {
      const mintAmountNano = parseUnits(mintAmount.trim(), dec);

      let publicImageUrl: string | undefined;
      if (imageFile) {
        setStatus({
          type: 'info',
          message: 'Uploading token logo...',
        });
        const hostedImage = await uploadImageToCatbox({
          base64: imageFile.base64,
          mimeType: imageFile.type,
          filename: imageFile.name,
        });
        if (hostedImage) publicImageUrl = hostedImage;
      }

      setStatus({
        type: 'info',
        message:
          'Uploading token metadata (used by Tonviewer, STON.fi, Geckoterminal, Stonks)...',
      });

      const metadataUri = await uploadMetadataJson({
        name: name.trim(),
        symbol: symbol.trim(),
        decimals: decimals,
        description: description.trim() || undefined,
        image: publicImageUrl || imageFile?.dataUrl || undefined,
        website: websiteUrl.trim() || undefined,
        twitter: twitterUrl.trim() || undefined,
        telegram: telegramUrl.trim() || undefined,
      });

      if (!metadataUri) {
        setStatus({
          type: 'error',
          message:
            'Could not upload token metadata. Try again in a moment. If it keeps failing, temporarily disable strict ad-blockers or VPN filters for this site.',
        });
        setLoading(false);
        return;
      }

      console.log('[OPENFRAGMENT] Off-chain metadata URI:', metadataUri);

      const { contractAddress, stateInit, mintBody } = await buildDeployMessage(
        {
          metadata: {
            name: name.trim(),
            symbol: symbol.trim(),
            decimals: decimals,
          },
          offchainUri: metadataUri,
          ownerAddress,
          mintAmount: mintAmountNano,
        },
      );

      setStatus({
        type: 'info',
        message:
          'Switch to Tonkeeper to confirm the transaction. The request will appear there in a moment.',
      });

      console.group('[OPENFRAGMENT] Sending TON Connect transaction');
      console.log('Wallet:', wallet?.device);
      console.log('Wallet account:', wallet?.account);
      console.log('TonConnect connected:', tonConnectUI.connected);
      console.log('Target contract:', contractAddress.toString());
      console.log('Network:', network);
      console.log('Sending request to bridge...');
      console.groupEnd();

      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        network: network === 'mainnet' ? '-239' : '-3',
        messages: [
          {
            address: contractAddress.toString(),
            amount: toNano('1').toString(),
            stateInit: beginCell()
              .store(storeStateInit(stateInit))
              .endCell()
              .toBoc()
              .toString('base64'),
            payload: mintBody.toBoc().toString('base64'),
          },
        ],
      });

      const friendlyAddr = contractAddress.toString({
        bounceable: true,
        testOnly: network === 'testnet',
      });
      setDeployedAddress(friendlyAddr);
      setStatus({ type: 'success', message: 'Jetton deployed successfully!' });
      console.log('[OPENFRAGMENT] Deploy success — address:', friendlyAddr);
    } catch (err) {
      console.error('[OPENFRAGMENT] Deploy error:', err);
      const msg = getErrorMessage(err) || 'Deployment failed';
      if (isCancelledTransactionError(err)) {
        setStatus({ type: 'error', message: 'Transaction cancelled' });
      } else if (/transaction was not sent|aborted|timeout/i.test(msg)) {
        try {
          await tonConnectUI.disconnect();
        } catch {
          /* noop */
        }
        setStatus({
          type: 'error',
          message:
            'Wallet did not receive the request. Click "Connect Wallet" to reconnect Tonkeeper and try again.',
        });
      } else {
        setStatus({ type: 'error', message: msg });
      }
    } finally {
      setLoading(false);
      setStatus((prev) => (prev?.type === 'info' ? null : prev));
    }
  }

  const displaySymbol = symbol.trim() || 'TKN';
  const displayName = name.trim() || 'Token Name';

  return (
    <div className="grid grid-cols-[1fr_320px] gap-5 items-start max-md:grid-cols-1">
      <div className="space-y-4.5">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl tracking-tight">
              Deploy New Jetton
            </CardTitle>
            <CardDescription>
              Create a new Jetton token on{' '}
              {network === 'mainnet' ? 'TON Mainnet' : 'TON Testnet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDeploy} className="space-y-4.5">
              {network === 'mainnet' && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <div className="space-y-1">
                    <AlertTitle>
                      Mainnet deployment. Use a dedicated wallet with limited TON.
                    </AlertTitle>
                    <p className="text-sm text-muted-foreground">
                      Never share seed/private keys. Verify the address, amount, and network in Tonkeeper before signing.
                    </p>
                  </div>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Token Name
                  </Label>
                  <Input
                    placeholder="My Token"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Symbol
                  </Label>
                  <Input
                    placeholder="MTK"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Decimals
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="18"
                    value={decimals}
                    onChange={(e) => setDecimals(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Initial Supply
                  </Label>
                  <Input
                    placeholder="1000000"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minted to your wallet
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Description
                </Label>
                <Textarea
                  placeholder="Describe your token..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Token Logo
                </Label>
                <ImageDropzone
                  file={imageFile}
                  onFile={async (f) => {
                    const err = await readImageFile(f);
                    if (typeof err === 'string') {
                      setStatus({ type: 'error', message: err });
                      return;
                    }
                    setImageFile(err);
                  }}
                  onClear={() => setImageFile(null)}
                  disabled={loading}
                  dragOver={imageDragOver}
                  setDragOver={setImageDragOver}
                  inputRef={fileInputRef}
                />
                <p className="text-xs text-muted-foreground">
                  Drag &amp; drop or click. PNG/JPEG/WebP up to 96&nbsp;KB — embedded on-chain so explorers always render your logo.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Website (optional)
                </Label>
                <Input
                  type="url"
                  placeholder="https://yourproject.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  https only. Stored in metadata for TonAPI / explorers.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    X (Twitter) URL
                  </Label>
                  <Input
                    type="url"
                    placeholder="https://x.com/yourhandle"
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Telegram URL
                  </Label>
                  <Input
                    type="url"
                    placeholder="https://t.me/yourchannel"
                    value={telegramUrl}
                    onChange={(e) => setTelegramUrl(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {network === 'mainnet' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Confirm Mainnet Deploy
                  </Label>
                  <Input
                    placeholder="Type DEPLOY"
                    value={mainnetConfirm}
                    onChange={(e) => setMainnetConfirm(e.target.value)}
                    disabled={loading}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    This prevents accidental mainnet transactions.
                  </p>
                </div>
              )}

              <Button
                className="w-full h-12 rounded-full text-[15px] font-bold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> Deploying...
                  </>
                ) : !isConnected ? (
                  'Connect Wallet to Deploy'
                ) : (
                  'Deploy Jetton'
                )}
              </Button>
            </form>

            {status && !deployedAddress && (
              <StatusAlert
                type={status.type}
                message={status.message}
                className="mt-4"
              />
            )}
          </CardContent>
        </Card>

        {deployedAddress && (
          <DeployedCard
            address={deployedAddress}
            network={network}
            walletAddress={wallet?.account?.address ?? null}
          />
        )}
      </div>

      <TokenPreview
        name={displayName}
        symbol={displaySymbol}
        decimals={decimals}
        supply={mintAmount}
        description={description}
        imagePreview={imageFile?.dataUrl || ''}
        websiteUrl={websiteUrl}
        twitterUrl={twitterUrl}
        telegramUrl={telegramUrl}
        network={network}
      />
    </div>
  );
}

type ImageFileData = {
  name: string;
  type: string;
  size: number;
  base64: string;
  dataUrl: string;
};

const MAX_IMAGE_BYTES = 96 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

async function readImageFile(file: File): Promise<ImageFileData | string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Unsupported image type. Use PNG, JPEG, WebP, or GIF.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Image too large (${(file.size / 1024).toFixed(1)} KB). Keep it under ${MAX_IMAGE_BYTES / 1024} KB so it fits on-chain.`;
  }
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const base64 = btoa(binary);
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    base64,
    dataUrl: `data:${file.type};base64,${base64}`,
  };
}

function ImageDropzone({
  file,
  onFile,
  onClear,
  disabled,
  dragOver,
  setDragOver,
  inputRef,
}: {
  file: ImageFileData | null;
  onFile: (f: File) => void;
  onClear: () => void;
  disabled?: boolean;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  if (file) {
    return (
      <div className="flex items-center gap-3.5 rounded-xl border border-border bg-muted/30 p-3">
        <img
          src={file.dataUrl}
          alt={file.name}
          className="size-14 rounded-lg object-cover border border-border"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{file.name}</div>
          <div className="text-xs text-muted-foreground font-mono">
            {(file.size / 1024).toFixed(1)} KB · {file.type.replace('image/', '').toUpperCase()}
          </div>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors"
        >
          Replace
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="size-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted flex items-center justify-center transition-colors"
          title="Remove"
        >
          <XIcon className="size-4" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`group relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all cursor-pointer px-6 py-8 text-center ${
        dragOver
          ? 'border-[#0098EA] bg-[#0098EA]/5'
          : 'border-border bg-muted/20 hover:border-[#0098EA]/60 hover:bg-muted/40'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className={`size-11 rounded-full flex items-center justify-center transition-colors ${dragOver ? 'bg-[#0098EA] text-white' : 'bg-[#0098EA]/10 text-[#0098EA] group-hover:bg-[#0098EA]/15'}`}>
        <UploadCloud className="size-5" />
      </div>
      <div className="text-sm font-semibold">
        {dragOver ? 'Drop image here' : (
          <>
            <span className="text-[#0098EA]">Click to upload</span> or drag &amp; drop
          </>
        )}
      </div>
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <ImageIcon className="size-3.5" />
        PNG · JPEG · WebP · GIF — up to 96&nbsp;KB
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function StatusAlert({
  type,
  message,
  className,
}: {
  type: string;
  message: string;
  className?: string;
}) {
  const variant =
    type === 'error' ? 'destructive' : type === 'success' ? 'success' : 'info';
  const Icon =
    type === 'error' ? AlertCircle : type === 'success' ? CheckCircle2 : Info;
  return (
    <Alert variant={variant} className={className}>
      <Icon className="size-4" />
      <AlertTitle>{message}</AlertTitle>
    </Alert>
  );
}

function DeployedCard({
  address,
  network,
  walletAddress,
}: {
  address: string;
  network: 'mainnet' | 'testnet';
  walletAddress: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const friendly =
    tryFriendlyJettonAddress(address, network) ?? address.trim();

  return (
    <Card>
      <CardContent className="text-center py-5">
        <div
          className="mb-3.5 flex justify-center"
          style={{ color: 'var(--success)' }}
        >
          <CheckCircle className="size-9" strokeWidth={1.5} />
        </div>
        <div className="text-base font-bold mb-1.5">Jetton Deployed</div>
        <p className="text-sm text-muted-foreground mb-4.5">
          Your contract is live on{' '}
          {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
        </p>
        <div className="flex items-center justify-center gap-2.5 flex-wrap">
          <Button asChild className="rounded-full h-10">
            <a
              href={tonviewerJettonUrl(network, friendly)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" />
              Tonviewer
            </a>
          </Button>
          <Button
            variant="secondary"
            className="rounded-full h-10"
            onClick={() => {
              navigator.clipboard.writeText(friendly);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            <Copy className="size-4" />
            {copied ? 'Copied!' : 'Copy Address'}
          </Button>
        </div>
        <p className="mt-3.5 font-mono text-xs text-muted-foreground break-all">
          {friendly}
        </p>

        <div className="mt-5 pt-5 border-t border-border text-left space-y-2.5">
          <div className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            DEX &amp; explorers
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button asChild variant="outline" size="sm" className="rounded-full h-8 text-xs">
              <a
                href={tonscanJettonUrl(friendly)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Tonscan
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-full h-8 text-xs">
              <a
                href={dyorTokenUrl(friendly)}
                target="_blank"
                rel="noopener noreferrer"
              >
                DYOR.io
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-full h-8 text-xs">
              <a
                href={stonFiSwapTonToJettonUrl(friendly)}
                target="_blank"
                rel="noopener noreferrer"
              >
                STON.fi
              </a>
            </Button>
            {walletAddress?.trim() ? (
              <Button asChild variant="outline" size="sm" className="rounded-full h-8 text-xs">
                <a
                  href={dedustPortfolioUrl(walletAddress.trim())}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  DeDust (portfolio)
                </a>
              </Button>
            ) : null}
          </div>
          {!walletAddress?.trim() && (
            <p className="text-center text-[11px] text-muted-foreground">
              Connect the same wallet to open your DeDust portfolio link here.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TokenPreview({
  name,
  symbol,
  decimals,
  supply,
  description,
  imagePreview,
  websiteUrl,
  twitterUrl,
  telegramUrl,
  network,
}: {
  name: string;
  symbol: string;
  decimals: string;
  supply: string;
  description: string;
  imagePreview: string;
  websiteUrl: string;
  twitterUrl: string;
  telegramUrl: string;
  network: 'mainnet' | 'testnet';
}) {
  const [imgError, setImgError] = useState(false);
  const initial = symbol.charAt(0).toUpperCase();

  const dec = parseInt(decimals) || 9;
  const supplyNum = parseFloat(supply);
  const formattedSupply = !isNaN(supplyNum)
    ? supplyNum.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : '0';

  return (
    <Card className="sticky top-20 max-md:static max-md:order-[-1]">
      <CardContent className="space-y-0">
        <div className="flex items-center gap-3.5 mb-5">
          <Avatar className="size-14 border-2 border-border">
            {imagePreview.trim() && !imgError ? (
              <AvatarImage
                src={imagePreview.trim()}
                alt={name}
                onError={() => setImgError(true)}
              />
            ) : null}
            <AvatarFallback className="bg-[#0098EA] text-white text-xl font-extrabold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-lg font-bold tracking-tight truncate">
              {name}
            </div>
            <div className="font-mono text-[13px] font-semibold text-[#0098EA]">
              ${symbol}
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <PreviewRow label="Supply" value={`${formattedSupply} ${symbol}`} />
        <PreviewRow label="Decimals" value={String(dec)} />
        <PreviewRow label="Standard" value="TEP-74 Jetton" />
        <PreviewRow
          label="Mintable"
          value="Yes"
          valueClassName="text-[var(--success)]"
        />

        {twitterUrl.trim() && (
          <PreviewRow label="X / Twitter" value={twitterUrl.trim()} />
        )}
        {telegramUrl.trim() && (
          <PreviewRow label="Telegram" value={telegramUrl.trim()} />
        )}
        {websiteUrl.trim() && (
          <PreviewRow label="Website" value={websiteUrl.trim()} />
        )}

        {description.trim() && (
          <>
            <Separator className="my-4" />
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              About
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {description.trim()}
            </p>
          </>
        )}

        <NetworkBadge network={network} />
      </CardContent>
    </Card>
  );
}

export function PreviewRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`font-mono text-[13px] font-semibold text-right max-w-[65%] truncate ${valueClassName || ''}`}
      >
        {value}
      </span>
    </div>
  );
}

export function NetworkBadge({ network }: { network: 'mainnet' | 'testnet' }) {
  return (
    <Badge
      variant="outline"
      className={`mt-4 gap-1.5 py-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider ${
        network === 'mainnet'
          ? 'border-[var(--success)]/20 text-[var(--success)] bg-[var(--success)]/10'
          : 'border-[var(--warning)]/20 text-[var(--warning)] bg-[var(--warning)]/10'
      }`}
    >
      <span
        className="size-1.5 rounded-full"
        style={{
          background:
            network === 'mainnet' ? 'var(--success)' : 'var(--warning)',
        }}
      />
      {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
    </Badge>
  );
}
