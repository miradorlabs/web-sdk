/**
 * Wallet discovery and identification for the Mirador SDK.
 *
 * Uses EIP-6963 (Multi Injected Provider Discovery) to enumerate wallets,
 * with a fallback to legacy `window.ethereum` flag detection for wallets
 * that haven't migrated to the new standard.
 */

import type { EIP1193Provider } from '@miradorlabs/plugins';

/** Information about a single wallet detected in the browser. */
export interface WalletInfo {
  /** Human-readable wallet name (e.g. "MetaMask", "Coinbase Wallet") */
  name: string;
  /** Reverse-DNS identifier from EIP-6963 (e.g. "io.metamask"); synthetic for legacy detection */
  rdns: string;
  /** Stable per-install identifier from EIP-6963 (omitted for legacy detection) */
  uuid?: string;
  /** Wallet client version string from `web3_clientVersion` RPC (omitted if unavailable) */
  version?: string;
  /** How the wallet was detected */
  source: 'eip6963' | 'legacy';
}

/** Result of a discovery pass. */
export interface WalletDiscovery {
  /** Deduplicated list of detected wallets (by rdns) */
  wallets: WalletInfo[];
  /** EIP-6963 announcements indexed by provider reference, used to identify the active wallet at tx time */
  announcementsByProvider: Map<EIP1193Provider, EIP6963Announcement>;
}

interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963Announcement {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

/** Detection map for legacy injected providers (pre-EIP-6963). */
const LEGACY_FLAGS: Array<{ flag: string; name: string; rdns: string }> = [
  { flag: 'isMetaMask', name: 'MetaMask', rdns: 'io.metamask' },
  { flag: 'isCoinbaseWallet', name: 'Coinbase Wallet', rdns: 'com.coinbase.wallet' },
  { flag: 'isBraveWallet', name: 'Brave Wallet', rdns: 'com.brave.wallet' },
  { flag: 'isRabby', name: 'Rabby', rdns: 'io.rabby' },
  { flag: 'isTrust', name: 'Trust Wallet', rdns: 'com.trustwallet.app' },
  { flag: 'isTrustWallet', name: 'Trust Wallet', rdns: 'com.trustwallet.app' },
  { flag: 'isFrame', name: 'Frame', rdns: 'sh.frame' },
  { flag: 'isPhantom', name: 'Phantom', rdns: 'app.phantom' },
  { flag: 'isOpera', name: 'Opera Wallet', rdns: 'com.opera' },
  { flag: 'isTokenPocket', name: 'TokenPocket', rdns: 'pro.tokenpocket' },
  { flag: 'isExodus', name: 'Exodus', rdns: 'com.exodus' },
  { flag: 'isOkxWallet', name: 'OKX Wallet', rdns: 'com.okex.wallet' },
  { flag: 'isOKExWallet', name: 'OKX Wallet', rdns: 'com.okex.wallet' },
  { flag: 'isZerion', name: 'Zerion', rdns: 'io.zerion.wallet' },
  { flag: 'isXDEFI', name: 'XDEFI', rdns: 'io.xdefi' },
];

/**
 * Discover all wallets installed in the current browser.
 *
 * Dispatches an EIP-6963 `requestProvider` event and collects announcements,
 * then scans `window.ethereum` (and `window.ethereum.providers` if present) for
 * legacy wallets not announced via EIP-6963. Each wallet's version is enriched
 * (best-effort) by calling the `web3_clientVersion` RPC method.
 *
 * Returns an empty discovery in non-browser environments.
 *
 * @param timeoutMs How long to wait for EIP-6963 announcements (default: 500ms)
 */
export async function discoverInstalledWallets(timeoutMs: number = 500): Promise<WalletDiscovery> {
  if (typeof window === 'undefined') {
    return { wallets: [], announcementsByProvider: new Map() };
  }

  const announcements = await collectEIP6963Announcements(timeoutMs);
  const announcementsByProvider = new Map<EIP1193Provider, EIP6963Announcement>();
  const seenRdns = new Set<string>();
  const eip6963Wallets: Array<{ ann: EIP6963Announcement; versionPromise: Promise<string | undefined> }> = [];

  for (const ann of announcements) {
    announcementsByProvider.set(ann.provider, ann);
    if (seenRdns.has(ann.info.rdns)) continue;
    seenRdns.add(ann.info.rdns);
    eip6963Wallets.push({ ann, versionPromise: safeGetClientVersion(ann.provider) });
  }

  const legacyCandidates = collectLegacyProviders().filter((c) => !seenRdns.has(c.info.rdns));
  for (const c of legacyCandidates) seenRdns.add(c.info.rdns);
  const legacyWallets = legacyCandidates.map((c) => ({
    ...c,
    versionPromise: safeGetClientVersion(c.provider),
  }));

  const wallets: WalletInfo[] = [];

  for (const { ann, versionPromise } of eip6963Wallets) {
    wallets.push({
      name: ann.info.name,
      rdns: ann.info.rdns,
      uuid: ann.info.uuid,
      version: await versionPromise,
      source: 'eip6963',
    });
  }
  for (const { info, versionPromise } of legacyWallets) {
    wallets.push({ ...info, version: await versionPromise, source: 'legacy' });
  }

  return { wallets, announcementsByProvider };
}

/**
 * Identify which wallet a given EIP-1193 provider corresponds to.
 *
 * Tries EIP-6963 announcement matching first (by provider reference), then
 * falls back to inspecting legacy `is*` flags on the provider object. As a
 * last resort, attempts to derive identity from `web3_clientVersion`.
 */
export async function identifyProvider(
  provider: EIP1193Provider,
  discovery?: WalletDiscovery,
): Promise<WalletInfo | null> {
  if (discovery) {
    const announced = discovery.announcementsByProvider.get(provider);
    if (announced) {
      const existing = discovery.wallets.find((w) => w.rdns === announced.info.rdns);
      if (existing) return existing;
      const version = await safeGetClientVersion(provider);
      return {
        name: announced.info.name,
        rdns: announced.info.rdns,
        uuid: announced.info.uuid,
        version,
        source: 'eip6963',
      };
    }
  }

  const legacy = inspectLegacyFlags(provider);
  if (legacy) {
    const version = await safeGetClientVersion(provider);
    return { ...legacy, version, source: 'legacy' };
  }

  const version = await safeGetClientVersion(provider);
  if (version) {
    return { name: 'Unknown', rdns: 'unknown', version, source: 'legacy' };
  }
  return null;
}

function collectEIP6963Announcements(timeoutMs: number): Promise<EIP6963Announcement[]> {
  return new Promise((resolve) => {
    const seenUuids = new Set<string>();
    const announcements: EIP6963Announcement[] = [];

    const handler = (event: Event) => {
      const ce = event as CustomEvent<EIP6963Announcement>;
      const ann = ce.detail;
      if (!ann || !ann.info || !ann.provider) return;
      if (seenUuids.has(ann.info.uuid)) return;
      seenUuids.add(ann.info.uuid);
      announcements.push(ann);
    };

    window.addEventListener('eip6963:announceProvider', handler as EventListener);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', handler as EventListener);
      resolve(announcements);
    }, timeoutMs);
  });
}

function collectLegacyProviders(): Array<{ provider: EIP1193Provider; info: { name: string; rdns: string } }> {
  const out: Array<{ provider: EIP1193Provider; info: { name: string; rdns: string } }> = [];
  const eth = (window as Window & {
    ethereum?: EIP1193Provider & { providers?: EIP1193Provider[] };
  }).ethereum;
  if (!eth) return out;

  const candidates = Array.isArray(eth.providers) && eth.providers.length > 0 ? eth.providers : [eth];
  for (const candidate of candidates) {
    const info = inspectLegacyFlags(candidate);
    if (info) out.push({ provider: candidate, info });
  }
  return out;
}

function inspectLegacyFlags(provider: EIP1193Provider): { name: string; rdns: string } | null {
  const p = provider as unknown as Record<string, unknown>;
  for (const { flag, name, rdns } of LEGACY_FLAGS) {
    if (p[flag] === true) return { name, rdns };
  }
  return null;
}

async function safeGetClientVersion(provider: EIP1193Provider): Promise<string | undefined> {
  try {
    const result = await provider.request({ method: 'web3_clientVersion' });
    if (typeof result === 'string' && result.length > 0) return result;
  } catch {
    // Wallet doesn't support web3_clientVersion — version stays undefined
  }
  return undefined;
}
