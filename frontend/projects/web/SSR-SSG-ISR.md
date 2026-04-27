# SSR/SSG/ISR Setup Guide

This document explains the Server-Side Rendering (SSR), Static Site Generation (SSG), and Incremental Static Regeneration (ISR) setup for the web app.

## Overview

- **SSR (Server-Side Rendering)**: Pages are rendered on the server for each request
- **SSG (Static Site Generation)**: Pages are pre-rendered at build time
- **ISR (Incremental Static Regeneration)**: Pages are cached and revalidated on-demand or after a time period

## Architecture

### Files Structure

```
projects/web/
├── src/
│   ├── main.ts                    # Browser bootstrap with hydration
│   ├── main.server.ts            # Server bootstrap
│   └── app/
│       ├── app.config.ts         # Shared app config
│       └── app.config.server.ts  # Server-specific config
├── server.ts                      # Express server with ISR support
├── tsconfig.server.json          # Server TypeScript config
└── SSR-SSG-ISR.md                # This file
```

## Build Commands

### Development with SSR

```bash
ng run web:serve-ssr
```

### Production Build (Browser + Server)

```bash
ng build web --configuration=production
ng run web:server:production
```

### Static Site Generation (Prerender)

```bash
ng run web:prerender:production
```

This will pre-render the routes specified in `angular.json`:

- `/` (home page)

## On-Demand Revalidation (ISR)

### How It Works

1. Pages are cached in memory when first rendered
2. Cache is valid for 1 hour (configurable via `DEFAULT_REVALIDATE_TIME`)
3. You can invalidate cache on-demand via API endpoint

### Revalidation Endpoint

**POST** `/api/revalidate`

**Query Parameters:**

- `path` (required): The path to revalidate (e.g., `/home`)
- `secret` (required): Secret key for authentication

**Example:**

```bash
curl -X POST "http://localhost:4000/api/revalidate?path=/&secret=your-secret-key"
```

**Environment Variable:**
Set `REVALIDATE_SECRET` in your environment:

```bash
export REVALIDATE_SECRET=your-secret-key
```

### Configuring ISR Routes

Edit `server.ts` to add routes that should use ISR:

```typescript
// Routes that support on-demand revalidation (ISR)
const ISR_ROUTES = ['/', '/home', '/about'];
```

### Configuring Revalidation Time

Edit `server.ts` to change the default revalidation time:

```typescript
// Default revalidation time: 1 hour (3600000ms)
const DEFAULT_REVALIDATE_TIME = 60 * 60 * 1000; // Change this value
```

## Static Site Generation (SSG)

### Configuring Prerender Routes

Edit `angular.json` under `web.prerender.options.routes`:

```json
"prerender": {
  "builder": "@angular/build:application:prerender",
  "options": {
    "routes": [
      "/",
      "/home",
      "/about"
    ]
  }
}
```

## Server-Side Rendering (SSR)

SSR is enabled by default for all routes. The server renders pages on-demand using Angular's `CommonEngine`.

## Deployment

### Environment Variables

- `PORT`: Server port (default: 4000)
- `REVALIDATE_SECRET`: Secret key for on-demand revalidation

### Production Deployment

1. Build the application:

   ```bash
   ng build web --configuration=production
   ng run web:server:production
   ```

2. Start the server:

   ```bash
   node dist/web/server/server.mjs
   ```

3. Or use the prerendered static files:
   ```bash
   ng run web:prerender:production
   # Serve dist/web/browser/ with a static file server
   ```

## Testing

### Test SSR Locally

```bash
ng run web:serve-ssr
# Visit http://localhost:4200
```

### Test ISR Revalidation

```bash
# After starting the server
curl -X POST "http://localhost:4000/api/revalidate?path=/&secret=your-secret-key"
```

## Troubleshooting

### Common Issues

1. **Module not found errors**: Make sure all dependencies are installed:

   ```bash
   npm install
   ```

2. **Port already in use**: Change the port in `server.ts` or set `PORT` environment variable

3. **Cache not clearing**: Check that the path matches exactly (including leading slash)

## Next Steps

- Add more routes to `ISR_ROUTES` for pages that need on-demand revalidation
- Configure different revalidation times per route
- Add webhook integration for automatic revalidation
- Set up monitoring for cache hit rates









