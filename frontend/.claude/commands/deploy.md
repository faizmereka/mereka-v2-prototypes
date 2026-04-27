# Deploy Command

Deploy an Angular application to Kubernetes.

## Usage

```
/deploy [project-name]
```

## Arguments
- `$ARGUMENTS` - Project name (admin, web, app, auth, checkout)

## Actions

1. Build the project for production
2. Build Docker image
3. Push to container registry
4. Restart Kubernetes deployment

## Commands

```bash
# Deploy admin
cd projects/admin && bash k8s/quick-deploy.sh

# Or step by step:
ng build admin --configuration=production
cd projects/admin
docker build --platform linux/amd64 -t gcr.io/mereka-dev/mereka-admin:latest .
docker push gcr.io/mereka-dev/mereka-admin:latest
kubectl rollout restart deployment/mereka-admin -n mereka-backend
```

## Check Status

```bash
# Check pods
kubectl get pods -n mereka-backend -l app=mereka-admin

# View logs
kubectl logs -n mereka-backend -l app=mereka-admin --tail=50
```

## Rollback

```bash
kubectl rollout undo deployment/mereka-admin -n mereka-backend
```
