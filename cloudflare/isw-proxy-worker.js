/**
 * OmoHealth — Interswitch Multi-Host Proxy
 * Cloudflare Worker Script
 *
 * Routes by path prefix, preserving the FULL path on the target host:
 *   /merchant-wallet/** → https://merchant-wallet.k8.isw.la/merchant-wallet/**
 *   /collections/**     → https://qa.interswitchng.com/collections/**
 *   /passport/**        → https://qa.interswitchng.com/passport/**
 *   /quicktellerservice/** → https://qa.interswitchng.com/quicktellerservice/**
 *
 * Backend env vars (set in Railway):
 *   ISW_MERCHANT_WALLET_BASE = https://omohealth.josephofilii.workers.dev/merchant-wallet
 *   ISW_PASSPORT_BASE        = https://omohealth.josephofilii.workers.dev
 *
 * Current deployment: https://omohealth.josephofilii.workers.dev
 */

const ROUTE_MAP = {
  '/merchant-wallet':    'https://merchant-wallet.k8.isw.la',
  '/collections':        'https://qa.interswitchng.com',
  '/passport':           'https://qa.interswitchng.com',
  '/quicktellerservice': 'https://qa.interswitchng.com',
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Determine target host from path prefix (full path preserved on target)
    let targetBase = null;
    for (const [prefix, host] of Object.entries(ROUTE_MAP)) {
      if (pathname === prefix || pathname.startsWith(prefix + '/')) {
        targetBase = host;
        break;
      }
    }

    if (!targetBase) {
      return new Response(
        'Unknown route prefix. Use /merchant-wallet, /collections, /passport, or /quicktellerservice.',
        { status: 404 }
      );
    }

    // Forward FULL path (including prefix) to target host
    const target = new URL(pathname + url.search, targetBase);

    const proxyRequest = new Request(target.toString(), {
      method:  request.method,
      headers: request.headers,
      body:    request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });

    const response = await fetch(proxyRequest);
    return new Response(response.body, {
      status:  response.status,
      headers: response.headers,
    });
  },
};
