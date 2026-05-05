# Miamo Kubernetes & Docker Documentation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                     │
│                                                          │
│  ┌──────────┐   ┌──────────────┐                        │
│  │ Ingress  │──→│   Gateway    │                        │
│  │ (nginx)  │   │   :3200      │                        │
│  └──────────┘   └──────┬───────┘                        │
│                         │                                │
│         ┌───────────────┼───────────────┐               │
│         ↓               ↓               ↓               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │   Auth     │  │   Users    │  │   Social   │        │
│  │   :3201    │  │   :3202    │  │   :3203    │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│         ↓               ↓               ↓               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ Messaging  │  │  Content   │  │Notifications│       │
│  │   :3204    │  │   :3205    │  │   :3206    │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│                         │                                │
│              ┌──────────┴──────────┐                    │
│              ↓                     ↓                     │
│       ┌────────────┐       ┌────────────┐               │
│       │ PostgreSQL │       │   Redis    │               │
│       │   :5432    │       │   :6379    │               │
│       └────────────┘       └────────────┘               │
└─────────────────────────────────────────────────────────┘
```

---

## Docker

### Docker Compose (Local Development)

```bash
# Start everything
docker compose up --build

# Start specific services
docker compose up gateway auth users

# Rebuild a single service
docker compose up --build auth

# View logs
docker compose logs -f gateway

# Stop all
docker compose down

# Stop and remove volumes (clean reset)
docker compose down -v
```

### Services in docker-compose.yml

| Service | Image | Port | Depends On |
|---------|-------|------|------------|
| `postgres` | postgres:16-alpine | 5432 | — |
| `redis` | redis:7-alpine | 6379 | — |
| `gateway` | ./services/gateway | 3200 | auth, users, social, messaging, content, notifications |
| `auth` | ./services/auth | 3201 | postgres |
| `users` | ./services/users | 3202 | postgres |
| `social` | ./services/social | 3203 | postgres |
| `messaging` | ./services/messaging | 3204 | postgres |
| `content` | ./services/content | 3205 | postgres |
| `notifications` | ./services/notifications | 3206 | postgres |
| `web` | ./web | 3100 | gateway |

### Dockerfile Pattern (Multi-Stage)

Every service uses the same multi-stage Dockerfile pattern:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate    # For services with Prisma
RUN npm run build           # Compile TypeScript

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE <port>
CMD ["node", "dist/server.js"]
```

**Benefits:**
- Final image has no dev dependencies or source code
- Image size: ~150MB per service (vs ~800MB without multi-stage)
- Consistent Node.js 20 Alpine base

### .dockerignore

Each service has a `.dockerignore`:
```
node_modules
dist
.env
*.md
.git
```

---

## Kubernetes

### Directory Structure

```
k8s/
├── base/                    ← Shared base manifests
│   ├── namespace.yaml       ← "miamo" namespace
│   ├── config.yaml          ← ConfigMap + Secrets
│   ├── postgres.yaml        ← PostgreSQL StatefulSet
│   ├── api.yaml             ← All microservice Deployments + Services
│   ├── web.yaml             ← Next.js frontend Deployment + Service
│   ├── ingress.yaml         ← Nginx Ingress rules
│   ├── jobs.yaml            ← DB migration + seed jobs
│   └── kustomization.yaml   ← Base kustomize config
├── dev/                     ← Development overlay
│   └── kustomization.yaml
├── staging/                 ← Staging overlay
│   └── kustomization.yaml
└── prod/                    ← Production overlay
    └── kustomization.yaml
```

### Kustomize Overlays

We use **Kustomize** (built into kubectl) to manage environment-specific configs:

```bash
# Apply dev environment
kubectl apply -k k8s/dev/

# Apply staging
kubectl apply -k k8s/staging/

# Apply production
kubectl apply -k k8s/prod/

# Preview what will be applied
kubectl kustomize k8s/staging/
```

