import { CommonEngine } from '@angular/ssr/node';
import { createNodeRequestHandler, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './src/main.server';
import { CLIENT_IP } from './src/app/core/tokens/client-ip.token';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(browserDistFolder, 'index.csr.html');

const commonEngine = new CommonEngine();

/**
 * Homepage cache for on-demand ISR
 * Stores pre-rendered HTML until manually invalidated
 */
let homepageCache: { html: string; timestamp: number; } | null = null;

/**
 * Secret key for revalidation endpoint (set via REVALIDATE_SECRET env var)
 */
const REVALIDATE_SECRET = process.env['REVALIDATE_SECRET'] || 'change-me-in-production';

/**
 * Cache configuration for different route patterns
 * s-maxage: CDN cache duration (seconds)
 * stale-while-revalidate: Serve stale content while fetching fresh (seconds)
 */
interface CacheConfig {
  sMaxAge: number;
  staleWhileRevalidate: number;
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // Home page - cache for 5 minutes, serve stale for 1 minute while revalidating
  static: { sMaxAge: 300, staleWhileRevalidate: 60 },
  // Experience pages - cache for 1 minute, serve stale for 5 minutes while revalidating
  dynamic: { sMaxAge: 60, staleWhileRevalidate: 300 },
  // No cache for user-specific or real-time content
  none: { sMaxAge: 0, staleWhileRevalidate: 0 },
};

/**
 * Determine cache policy based on URL path
 */
function getCacheConfig(path: string): CacheConfig {
  // Remove query string for pattern matching
  const cleanPath = path.split('?')[0];

  // Static pages - longer cache
  if (cleanPath === '/' || cleanPath === '/home' || cleanPath === '/about') {
    return CACHE_CONFIGS['static'];
  }

  // Experience detail pages - shorter cache with stale-while-revalidate
  if (cleanPath.startsWith('/experience/')) {
    return CACHE_CONFIGS['dynamic'];
  }

  // Default: dynamic caching for other public pages
  return CACHE_CONFIGS['dynamic'];
}

/**
 * Set appropriate cache headers based on route
 */
function setCacheHeaders(res: express.Response, config: CacheConfig): void {
  if (config.sMaxAge === 0) {
    // No caching
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else {
    // CDN-friendly caching with stale-while-revalidate
    res.setHeader(
      'Cache-Control',
      `public, s-maxage=${config.sMaxAge}, stale-while-revalidate=${config.staleWhileRevalidate}`
    );
    // Remove old headers that conflict
    res.removeHeader('Pragma');
    res.removeHeader('Expires');
  }
}

/**
 * Extract real client IP from request headers
 * Checks X-Forwarded-For (load balancers) and X-Real-IP (nginx)
 */
function getClientIp(req: express.Request): string {
  // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = typeof forwardedFor === 'string' ? forwardedFor.split(',') : forwardedFor;
    return (ips[0] || '').trim();
  }

  // X-Real-IP is set by nginx
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0] || '';
  }

  // Fallback to socket IP
  return req.ip || req.socket.remoteAddress || '';
}

export function app(): express.Express {
  const server = express();

  // Trust proxy headers (required for X-Forwarded-For)
  server.set('trust proxy', true);

  // Health check endpoint for Kubernetes
  server.get('/health', (_req, res) => {
    res.status(200).send('OK');
  });

  // Revalidation endpoint to clear homepage cache
  server.post('/api/revalidate', (req, res) => {
    const secret = req.query['secret'] as string;

    // Verify secret
    if (secret !== REVALIDATE_SECRET) {
      res.status(401).json({ success: false, error: 'Invalid secret' });
      return;
    }

    // Clear homepage cache
    const hadCache = homepageCache !== null;
    homepageCache = null;

    console.log(`[Revalidate] Homepage cache cleared at ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: 'Homepage cache cleared',
      hadCache,
      timestamp: new Date().toISOString(),
    });
  });

  // Serve static files from /browser
  server.use(
    express.static(browserDistFolder, {
      maxAge: '1y',
      index: false,
    })
  );

  // All regular routes use the Angular engine
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    // Extract real client IP for forwarding to backend
    const clientIp = getClientIp(req);

    // Set CDN-friendly cache headers based on route
    const cacheConfig = getCacheConfig(originalUrl);
    setCacheHeaders(res, cacheConfig);

    // Check if this is homepage and we have cached version
    const cleanPath = originalUrl.split('?')[0];
    const isHomepage = cleanPath === '/' || cleanPath === '/home';

    if (isHomepage && homepageCache) {
      console.log(`[Cache HIT] Serving homepage from cache (cached at ${new Date(homepageCache.timestamp).toISOString()})`);
      res.send(homepageCache.html);
      return;
    }

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [
          { provide: 'APP_BASE_HREF', useValue: baseUrl },
          { provide: CLIENT_IP, useValue: clientIp },
        ],
      })
      .then((html) => {
        // Cache homepage for future requests
        if (isHomepage) {
          homepageCache = { html, timestamp: Date.now() };
          console.log(`[Cache MISS] Homepage rendered and cached at ${new Date().toISOString()}`);
        }
        res.send(html);
      })
      .catch((err) => next(err));
  });

  return server;
}

const server = app();

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export default createNodeRequestHandler(server);









