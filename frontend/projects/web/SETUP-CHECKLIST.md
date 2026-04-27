# SSR/SSG/ISR Setup Checklist

## ✅ Completed Setup

### 1. Configuration Files

- [x] `tsconfig.server.json` - Server TypeScript configuration
- [x] `app.config.server.ts` - Server-side application config
- [x] `main.server.ts` - Server bootstrap
- [x] `server.ts` - Express server with ISR support
- [x] Updated `angular.json` with server, prerender, and serve-ssr targets
- [x] Updated `app.config.ts` with shared providers
- [x] Updated `main.ts` with client hydration

### 2. Dependencies

- [x] `@angular/platform-server` - Server-side rendering
- [x] `@angular/ssr` - SSR utilities
- [x] `express` - HTTP server
- [x] `@types/express` - TypeScript types
- [x] `@types/node` - Node.js types

## 📋 Next Steps

### 1. Install Dependencies

```bash
cd /Users/hiramaniupadhyay/Documents/projects/Mereka/mereka-frontend-workspace
npm install
```

### 2. Test SSR Development Server

```bash
ng run web:serve-ssr
```

Visit http://localhost:4200 and verify SSR is working.

### 3. Build for Production

```bash
# Build browser bundle
ng build web --configuration=production

# Build server bundle
ng run web:server:production
```

### 4. Test Production SSR

```bash
node dist/web/server/server.mjs
```

Visit http://localhost:4000 and verify SSR is working.

### 5. Test Static Site Generation (SSG)

```bash
ng run web:prerender:production
```

Check `dist/web/browser/` for pre-rendered HTML files.

### 6. Test On-Demand Revalidation (ISR)

```bash
# Start the server
node dist/web/server/server.mjs

# In another terminal, trigger revalidation
curl -X POST "http://localhost:4000/api/revalidate?path=/&secret=your-secret-key"
```

## 🔧 Configuration

### Environment Variables

Set these in your deployment environment:

- `PORT` - Server port (default: 4000)
- `REVALIDATE_SECRET` - Secret for on-demand revalidation

### Customize ISR Routes

Edit `server.ts`:

```typescript
const ISR_ROUTES = ['/', '/home', '/about']; // Add your routes
```

### Customize Revalidation Time

Edit `server.ts`:

```typescript
const DEFAULT_REVALIDATE_TIME = 60 * 60 * 1000; // 1 hour in milliseconds
```

### Add Prerender Routes

Edit `angular.json`:

```json
"prerender": {
  "options": {
    "routes": ["/", "/home", "/about"]
  }
}
```

## 🐛 Troubleshooting

### Build Errors

1. Ensure all dependencies are installed: `npm install`
2. Check TypeScript version compatibility
3. Verify `tsconfig.server.json` extends `tsconfig.app.json`

### Runtime Errors

1. Check server logs for detailed error messages
2. Verify `index.html` exists in `dist/web/browser/`
3. Ensure all routes are properly configured

### ISR Not Working

1. Verify the route is in `ISR_ROUTES` array
2. Check cache is being set (look for console logs)
3. Verify revalidation endpoint is accessible

## 📚 Documentation

See `SSR-SSG-ISR.md` for detailed documentation on:

- Architecture overview
- Build commands
- ISR configuration
- Deployment guide
- Troubleshooting









