// Cloudflare Worker — CORS proxy for waveform audio loading
// Deploy at: https://audio-waveform-proxy.super-morning-31df.workers.dev/
//
// Usage: https://<worker>/https://media.ringba.com/recording-public?v=v1&k=...
// The full audio URL goes in the path. No encoding needed.

const ALLOWED_ORIGIN_SUFFIXES = [
  '.weweb.io',
  '.callers.io',
];

const ALLOWED_UPSTREAM_SUFFIXES = [
  '.ringba.com',
  '.telnyx.com',
  '.signalwire.com',
];

function isOriginAllowed(origin) {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return ALLOWED_ORIGIN_SUFFIXES.some(
      (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
    );
  } catch {
    return false;
  }
}

function isUpstreamAllowed(hostname) {
  return ALLOWED_UPSTREAM_SUFFIXES.some(
    (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
  );
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const allowed = isOriginAllowed(origin);

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowed ? origin : '',
      'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    };

    if (!allowed) {
      return new Response('Forbidden', { status: 403 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const reqUrl = new URL(request.url);
    const target = reqUrl.pathname.slice(1) + reqUrl.search;

    if (!target || !target.startsWith('http')) {
      return new Response(
        'Append the full audio URL to the path.\nExample: https://this-worker.dev/https://media.ringba.com/audio.mp3',
        { status: 400, headers: { ...corsHeaders, 'content-type': 'text/plain' } },
      );
    }

    let upstreamUrl;
    try {
      upstreamUrl = new URL(target);
    } catch {
      return new Response('Invalid target URL', {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'text/plain' },
      });
    }

    if (!isUpstreamAllowed(upstreamUrl.hostname)) {
      return new Response('Upstream host not allowed', {
        status: 403,
        headers: { ...corsHeaders, 'content-type': 'text/plain' },
      });
    }

    try {
      const resp = await fetch(upstreamUrl.toString(), {
        method: 'GET',
        headers: { 'User-Agent': 'audio-waveform-proxy' },
      });

      const headers = new Headers(corsHeaders);
      const ct = resp.headers.get('content-type');
      const cl = resp.headers.get('content-length');
      const cc = resp.headers.get('cache-control');
      if (ct) headers.set('content-type', ct);
      if (cl) headers.set('content-length', cl);
      headers.set('cache-control', cc || 'public, max-age=3600');

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers,
      });
    } catch (err) {
      return new Response(`Proxy fetch failed: ${err.message || String(err)}`, {
        status: 502,
        headers: { ...corsHeaders, 'content-type': 'text/plain' },
      });
    }
  },
};
