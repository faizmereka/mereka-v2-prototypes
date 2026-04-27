# Admin Project Context

## Project: admin (admin.mereka.io)

Super admin dashboard for managing the Mereka platform.

## Location
`projects/admin/`

## Features
- Dashboard with stats
- User management
- Hub management
- Booking management
- Finance (transactions, withdrawals)
- Jobs (contracts, proposals)
- Settings & Roles
- Subscriptions
- Email/Notification management

## Deployment
- K8s configs: `projects/admin/k8s/`
- Dockerfile: `projects/admin/Dockerfile`
- Nginx config: `projects/admin/nginx.conf`

## Commands
```bash
# Serve
ng serve admin --port 4204

# Build
ng build admin --configuration=production

# Deploy
cd projects/admin && npm run deploy
```

## API Backend
- Dev: http://localhost:3000
- Prod: https://api.mereka.io
