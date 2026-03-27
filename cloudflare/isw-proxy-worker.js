/**
 * OmoHealth — Interswitch Multi-Host Proxy
 * Cloudflare Worker Script
 *
 * Routes requests to the correct ISW host based on first path segment:
 *   /merchant-wallet/**  → https://merchant-wallet.k8.isw.la/**
 *   /collections/**      → https://qa.interswitchng.com/collections/**
 *   /passport/**         → https://qa.interswitchng.com/passport/**
 *   /quicktellerservice/** → https://qa.interswitchng.com/quicktellerservice/**
 *   /api/v1/**           → https://merchant-wallet.k8.isw.la/api/v1/**  (merchant wallet ops)
 *
 * Usage in backend:
 *   ISW_MERCHANT_WALLET_BASE = https://omohealth.josephofilii.workers.dev/merchant-wallet
 *   ISW_PASSPORT_BASE        = https://omohealth.josephofilii.workers.dev
 */

const ROUTE_MAP = {
  '/merchant-wallet': 'https://merchant-wallet.k8.isw.la',
  '/collections':     'https://qa.interswitchng.com',
  '/passport':        'https://qa.interswitchng.com',
  '/quicktellerservice': 'https://qa.interswitchng.com',
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Find matching route prefix
    let targetBase = null;
    let strippedPath = pathname;

    for (const [prefix, host] of Object.entries(ROUTE_MAP)) {
      if (pathname.startsWith(prefix)) {
        targetBase = host;
        // Strip the prefix so /merchant-wallet/api/v1/wallet → /api/v1/wallet on ISW host
        strippedPath = pathname.slice(prefix.length) || '/';
        break;
      }
    }

    if (!targetBase) {
      return new Response('Unknown route prefix. Use /merchant-wallet, /collections, /passport, or /quicktellerservice.', { status: 404 });
    }

    const target = new URL(strippedPath + url.search, targetBase);

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
