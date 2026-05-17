# Eventify — Deployment Guide

## Architecture

```
Code Push → GitHub Actions → Docker Build → Docker Hub → AWS EC2 → Nginx → App
                                                          ↓
                                                   Prometheus + Grafana
```

## Prerequisites

| Tool | Required | Install |
|------|----------|---------|
| Docker Desktop | ✅ | [docker.com](https://docker.com) |
| Node.js 20+ | ✅ | [nodejs.org](https://nodejs.org) |
| Git | ✅ | [git-scm.com](https://git-scm.com) |
| AWS Account | For cloud deploy | [aws.amazon.com](https://aws.amazon.com) |
| Docker Hub Account | For CI/CD | [hub.docker.com](https://hub.docker.com) |

---

## Phase 1: Local Development

```powershell
# Install dependencies
npm install

# Start Convex backend
npx convex dev

# Start Next.js (separate terminal)
npm run dev
```

---

## Phase 2: Local Docker Testing

### Step 1: Create `.env` file
Copy `deploy/.env.example` to `.env` in root and fill in your values.

### Step 2: Build and run
```powershell
# Build and start all containers
docker compose up --build

# Verify services:
# App:        http://localhost (via Nginx) or http://localhost:3000 (direct)
# Prometheus: http://localhost:9090
# Grafana:    http://localhost:3001 (login: admin/admin)
```

### Step 3: Verify health
```powershell
# Check all containers are running
docker compose ps

# Check Nginx health
curl http://localhost/health

# Check app logs
docker compose logs -f app
```

### Common Issues

| Error | Cause | Fix |
|-------|-------|-----|
| `next build` fails | Missing NEXT_PUBLIC_ vars | Set build args in docker-compose.yml |
| Port 80 already in use | Another service on port 80 | Stop IIS/Apache or change port in docker-compose.yml |
| Container keeps restarting | App crash | Check `docker compose logs app` |
| Nginx 502 Bad Gateway | App not ready yet | Wait for health check or increase `start_period` |

---

## Phase 3: AWS EC2 Deployment

### Step 1: Launch EC2 Instance
1. Go to AWS Console → EC2 → Launch Instance
2. Settings:
   - **AMI**: Ubuntu 22.04 LTS
   - **Instance type**: t2.small (minimum) or t2.medium (recommended)
   - **Storage**: 20 GB
   - **Security Group** — allow these ports:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS |
| 9090 | TCP | Your IP | Prometheus |
| 3001 | TCP | Your IP | Grafana |

3. Download the `.pem` key file

### Step 2: SSH into EC2
```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### Step 3: Run setup script
```bash
# Upload and run the setup script
curl -o ec2-setup.sh https://raw.githubusercontent.com/YOUR_USERNAME/eventify/main/deploy/ec2-setup.sh
chmod +x ec2-setup.sh
sudo ./ec2-setup.sh

# Log out and back in for Docker group to take effect
exit
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>

# Verify Docker
docker --version
docker compose version
```

---

## Phase 4: GitHub Secrets Configuration

Go to GitHub repo → Settings → Secrets and variables → Actions → New repository secret

| Secret Name | Value | Example |
|-------------|-------|---------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username | `sumantham` |
| `DOCKERHUB_TOKEN` | Docker Hub access token | (from hub.docker.com/settings/security) |
| `EC2_HOST` | EC2 public IP or domain | `54.123.45.67` |
| `EC2_USERNAME` | EC2 SSH user | `ubuntu` |
| `EC2_SSH_KEY` | Contents of `.pem` file | (paste entire key) |
| `NEXT_PUBLIC_CONVEX_URL` | Convex cloud URL | `https://spotted-meadowlark-209.convex.cloud` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | `pk_test_xxx` |
| `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` | Unsplash API key | `KDO7c...` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Convex site URL | `https://spotted-meadowlark-209.convex.site` |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_test_xxx` |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk JWT domain | `https://striking-pheasant-38.clerk.accounts.dev` |
| `GEMINI_API_KEY` | Google Gemini key | `AIza...` |

---

## Phase 5: Deploy!

```powershell
# Push to main → automatic deployment
git add .
git commit -m "feat: add CI/CD pipeline"
git push origin main
```

Watch the pipeline at: GitHub repo → Actions tab

---

## Monitoring

### Prometheus (http://EC2_IP:9090)
- Go to Status → Targets to see all scraped services
- Query examples:
  - `up` — check which targets are running
  - `node_cpu_seconds_total` — CPU metrics
  - `node_memory_MemAvailable_bytes` — available RAM

### Grafana (http://EC2_IP:3001)
1. Login: `admin` / `admin`
2. Go to Dashboards → Eventify folder
3. Open "Eventify — System Monitoring"
4. Panels show: CPU, memory, disk, network, Nginx connections, uptime

---

## Troubleshooting

### Check container status
```bash
docker compose ps
docker compose logs -f <service-name>
```

### Restart a single service
```bash
docker compose restart app
```

### Full restart
```bash
docker compose down
docker compose up -d
```

### Rebuild after code change
```bash
docker compose up -d --build --force-recreate app
```

### View resource usage
```bash
docker stats
```

### SSH tunnel for remote monitoring
```bash
# Access Grafana locally via SSH tunnel
ssh -i your-key.pem -L 3001:localhost:3001 ubuntu@<EC2_IP>
# Then visit http://localhost:3001
```
