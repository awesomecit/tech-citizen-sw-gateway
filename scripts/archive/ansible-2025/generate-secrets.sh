#!/bin/bash
# Generate secrets for production deployment
# Usage: bash scripts/generate-secrets.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SECRETS_FILE="ansible/secrets.env"
BACKUP_FILE="ansible/secrets.env.backup.$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Tech Citizen Gateway - Secrets Generator${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if secrets already exist
if [ -f "$SECRETS_FILE" ]; then
  echo -e "${YELLOW}WARNING: $SECRETS_FILE already exists${NC}"
  echo ""
  read -p "Do you want to regenerate? This will backup the old file. (yes/no): " CONFIRM
  
  if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Cancelled${NC}"
    exit 0
  fi
  
  echo -e "${YELLOW}Backing up to: $BACKUP_FILE${NC}"
  cp "$SECRETS_FILE" "$BACKUP_FILE"
fi

echo -e "${GREEN}Generating secrets...${NC}"
echo ""

# Generate secrets
JWT_SECRET=$(openssl rand -hex 64)
SESSION_SECRET=$(openssl rand -hex 64)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
RABBITMQ_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-24)
KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-24)
KEYCLOAK_DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
KEYCLOAK_CLIENT_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
POSTGRES_AUDIT_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
RABBITMQ_ERLANG_COOKIE=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# Create secrets file
cat > "$SECRETS_FILE" <<EOF
# Tech Citizen Gateway - Production Secrets
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# 
# WARNING: This file contains sensitive data!
# - DO NOT commit to git (.gitignore protects it)
# - Backup securely (encrypted storage recommended)
# - Rotate secrets regularly (quarterly recommended)

# ============================================
# JWT & SESSIONS
# ============================================
jwt_secret: "$JWT_SECRET"
session_secret: "$SESSION_SECRET"

# ============================================
# KEYCLOAK
# ============================================
keycloak_admin_password: "$KEYCLOAK_ADMIN_PASSWORD"
keycloak_db_password: "$KEYCLOAK_DB_PASSWORD"
keycloak_client_secret: "$KEYCLOAK_CLIENT_SECRET"

# ============================================
# DATABASES
# ============================================
postgres_password: "$POSTGRES_PASSWORD"
postgres_audit_password: "$POSTGRES_AUDIT_PASSWORD"

# ============================================
# REDIS
# ============================================
redis_password: "$REDIS_PASSWORD"

# ============================================
# RABBITMQ
# ============================================
rabbitmq_password: "$RABBITMQ_PASSWORD"
rabbitmq_erlang_cookie: "$RABBITMQ_ERLANG_COOKIE"

# ============================================
# MONITORING
# ============================================
grafana_admin_password: "$GRAFANA_ADMIN_PASSWORD"
EOF

# Set secure permissions
chmod 600 "$SECRETS_FILE"

echo -e "${GREEN}✓ Secrets generated successfully${NC}"
echo ""
echo -e "${BLUE}Location:${NC} $SECRETS_FILE"
echo -e "${BLUE}Permissions:${NC} 600 (read/write owner only)"
echo ""

# Print summary (masked)
echo -e "${YELLOW}Generated secrets (first 8 chars shown):${NC}"
echo "  JWT_SECRET: ${JWT_SECRET:0:8}..."
echo "  SESSION_SECRET: ${SESSION_SECRET:0:8}..."
echo "  REDIS_PASSWORD: ${REDIS_PASSWORD:0:8}..."
echo "  RABBITMQ_PASSWORD: ${RABBITMQ_PASSWORD:0:8}..."
echo "  KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD:0:8}..."
echo "  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:0:8}..."
echo "  GRAFANA_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:0:8}..."
echo ""

# Security recommendations
echo -e "${YELLOW}Security Recommendations:${NC}"
echo "  1. Backup this file to encrypted storage"
echo "  2. Never commit to git (already in .gitignore)"
echo "  3. Rotate secrets quarterly"
echo "  4. Use different secrets for staging/production"
echo ""

# Verify .gitignore
if grep -q "secrets.env" .gitignore 2>/dev/null; then
  echo -e "${GREEN}✓ .gitignore already protects secrets.env${NC}"
else
  echo -e "${RED}✗ WARNING: secrets.env not in .gitignore!${NC}"
  echo "  Add this line to .gitignore:"
  echo "    ansible/secrets.env"
fi
echo ""

echo -e "${GREEN}Next steps:${NC}"
echo "  1. Review ansible/inventory/hosts.ini (update IP, domain, Cloudflare)"
echo "  2. Test SSH connection: ssh -i ~/.ssh/hetzner_techcitizen root@<SERVER_IP>"
echo "  3. Run bootstrap: bash scripts/bootstrap-server.sh"
echo ""
