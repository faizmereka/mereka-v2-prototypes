# Deployment Guide

This guide covers deploying the Mereka Backend to GKE (Google Kubernetes Engine).

## Table of Contents

1. [First-Time Setup (New GCP Account)](#first-time-setup-new-gcp-account)
2. [Quick Deploy (After Initial Setup)](#quick-deploy-after-initial-setup)
3. [Full Deployment Process](#full-deployment-process)
4. [Troubleshooting](#troubleshooting)

---

## First-Time Setup (New GCP Account)

### Prerequisites

- Google Cloud account
- `gcloud` CLI installed
- `kubectl` installed
- `docker` installed
- Domain name configured in Cloudflare (optional, for production)

### Step 1: Install Required Tools

```bash
# Install gcloud CLI (macOS)
brew install google-cloud-sdk

# Install kubectl
brew install kubectl

# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop
```

### Step 2: Authenticate with GCP

```bash
# Login to GCP
gcloud auth login

# Set your project (replace dengan project ID Anda)
gcloud config set project mereka-dev

# Verify authentication
gcloud auth list
```

### Step 3: Enable Required APIs

```bash
# Enable required GCP APIs
gcloud services enable \
  container.googleapis.com \
  compute.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  containerregistry.googleapis.com

# Verify APIs are enabled
gcloud services list --enabled | grep -E "(container|compute|cloudbuild|artifactregistry)"
```

### Step 4: Configure Docker for GCR

```bash
# Configure Docker to use gcloud as credential helper
gcloud auth configure-docker

# Verify Docker authentication
docker pull gcr.io/mereka-dev/mereka-backend:latest || echo "Image doesn't exist yet (will be created on first deploy)"
```

### Step 5: Create GKE Cluster (One-Time Setup)

**For Development (Single-Node Zonal Cluster - Recommended)**

This creates a cost-optimized single-node cluster (~$25-35/month):

```bash
cd k8s

# Set variables
export CLUSTER_NAME="mereka-backend-cluster"
export REGION="us-central1"
export ZONE="us-central1-a"
export PROJECT_ID="mereka-dev"

# Create single-node zonal cluster (dev environment)
gcloud container clusters create $CLUSTER_NAME \
  --zone=$ZONE \
  --machine-type=e2-medium \
  --num-nodes=1 \
  --no-enable-autoscaling \
  --enable-autorepair \
  --enable-autoupgrade \
  --project=$PROJECT_ID

# Get cluster credentials
gcloud container clusters get-credentials $CLUSTER_NAME \
  --zone=$ZONE \
  --project=$PROJECT_ID

# Verify cluster access
kubectl get nodes
```

**For Production (Regional Cluster with Autoscaling)**

For high availability and auto-scaling (~$150-200/month):

```bash
# Create regional cluster with autoscaling
gcloud container clusters create $CLUSTER_NAME \
  --region=$REGION \
  --machine-type=e2-medium \
  --enable-autorepair \
  --enable-autoupgrade \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10 \
  --num-nodes=1 \
  --project=$PROJECT_ID

# Get cluster credentials
gcloud container clusters get-credentials $CLUSTER_NAME \
  --region=$REGION \
  --project=$PROJECT_ID
```

### Step 6: Create Static IP (One-Time Setup)

```bash
# Create global static IP for Ingress (required for domain)
gcloud compute addresses create mereka-backend-dev-ip-global \
  --global \
  --project=mereka-dev

# Get the IP address
gcloud compute addresses describe mereka-backend-dev-ip-global \
  --global \
  --format="get(address)"

# Save this IP - you'll need it for Cloudflare DNS
```

### Step 7: Setup Secrets

```bash
cd k8s

# Generate secrets from .env file
./setup-secrets-from-env.sh

# Verify secrets files were created
ls -la mongodb-secret.yaml backend-secrets.yaml
```

### Step 8: Initial Deployment

```bash
cd k8s

# Deploy all resources
./deploy.sh

# Check deployment status
kubectl get pods -n mereka-backend
kubectl get ingress -n mereka-backend
```

### Step 9: Configure Cloudflare DNS (Optional)

1. Go to Cloudflare Dashboard → DNS settings for your domain
2. Add/Update A record:
   - **Type**: `A`
   - **Name**: `api` (for `api.mereka.dev`)
   - **Content**: `<static-ip-from-step-6>`
   - **Proxy**: Off (gray cloud icon)
3. Save

### Step 10: Verify Deployment

```bash
# Get Ingress IP
INGRESS_IP=$(kubectl get ingress -n mereka-backend mereka-backend-ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test endpoints
curl http://$INGRESS_IP/health
curl http://api.mereka.dev/health  # After DNS propagates

# Check SSL certificate status
kubectl get managedcertificate -n mereka-backend
```

---

## Quick Deploy (After Initial Setup)

After the initial setup is complete, use these commands for regular deployments.

### Option 1: Quick Deploy with npm (Recommended)

```bash
# From project root - Quick deploy (build, push, restart)
npm run deploy
```

This will:
- Build Docker image
- Push to GCR
- Update Kubernetes deployment
- Show deployment status

### Option 2: Quick Deploy Script

```bash
cd k8s
./quick-deploy.sh
```

### Option 3: Manual Deploy

```bash
# 1. Build and push Docker image
cd ..
docker build --platform linux/amd64 -t gcr.io/mereka-dev/mereka-backend:latest .
docker push gcr.io/mereka-dev/mereka-backend:latest

# 2. Restart deployment to pull new image
cd k8s
kubectl rollout restart deployment/mereka-backend -n mereka-backend

# 3. Watch rollout status
kubectl rollout status deployment/mereka-backend -n mereka-backend

# 4. Verify deployment
kubectl get pods -n mereka-backend
kubectl logs -n mereka-backend -l app=mereka-backend --tail=20
```

### Option 3: Update Secrets Only

If you only need to update secrets:

```bash
# Using npm (from project root)
npm run deploy:secrets

# Then apply and restart
kubectl apply -f k8s/mongodb-secret.yaml
kubectl apply -f k8s/backend-secrets.yaml
npm run deploy:restart
```

Or manually:

```bash
cd k8s

# Regenerate secrets from .env
./setup-secrets-from-env.sh

# Apply secrets
kubectl apply -f mongodb-secret.yaml
kubectl apply -f backend-secrets.yaml

# Restart pods to pick up new secrets
kubectl rollout restart deployment/mereka-backend -n mereka-backend
```

### Available npm Deployment Commands

All deployment commands are available via npm scripts:

```bash
# Quick deploy (build + push + restart)
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

# View logs
npm run deploy:logs

# Regenerate secrets from .env
npm run deploy:secrets

# Cleanup all resources
npm run deploy:cleanup

# Apply all Kubernetes manifests
npm run k8s:apply

# Get all Kubernetes resources status
npm run k8s:status
```

---

## Full Deployment Process

### 1. Build Docker Image

```bash
# From project root
docker build --platform linux/amd64 -t gcr.io/mereka-dev/mereka-backend:latest .
```

### 2. Push to Google Container Registry

```bash
docker push gcr.io/mereka-dev/mereka-backend:latest
```

### 3. Deploy Kubernetes Resources

```bash
cd k8s

# Apply all manifests
kubectl apply -f namespace.yaml
kubectl apply -f mongodb-secret.yaml
kubectl apply -f backend-secrets.yaml
kubectl apply -f backend-configmap.yaml
kubectl apply -f mongodb-statefulset.yaml
kubectl apply -f mongodb-service.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml
kubectl apply -f hpa.yaml
kubectl apply -f ingress.yaml
```

### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n mereka-backend

# Check services
kubectl get services -n mereka-backend

# Check ingress
kubectl get ingress -n mereka-backend

# Check logs
kubectl logs -n mereka-backend -l app=mereka-backend --tail=50
```

---

## Common Deployment Scenarios

### Deploy Code Changes

```bash
# Build and push new image
docker build --platform linux/amd64 -t gcr.io/mereka-dev/mereka-backend:latest .
docker push gcr.io/mereka-dev/mereka-backend:latest

# Restart deployment
kubectl rollout restart deployment/mereka-backend -n mereka-backend

# Monitor rollout
kubectl rollout status deployment/mereka-backend -n mereka-backend
```

### Update Environment Variables

```bash
cd k8s

# Update ConfigMap
kubectl apply -f backend-configmap.yaml

# Restart pods
kubectl rollout restart deployment/mereka-backend -n mereka-backend
```

### Update Secrets

```bash
cd k8s

# Regenerate secrets
./setup-secrets-from-env.sh

# Apply secrets
kubectl apply -f mongodb-secret.yaml
kubectl apply -f backend-secrets.yaml

# Restart pods
kubectl rollout restart deployment/mereka-backend -n mereka-backend
```

### Scale Deployment

```bash
# Scale manually
kubectl scale deployment/mereka-backend --replicas=3 -n mereka-backend

# Or update HPA
kubectl apply -f hpa.yaml
```

---

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n mereka-backend
kubectl describe pod <pod-name> -n mereka-backend
```

### View Logs

```bash
# Backend logs
kubectl logs -n mereka-backend -l app=mereka-backend --tail=50

# MongoDB logs
kubectl logs -n mereka-backend mongodb-0 --tail=50
```

### Check Ingress Status

```bash
kubectl get ingress -n mereka-backend
kubectl describe ingress -n mereka-backend mereka-backend-ingress
```

### Check SSL Certificate

```bash
kubectl get managedcertificate -n mereka-backend
kubectl describe managedcertificate -n mereka-backend mereka-backend-dev-ssl-cert
```

### Restart Everything

```bash
kubectl rollout restart deployment/mereka-backend -n mereka-backend
kubectl rollout restart statefulset/mongodb -n mereka-backend
```

### Cleanup and Redeploy

```bash
cd k8s
./cleanup.sh
./deploy.sh
```

---

## Useful Commands Reference

```bash
# Get cluster info
kubectl cluster-info

# Get all resources in namespace
kubectl get all -n mereka-backend

# Port forward for local testing
kubectl port-forward -n mereka-backend svc/mereka-backend-service 3000:80

# Execute command in pod
kubectl exec -it -n mereka-backend <pod-name> -- sh

# Get service endpoints
kubectl get endpoints -n mereka-backend

# Check HPA status
kubectl get hpa -n mereka-backend

# View events
kubectl get events -n mereka-backend --sort-by='.lastTimestamp'
```

---

## Next Steps

- Monitor application logs
- Set up monitoring and alerting
- Configure backup for MongoDB
- Set up CI/CD pipeline
- Review security best practices

