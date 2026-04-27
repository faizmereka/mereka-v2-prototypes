# Mereka v2 Migration to BBI-K8 GitOps Platform

## Goal

Migrate Mereka v2 (backend + frontend + MongoDB) to **existing BBI cluster** using ArgoCD.

**Scope: DEV environment only** (staging/prod later)

---

## Current State

### Mereka v2 (mereka-dev-cluster)

```
┌─────────────────────────────────────────────────────────────┐
│  GKE: mereka-dev-cluster (GCP: mereka-dev)                  │
│  namespace: mereka-backend                                  │
│                                                             │
│  ├── mongodb-0 (StatefulSet, 20Gi PVC) ← CRITICAL DATA     │
│  ├── mereka-backend                                         │
│  ├── mereka-web (SSR)                                       │
│  ├── mereka-app                                             │
│  ├── mereka-auth                                            │
│  └── mereka-admin                                           │
│                                                             │
│  Managed via: kubectl apply -f k8s/                         │
│  Domains: *.mereka.dev (GKE Ingress)                        │
└─────────────────────────────────────────────────────────────┘
```

### BBI Platform (existing cluster)

```
┌─────────────────────────────────────────────────────────────┐
│  GKE: BBI cluster                                           │
│                                                             │
│  ArgoCD + ApplicationSets                                   │
│  ├── listmonk                                               │
│  ├── n8n                                                    │
│  ├── twentycrm                                              │
│  ├── temporal                                               │
│  └── authentik                                              │
│                                                             │
│  nginx-ingress + cert-manager                               │
│  Domains: *.mereka.io                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Target State (Single Cluster)

```
┌─────────────────────────────────────────────────────────────┐
│  GKE: BBI cluster (SINGLE CLUSTER)                          │
│                                                             │
│  ArgoCD manages ALL:                                        │
│                                                             │
│  ├── BBI Apps                                               │
│  │   ├── listmonk, n8n, twentycrm, temporal, authentik      │
│  │                                                          │
│  └── Mereka Platform (NEW)                                  │
│      ├── namespace: mereka-dev                              │
│      ├── mereka-mongodb (data migrated from old cluster)    │
│      ├── mereka-backend                                     │
│      ├── mereka-web                                         │
│      ├── mereka-app                                         │
│      ├── mereka-auth                                        │
│      └── mereka-admin                                       │
│                                                             │
│  nginx-ingress + cert-manager                               │
│  Domains: *.mereka.io + *.mereka.dev                        │
└─────────────────────────────────────────────────────────────┘

Old mereka-dev-cluster → SHUTDOWN (cost savings)
```

---

## DEV Environment

| Setting | Value |
|---------|-------|
| Cluster | BBI GKE cluster |
| Namespace | mereka-dev |
| Domain | *.mereka.dev |
| Secrets | Direct K8s Secrets |
| GCP Project | mereka-dev (for GCR images) |

### Domains

| Service | Domain |
|---------|--------|
| API | api.mereka.dev |
| Web | v2.mereka.dev |
| App | v2.app.mereka.dev |
| Auth | v2.auth.mereka.dev |
| Admin | v2.admin.mereka.dev |

---

## Migration Steps

### Step 1: Backup MongoDB Data

```bash
# Connect to old cluster
gcloud container clusters get-credentials mereka-dev-cluster --zone <zone> --project mereka-dev

# Create backup
kubectl exec -n mereka-backend mongodb-0 -- mongodump --archive=/tmp/mongodb-backup.archive --gzip

# Copy backup to local
kubectl cp mereka-backend/mongodb-0:/tmp/mongodb-backup.archive ./mongodb-backup.archive

# Also export current secrets
kubectl get secret mongodb-secret -n mereka-backend -o yaml > mongodb-secret.yaml
kubectl get secret mereka-backend-secrets -n mereka-backend -o yaml > backend-secrets.yaml
```

### Step 2: Create Helm Charts

**Backend Repo** (`deploy/helm/`):

```
deploy/helm/
├── mereka-mongodb/
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── statefulset.yaml
│       ├── service.yaml
│       └── secret.yaml
│
└── mereka-backend/
    ├── Chart.yaml
    ├── values.yaml
    └── templates/
        ├── deployment.yaml
        ├── service.yaml
        ├── configmap.yaml
        ├── secret.yaml
        └── hpa.yaml
```

**Frontend Repo** (`deploy/helm/`):

```
deploy/helm/
├── mereka-web/
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── deployment.yaml
│       └── service.yaml
├── mereka-app/
├── mereka-auth/
└── mereka-admin/
```

### Step 3: Add to BBI-K8

**Values overlays:**

```
BBI-K8/apps/
├── mereka-mongodb/
│   └── overlays/
│       └── dev/values.yaml
├── mereka-backend/
│   └── overlays/
│       └── dev/values.yaml
├── mereka-web/
│   └── overlays/
│       └── dev/values.yaml
├── mereka-app/
│   └── overlays/
│       └── dev/values.yaml
├── mereka-auth/
│   └── overlays/
│       └── dev/values.yaml
└── mereka-admin/
    └── overlays/
        └── dev/values.yaml
