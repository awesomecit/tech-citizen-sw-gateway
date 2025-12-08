#!/bin/bash

# deploy-staging.sh - Deploy to staging environment (Docker simulation)
# Simulates deployment to Hetzner + Cloudflare without Ansible

set -e

ENVIRONMENT="staging"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_CONTAINER="hetzner-sim"

echo "🚀 Deploying to $ENVIRONMENT environment..."

# Verifica file .env.staging esiste
if [ ! -f "$PROJECT_ROOT/.env.staging" ]; then
    echo "❌ .env.staging file not found!"
    echo "   Create it from .env.example"
    exit 1
fi

# Carica variabili
set -a
source "$PROJECT_ROOT/.env.staging"
set +a

echo "✅ Environment: $ENVIRONMENT"
echo "✅ Domain: ${STAGING_DOMAIN:-gateway.localtest.me}"

# 1. Build e start infra
echo ""
echo "📦 Step 1/5: Starting infrastructure..."
cd "$PROJECT_ROOT"
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# 2. Attendi health checks
echo ""
echo "⏳ Step 2/5: Waiting for health checks..."
sleep 15

# Verifica Cloudflare edge
EDGE_HEALTH=$(docker exec cloudflare-sim wget -qO- http://127.0.0.1/health 2>/dev/null || echo "FAILED")
if [[ "$EDGE_HEALTH" == *"OK"* ]]; then
    echo "✅ Cloudflare Edge: healthy"
else
    echo "❌ Cloudflare Edge: unhealthy"
    exit 1
fi

# 3. Deploy applicazione al "server Hetzner"
echo ""
echo "📤 Step 3/5: Deploying application to Hetzner server..."

# Copia files nel container
docker cp "$PROJECT_ROOT/services" $TARGET_CONTAINER:/opt/gateway/
docker cp "$PROJECT_ROOT/packages" $TARGET_CONTAINER:/opt/gateway/
docker cp "$PROJECT_ROOT/package.json" $TARGET_CONTAINER:/opt/gateway/
docker cp "$PROJECT_ROOT/watt.json" $TARGET_CONTAINER:/opt/gateway/

# Installa Node.js e dipendenze
docker exec $TARGET_CONTAINER bash -c "
    set -e
    echo '📦 Installing Node.js...'
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
    apt-get install -y nodejs >/dev/null 2>&1
    
    echo '📦 Installing dependencies...'
    cd /opt/gateway
    npm install >/dev/null 2>&1
    
    echo '🏗️  Building application...'
    npm run build >/dev/null 2>&1
    
    echo '✅ Application installed'
"

# 4. Start applicazione
echo ""
echo "🚀 Step 4/5: Starting application..."
docker exec -d $TARGET_CONTAINER bash -c "
    cd /opt/gateway
    npm start > /var/log/gateway.log 2>&1 &
"

sleep 5

# 5. Health check finale
echo ""
echo "🔍 Step 5/5: Running health checks..."

# Check gateway interno
GATEWAY_HEALTH=$(docker exec $TARGET_CONTAINER curl -sf http://localhost:3042/health 2>/dev/null || echo "FAILED")
if [[ "$GATEWAY_HEALTH" == *"ok"* ]] || [[ "$GATEWAY_HEALTH" == *"OK"* ]]; then
    echo "✅ Gateway (internal): healthy"
else
    echo "❌ Gateway (internal): unhealthy"
    echo "   Logs:"
    docker exec $TARGET_CONTAINER tail -20 /var/log/gateway.log
    exit 1
fi

# Check attraverso Cloudflare edge
EDGE_GATEWAY=$(curl -sk https://gateway.localtest.me/health 2>/dev/null || echo "FAILED")
if [[ "$EDGE_GATEWAY" == *"ok"* ]] || [[ "$EDGE_GATEWAY" == *"OK"* ]]; then
    echo "✅ Gateway (via Cloudflare): healthy"
else
    echo "⚠️  Gateway via Cloudflare: not accessible (normal for local testing)"
fi

# Verifica containers
echo ""
echo "📊 Container status:"
docker compose -f docker-compose.yml -f docker-compose.staging.yml ps --format "table {{.Service}}\t{{.Status}}"

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🔗 Service endpoints:"
echo "   Gateway (internal):    http://172.30.0.10:3042/health"
echo "   Cloudflare Edge:       https://gateway.localtest.me"
echo "   Grafana:               https://grafana.localtest.me"
echo "   Prometheus:            https://prometheus.localtest.me"
echo ""
echo "📋 Useful commands:"
echo "   View logs:      docker logs -f $TARGET_CONTAINER"
echo "   SSH to server:  docker exec -it $TARGET_CONTAINER bash"
echo "   Stop staging:   npm run staging:stop"
