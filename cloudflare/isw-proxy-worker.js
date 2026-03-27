/**
 * OmoHealth — Interswitch Merchant-Wallet Proxy
 * Cloudflare Worker Script
 *
 * Problem:
 *   ISW's QA Merchant Wallet API (merchant-wallet.k8.isw.la) IP-restricts
 *   access. Railway's US-based servers receive ETIMEDOUT. Nigerian ISPs
 *   (local dev machines) connect fine.
 *
 * Solution:
 *   Deploy this Worker (free Cloudflare account) so requests exit from
 *   Cloudflare's global network instead of Railway's US datacenter.
 *
 * Deploy:
 *   1. Go to https://dash.cloudflare.com -> Workers & Pages -> Create Worker
 *   2. Paste this entire file and click "Save and Deploy"
 *   3. Copy the Worker URL (e.g. https://omohealth.YOURNAME.workers.dev)
 *   4. Set ISW_MERCHANT_WALLET_BASE=<worker-url> in Railway env variables
 *   5. Redeploy the backend (railway up)
 *
 * How it works:
 *   All requests to /<path> are forwarded to:
 *     https://merchant-wallet.k8.isw.la/<path>
 *   with the original method, headers, and body intact.
 *   The Worker sits transparently between Railway and ISW.
 *
 * Current deployment: https://omohealth.josephofilii.workers.dev
 */

const ISW_TARGET = 'https://merchant-wallet.k8.isw.la';

export default {
  async fetch(request) {
    const url    = new URL(request.url);
    const target = new URL(url.pathname + url.search, ISW_TARGET);

    // Forward original method, headers, and body
    const proxyRequest = new Request(target.toString(), {
      method:  request.method,
      headers: request.headers,
      body:    request.method !== 'GET' && request.method !== 'HEAD'
                 ? request.body
                 : undefined,
      redirect: 'follow',
    });

    const response = await fetch(proxyRequest);

    // Pass response through, adding CORS headers for browser clients
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('X-Proxy', 'omohealth-cf-worker');

    return new Response(response.body, {
      status:  response.status,
      headers: responseHeaders,
    });
  },
};
