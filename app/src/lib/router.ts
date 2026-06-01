import { useState, useEffect, useCallback } from 'react';

type Page = 'landing' | 'create' | 'manage' | 'launchpad';

interface Route {
  page: Page;
  isTestnet: boolean;
  address: string | null;
}

function parseRoute(): Route {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const allowTestnet = import.meta.env.VITE_ALLOW_TESTNET === 'true';
  const isTestnet = allowTestnet && params.get('testnet') === 'true';
  const address = params.get('address') || null;

  if (path === '/manage') return { page: 'manage', isTestnet, address };
  if (path === '/create') return { page: 'create', isTestnet, address: null };
  if (path === '/launchpad')
    return { page: 'launchpad', isTestnet, address: null };
  return { page: 'landing', isTestnet: false, address: null };
}

function buildUrl(page: Page, testnet: boolean, address?: string | null) {
  if (page === 'landing') return '/';
  const path =
    page === 'manage' ? '/manage' : page === 'launchpad' ? '/launchpad' : '/create';
  const params = new URLSearchParams();
  if (testnet) params.set('testnet', 'true');
  if (page === 'manage' && address) params.set('address', address);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

function push(url: string) {
  if (window.location.pathname + window.location.search !== url) {
    history.pushState(null, '', url);
    window.dispatchEvent(new Event('routechange'));
  }
}

function replace(url: string) {
  if (window.location.pathname + window.location.search !== url) {
    history.replaceState(null, '', url);
    window.dispatchEvent(new Event('routechange'));
  }
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseRoute);
  const allowTestnet = import.meta.env.VITE_ALLOW_TESTNET === 'true';

  useEffect(() => {
    const update = () => setRoute(parseRoute());
    window.addEventListener('popstate', update);
    window.addEventListener('routechange', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('routechange', update);
    };
  }, []);

  const go = useCallback(
    (page: Page) => {
      push(buildUrl(page, route.isTestnet));
    },
    [route.isTestnet],
  );

  const setTestnet = useCallback(
    (testnet: boolean) => {
      if (!allowTestnet) {
        push(buildUrl(route.page, false, route.address));
        return;
      }
      push(buildUrl(route.page, testnet, route.address));
    },
    [route.page, route.address, allowTestnet],
  );

  const setAddress = useCallback(
    (address: string) => {
      replace(buildUrl('manage', route.isTestnet, address));
    },
    [route.isTestnet],
  );

  return {
    page: route.page,
    network: (route.isTestnet ? 'testnet' : 'mainnet') as 'mainnet' | 'testnet',
    address: route.address,
    go,
    setTestnet,
    setAddress,
  };
}