```

**ApplicationSet:**

```yaml
# BBI-K8/applicationsets/mereka.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: mereka-platform
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          - list:
              elements:
                - app: mereka-mongodb
                  repoURL: https://github.com/Biji-Biji-Initiative/mereka-backend-v2.git
                  chartPath: deploy/helm/mereka-mongodb
                - app: mereka-backend
                  repoURL: https://github.com/Biji-Biji-Initiative/mereka-backend-v2.git
                  chartPath: deploy/helm/mereka-backend
                - app: mereka-web
                  repoURL: https://github.com/Biji-Biji-Initiative/mereka-frontend-workspace-v2.git
                  chartPath: deploy/helm/mereka-web
                - app: mereka-app
                  repoURL: https://github.com/Biji-Biji-Initiative/mereka-frontend-workspace-v2.git
                  chartPath: deploy/helm/mereka-app
                - app: mereka-auth
                  repoURL: https://github.com/Biji-Biji-Initiative/mereka-frontend-workspace-v2.git
                  chartPath: deploy/helm/mereka-auth
                - app: mereka-admin
                  repoURL: https://github.com/Biji-Biji-Initiative/mereka-frontend-workspace-v2.git
                  chartPath: deploy/helm/mereka-admin
          - list:
              elements:
                - env: dev
                  namespace: mereka-dev
                  cluster: https://kubernetes.default.svc
                  domain: mereka.dev
  template:
    metadata:
      name: '{{app}}-{{env}}'
      namespace: argocd
    spec:
      project: default
      sources:
        - repoURL: '{{repoURL}}'
          targetRevision: main
          path: '{{chartPath}}'
          helm:
            valueFiles:
              - $values/apps/{{app}}/overlays/{{env}}/values.yaml
        - repoURL: https://github.com/Biji-Biji-Initiative/BBI-K8.git
          targetRevision: main
          ref: values
      destination:
        server: '{{cluster}}'
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

### Step 4: Deploy to BBI Cluster

```bash
# Switch to BBI cluster
gcloud container clusters get-credentials <bbi-cluster> --zone <zone> --project <project>

# Create namespace
kubectl create namespace mereka-dev

# Apply secrets (from old cluster export)
kubectl apply -f mongodb-secret.yaml -n mereka-dev
kubectl apply -f backend-secrets.yaml -n mereka-dev

# Apply ApplicationSet
kubectl apply -f applicationsets/mereka.yaml
```

### Step 5: Restore MongoDB Data

```bash
# Wait for MongoDB pod to be ready
kubectl wait --for=condition=ready pod/mongodb-0 -n mereka-dev --timeout=300s

# Copy backup to new pod
kubectl cp ./mongodb-backup.archive mereka-dev/mongodb-0:/tmp/mongodb-backup.archive

# Restore data
kubectl exec -n mereka-dev mongodb-0 -- mongorestore --archive=/tmp/mongodb-backup.archive --gzip

# Verify data
kubectl exec -n mereka-dev mongodb-0 -- mongosh --eval "show dbs"
kubectl exec -n mereka-dev mongodb-0 -- mongosh mereka_prod --eval "db.stats()"
```

### Step 6: Update DNS

Point *.mereka.dev to BBI cluster's nginx-ingress:

```bash
# Get LoadBalancer IP
kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Update Cloudflare (or your DNS)
# api.mereka.dev    → <LB_IP>
# v2.mereka.dev     → <LB_IP>
# v2.app.mereka.dev → <LB_IP>
# v2.auth.mereka.dev → <LB_IP>
# v2.admin.mereka.dev → <LB_IP>
```

### Step 7: Create Ingress

```yaml
# BBI-K8/platform/mereka-ingress/dev.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mereka-ingress
  namespace: mereka-dev
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.mereka.dev
        - v2.mereka.dev
        - v2.app.mereka.dev
        - v2.auth.mereka.dev
        - v2.admin.mereka.dev
      secretName: mereka-dev-tls
  rules:
    - host: api.mereka.dev
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: mereka-backend
                port:
                  number: 80
    - host: v2.mereka.dev
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: mereka-web
                port:
                  number: 80
    - host: v2.app.mereka.dev
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: mereka-app
                port:
                  number: 80
    - host: v2.auth.mereka.dev
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: mereka-auth
                port:
                  number: 80
    - host: v2.admin.mereka.dev
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: mereka-admin
                port:
                  number: 80
```

### Step 8: Verify & Shutdown Old Cluster

```bash
# Test all endpoints
curl -I https://api.mereka.dev/health
curl -I https://v2.mereka.dev
curl -I https://v2.app.mereka.dev
curl -I https://v2.auth.mereka.dev
curl -I https://v2.admin.mereka.dev

# If all working, shutdown old cluster (saves cost!)
gcloud container clusters delete mereka-dev-cluster --zone <zone> --project mereka-dev
```

---

## Execution Checklist

### Pre-Migration
- [ ] Backup MongoDB data
- [ ] Export current secrets
- [ ] Document current state

### Helm Charts
- [ ] Create mereka-mongodb chart
- [ ] Create mereka-backend chart
- [ ] Create mereka-web chart
- [ ] Create mereka-app chart
- [ ] Create mereka-auth chart
- [ ] Create mereka-admin chart
- [ ] Test with `helm template`

### BBI-K8 Integration
- [ ] Create values overlays
- [ ] Create ApplicationSet
- [ ] Apply to cluster

### Data Migration
- [ ] Deploy MongoDB to BBI cluster
- [ ] Restore MongoDB data
- [ ] Verify data integrity

### Services
- [ ] Deploy all services via ArgoCD
- [ ] Update DNS
- [ ] Create ingress
- [ ] Test all endpoints

### Cleanup
- [ ] Shutdown old cluster
- [ ] Update documentation

---

## Future: Staging & Prod

When ready, add to ApplicationSet:

```yaml
- env: staging
  namespace: mereka-staging
  domain: staging.mereka.io

- env: prod
  namespace: mereka-prod
  domain: mereka.io
```

---

_Created: 2025-12-18_
