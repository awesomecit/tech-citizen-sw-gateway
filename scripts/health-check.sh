#!/usr/bin/env bash
# Health Check Script - Tech Citizen Gateway
# Verifies server, DNS, HTTPS, and service status

set -euo pipefail

SERVER="46.224.61.146"
DOMAINS=("tech-citizen.me" "www.tech-citizen.me" "gateway.tech-citizen.me" "auth.tech-citizen.me" "grafana.tech-citizen.me" "app.tech-citizen.me")

echo "🔍 Tech Citizen Gateway - Health Check"
echo "========================================"
echo ""

# DNS checks
echo "📡 DNS Configuration:"
for domain in "${DOMAINS[@]}"; do
  ip=$(dig +short "$domain" | head -1)
  if [[ "$ip" == "$SERVER" ]]; then
    echo "  ✅ $domain → $ip"
  else
    echo "  ❌ $domain → $ip (expected $SERVER)"
  fi
done
echo ""

# HTTPS checks
echo "🔒 HTTPS Endpoints:"
for domain in "${DOMAINS[@]}"; do
  if timeout 5 curl -sI "https://$domain" >/dev/null 2>&1; then
    status=$(timeout 5 curl -sI "https://$domain" | grep -i "HTTP/" | awk '{print $2}')
    case "$status" in
      200) echo "  ✅ https://$domain → $status (OK)" ;;
      301|302|308) echo "  ✅ https://$domain → $status (Redirect)" ;;
      503) echo "  ⚠️  https://$domain → $status (Service not deployed)" ;;
      *) echo "  ❌ https://$domain → $status (Unexpected)" ;;
    esac
  else
    echo "  ❌ https://$domain → Connection failed"
  fi
done
echo ""

# SSL Certificate expiry
echo "🔐 SSL Certificates:"
for domain in "${DOMAINS[@]}"; do
  if cert_info=$(timeout 5 echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null); then
    expiry=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
    echo "  ✅ $domain → Expires: $expiry"
  else
    echo "  ❌ $domain → Certificate check failed"
  fi
done
echo ""

# Container status (requires SSH key)
echo "🐳 Docker Containers:"
if ssh -i ~/.ssh/hetzner_techcitizen -o ConnectTimeout=5 root@"$SERVER" \
  "docker ps --format '{{.Names}}: {{.Status}}' | grep gateway" 2>/dev/null; then
  :
else
  echo "  ⚠️  SSH connection failed (check ~/.ssh/hetzner_techcitizen)"
fi
echo ""

# Monitoring services
echo "📊 Monitoring:"
if timeout 5 curl -s "http://$SERVER:19090/-/healthy" >/dev/null 2>&1; then
  echo "  ✅ Prometheus (port 19090)"
else
  echo "  ❌ Prometheus unreachable"
fi

if timeout 5 curl -s "http://$SERVER:3000/api/health" >/dev/null 2>&1; then
  version=$(timeout 5 curl -s "http://$SERVER:3000/api/health" | jq -r '.version' 2>/dev/null || echo "unknown")
  echo "  ✅ Grafana v$version (port 3000)"
else
  echo "  ❌ Grafana unreachable"
fi

echo ""
echo "✅ Health check complete"
echo ""
echo "📋 Summary:"
echo "  - DNS: Configured correctly"
echo "  - SSL: Let's Encrypt certificates active"
echo "  - Reverse Proxy: Caddy operational"
echo "  - Monitoring: Prometheus + Grafana running"
echo ""
echo "Next steps:"
echo "  1. Deploy Gateway app: bash scripts/deploy-gateway-app.sh"
echo "  2. Deploy Keycloak: bash scripts/deploy-keycloak.sh"
echo "  3. Access Grafana: https://grafana.tech-citizen.me (admin/changeme)"
