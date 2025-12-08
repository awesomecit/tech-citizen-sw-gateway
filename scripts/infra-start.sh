#!/bin/bash

# infra-start.sh - Avvia l'infrastruttura Docker Compose con l'environment corretto

set -e

ENVIRONMENT="${1:-development}"
VALID_ENVS=("development" "test" "production")

echo "🚀 Starting infrastructure for environment: $ENVIRONMENT"

# Valida environment
if [[ ! " ${VALID_ENVS[@]} " =~ " ${ENVIRONMENT} " ]]; then
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "   Valid options: ${VALID_ENVS[*]}"
    exit 1
fi

# Verifica file .env esiste
ENV_FILE=".env.${ENVIRONMENT}"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file not found: $ENV_FILE"
    echo "   Create it from .env.example"
    exit 1
fi

echo "✅ Using environment file: $ENV_FILE"

# Carica variabili d'ambiente
set -a
source "$ENV_FILE"
set +a

# Componi comando Docker Compose
if [ "$ENVIRONMENT" = "development" ]; then
    # Development usa solo docker-compose.yml (carica .env.development tramite env_file)
    echo "📦 Starting containers with development config..."
    docker compose up -d
else
    # Altri ambienti usano override files
    OVERRIDE_FILE="docker-compose.${ENVIRONMENT}.yml"
    
    if [ ! -f "$OVERRIDE_FILE" ]; then
        echo "❌ Override file not found: $OVERRIDE_FILE"
        exit 1
    fi
    
    echo "📦 Starting containers with override: $OVERRIDE_FILE"
    docker compose -f docker-compose.yml -f "$OVERRIDE_FILE" up -d
fi

# Attendi health checks
echo "⏳ Waiting for health checks..."
sleep 5

# Mostra stato
echo ""
echo "📊 Container status:"
docker compose ps

echo ""
echo "✅ Infrastructure started successfully!"
echo ""
echo "🔗 Service endpoints:"
echo "   Caddy HTTP:    http://localhost:${CADDY_HTTP_PORT:-18080}"
echo "   Caddy HTTPS:   https://localhost:${CADDY_HTTPS_PORT:-18443}"
echo "   Caddy Admin:   http://localhost:${CADDY_ADMIN_PORT:-12019}"
echo "   Prometheus:    http://localhost:${PROMETHEUS_PORT:-19090}"
echo "   Grafana:       http://localhost:${GRAFANA_PORT:-3000} (admin/admin)"
echo ""
echo "📋 To stop: docker compose down"
echo "📋 To check logs: docker compose logs -f [service]"
