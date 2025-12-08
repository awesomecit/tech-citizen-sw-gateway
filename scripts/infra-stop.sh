#!/bin/bash

# infra-stop.sh - Ferma l'infrastruttura Docker Compose

set -e

ENVIRONMENT="${1:-development}"
REMOVE_VOLUMES="${2:-false}"

echo "🛑 Stopping infrastructure for environment: $ENVIRONMENT"

# Componi comando
DOWN_CMD="docker compose"

if [ "$ENVIRONMENT" != "development" ]; then
    OVERRIDE_FILE="docker-compose.${ENVIRONMENT}.yml"
    if [ -f "$OVERRIDE_FILE" ]; then
        DOWN_CMD="$DOWN_CMD -f docker-compose.yml -f $OVERRIDE_FILE"
    fi
fi

DOWN_CMD="$DOWN_CMD down"

# Rimuovi volumi se richiesto
if [ "$REMOVE_VOLUMES" = "true" ] || [ "$REMOVE_VOLUMES" = "volumes" ]; then
    echo "⚠️  Removing volumes (data will be lost)..."
    DOWN_CMD="$DOWN_CMD -v"
fi

# Esegui
eval $DOWN_CMD

echo "✅ Infrastructure stopped"
