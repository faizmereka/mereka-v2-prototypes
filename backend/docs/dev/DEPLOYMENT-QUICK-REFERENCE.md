# Quick Reference - Deployment Commands

## 🚀 Quick Deploy (Most Common)

```bash
# From project root - One command to deploy everything
npm run deploy
```

This will:
- ✅ Build Docker image
- ✅ Push to GCR
- ✅ Restart deployment
- ✅ Show status

---

## 📋 All Available Commands

### Deployment Commands

```bash
# Quick deploy (recommended for regular deployments)
npm run deploy

# Full deployment (includes MongoDB setup)
npm run deploy:full

# Build Docker image only
npm run deploy:build

# Push Docker image only
npm run deploy:push

# Restart deployment only
npm run deploy:restart

# Check deployment status
npm run deploy:status

# View recent logs
npm run deploy:logs

# Regenerate secrets from .env
npm run deploy:secrets

# Cleanup all resources
npm run deploy:cleanup
```

### Kubernetes Commands

```bash
# Apply all Kubernetes manifests
npm run k8s:apply

# Get all Kubernetes resources status
npm run k8s:status
```

---

## 🔄 Common Workflows

### Deploy Code Changes

```bash
npm run deploy
```

### Update Secrets

```bash
npm run deploy:secrets
kubectl apply -f k8s/mongodb-secret.yaml
kubectl apply -f k8s/backend-secrets.yaml
npm run deploy:restart
```

### Check Status

```bash
npm run deploy:status
npm run deploy:logs
```

### Full Redeploy

```bash
npm run deploy:cleanup
npm run deploy:full
```

---

## 📚 Full Documentation

For detailed setup instructions, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [../../k8s/README.md](../../k8s/README.md) - Kubernetes resources documentation

---

## 🆘 Troubleshooting

```bash
# View logs
npm run deploy:logs

# Check status
npm run deploy:status

# Restart everything
npm run deploy:restart

# Cleanup and redeploy
npm run deploy:cleanup
npm run deploy:full
```