### Environment Differences

| Setting | Dev | Staging | Prod |
|---------|-----|---------|------|
| Replicas (Gateway) | 1 | 2 | 3 |
| Replicas (Services) | 1 | 2 | 2+ |
| PostgreSQL | 1 replica | 1 replica | Managed (RDS/Cloud SQL) |
| Ingress Host | `miamo.local` | `staging.miamo.app` | `miamo.app` |
| HPA | Disabled | Enabled (2-5) | Enabled (3-10) |
| Image Tags | `latest` | `staging-<sha>` | `v1.x.x` |
| Log Level | `debug` | `info` | `warn` |

### Key Manifests Explained

#### namespace.yaml
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: miamo
```
All resources live in the `miamo` namespace.

#### config.yaml
Contains:
- **ConfigMap** — Non-secret config (service URLs, frontend URL, log level)
- **Secret** — Sensitive values (DATABASE_URL, JWT_SECRET, INTERNAL_SERVICE_KEY)

#### api.yaml
Defines for each microservice:
- **Deployment** — Pod template with container spec, env vars, health checks
- **Service** — ClusterIP service for internal routing
- **HorizontalPodAutoscaler** — CPU-based autoscaling (staging/prod)

#### ingress.yaml
```yaml
# Routes:
/api/*     → gateway:3200
/          → web:3100
```

### Common kubectl Commands

```bash
# Set namespace
kubectl config set-context --current --namespace=miamo

# View all pods
kubectl get pods

# View services
kubectl get svc

# View logs for a service
kubectl logs -f deployment/gateway

# Scale a service
kubectl scale deployment/auth --replicas=3

# Run database migration
kubectl apply -f k8s/base/jobs.yaml

# Port-forward to a service (for debugging)
kubectl port-forward svc/gateway 3200:3200

# Restart a deployment
kubectl rollout restart deployment/auth

# Check HPA status
kubectl get hpa
```

### Health Checks

Every service has:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: <service-port>
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: <service-port>
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Resource Limits

Default per service:
```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

### Deployment Workflow

```
1. Push code to main branch
2. CI builds Docker images, tags with commit SHA
3. Push images to container registry (ECR/GCR/ACR)
4. Update image tags in kustomize overlay
5. kubectl apply -k k8s/<environment>/
6. Kubernetes performs rolling update (zero downtime)
```

### Secrets Management

For production, replace the base64-encoded secrets in `config.yaml` with:
- **AWS:** Use `eksctl` with IAM roles or External Secrets Operator
- **GCP:** Use Workload Identity + Secret Manager
- **Azure:** Use Azure Key Vault CSI driver

---

## Hosting Guide

### Local (Docker Compose)
```bash
docker compose up --build
# → http://localhost:3100 (web)
# → http://localhost:3200 (API)
```

### Cloud VM (Single Server)
```bash
# SSH into server
scp -r . server:/opt/miamo
ssh server
cd /opt/miamo
docker compose -f docker-compose.yml up -d
# Configure nginx/caddy as reverse proxy with SSL
```

### Kubernetes (Production)
```bash
# 1. Create cluster (EKS/GKE/AKS)
# 2. Install nginx ingress controller
helm install ingress-nginx ingress-nginx/ingress-nginx

# 3. Deploy
kubectl apply -k k8s/prod/

# 4. Configure DNS
# Point miamo.app → Ingress Load Balancer IP
```

### Recommended Cloud Services

| Component | AWS | GCP | Azure |
|-----------|-----|-----|-------|
| Kubernetes | EKS | GKE | AKS |
| Database | RDS PostgreSQL | Cloud SQL | Azure Database |
| Cache | ElastiCache | Memorystore | Azure Cache |
| Registry | ECR | Artifact Registry | ACR |
| CDN | CloudFront | Cloud CDN | Azure CDN |
| DNS | Route 53 | Cloud DNS | Azure DNS |
