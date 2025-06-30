# Simple Deployment Guide

This guide shows how to deploy the Meal Planner application to production using Cloudflare Tunnel.

## Prerequisites

- Docker and Docker Compose installed on your server
- GitHub account for container registry
- Cloudflare account with a domain
- Cloudflare Tunnel set up

## Step 1: Build and Push Images

The GitHub Actions workflow automatically builds and pushes images when you push to the `main` branch.

To manually build and push:

```bash
# Build images locally
docker build -t ghcr.io/YOUR-USERNAME/meal-planner-backend:latest ./backend
docker build -t ghcr.io/YOUR-USERNAME/meal-planner-frontend:latest ./frontend --build-arg VITE_API_URL=/api/v1

# Push to GitHub Container Registry
docker push ghcr.io/YOUR-USERNAME/meal-planner-backend:latest
docker push ghcr.io/YOUR-USERNAME/meal-planner-frontend:latest
```

## Step 2: Set Up Cloudflare Tunnel

1. **Install cloudflared locally:**
   ```bash
   # Visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
   # Or use homebrew: brew install cloudflared
   ```

2. **Create and configure tunnel:**
   ```bash
   # Login to Cloudflare
   cloudflared tunnel login

   # Create a tunnel
   cloudflared tunnel create meal-planner

   # Get the tunnel token (save this for later)
   cloudflared tunnel token meal-planner
   ```

3. **Configure DNS in Cloudflare Dashboard:**
   - Go to your domain in Cloudflare Dashboard
   - DNS → Records → Add record
   - Type: CNAME
   - Name: meal-planner (or whatever subdomain you want)
   - Target: `<tunnel-id>.cfargotunnel.com`
   - Proxy status: Proxied (orange cloud)

## Step 3: Deploy to Production

1. **Copy files to your server:**
   ```bash
   scp docker-compose.production.yml env.production.example your-server:~/
   ```

2. **SSH to your server and set up environment:**
   ```bash
   ssh your-server
   cp env.production.example .env
   ```

3. **Edit `.env` with your values:**
   - `GITHUB_USER` - Your GitHub username
   - `POSTGRES_PASSWORD` - Secure database password
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - `JWT_SECRET_KEY` - Random secret (generate with `openssl rand -hex 32`)
   - `CLOUDFLARE_TUNNEL_TOKEN` - Token from step 2
   - Email settings (optional)

4. **Start the application:**
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

5. **Run database migrations:**
   ```bash
   docker-compose -f docker-compose.production.yml exec backend uv run alembic upgrade head
   ```

## Step 4: Access Your Application

Your application will be available at:
- Frontend: https://meal-planner.yourdomain.com
- Backend API: https://meal-planner.yourdomain.com/api/v1

**Security Benefits:**
- ✅ No open ports on your server
- ✅ Automatic SSL/HTTPS
- ✅ DDoS protection
- ✅ Global CDN acceleration
- ✅ Zero Trust security

## Updating the Application

To update to the latest version:

```bash
# Pull latest images
docker-compose -f docker-compose.production.yml pull

# Restart services
docker-compose -f docker-compose.production.yml up -d

# Run any new migrations
docker-compose -f docker-compose.production.yml exec backend uv run alembic upgrade head
```

## Monitoring

View logs:
```bash
docker-compose -f docker-compose.production.yml logs -f
```

Check service status:
```bash
docker-compose -f docker-compose.production.yml ps
```

View Cloudflare Tunnel status:
```bash
docker-compose -f docker-compose.production.yml logs cloudflared
```

## Advanced Tunnel Configuration

For custom routing rules, create a `tunnel.yml` config file:

```bash
# Copy the example
cp tunnel.yml.example tunnel.yml

# Edit with your tunnel ID and domain
# Get your tunnel ID: cloudflared tunnel list
```

Then update docker-compose to use the config file:

```yaml
cloudflared:
  image: cloudflare/cloudflared:latest
  restart: always
  command: tunnel --config /etc/cloudflared/tunnel.yml run
  volumes:
    - ./tunnel.yml:/etc/cloudflared/tunnel.yml:ro
    - ./credentials.json:/etc/cloudflared/credentials.json:ro
  depends_on:
    - frontend
    - backend
```

## Backup

To backup your database:
```bash
docker-compose -f docker-compose.production.yml exec db pg_dump -U postgres meal_planner > backup.sql
```

## Troubleshooting

**Tunnel not connecting:**
```bash
# Check tunnel status
docker-compose -f docker-compose.production.yml logs cloudflared

# Verify tunnel token
echo $CLOUDFLARE_TUNNEL_TOKEN
```

**Application not accessible:**
1. Check DNS records in Cloudflare Dashboard
2. Ensure tunnel is "Active" in Zero Trust Dashboard
3. Verify services are healthy: `docker-compose ps`
