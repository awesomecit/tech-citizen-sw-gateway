#!/bin/bash
# Cloudflare DNS Setup - Tech Citizen Gateway Production
# 6 A records per production deployment

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="tech-citizen.me"
SERVER_IP="46.224.61.146"
RECORDS=(
  "@"         # tech-citizen.me
  "www"       # www.tech-citizen.me
  "gateway"   # gateway.tech-citizen.me
  "auth"      # auth.tech-citizen.me
  "grafana"   # grafana.tech-citizen.me
  "app"       # app.tech-citizen.me
)

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Cloudflare DNS Setup - Tech Citizen Gateway Production${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${YELLOW}Domain:${NC} $DOMAIN"
echo -e "${YELLOW}Server IP:${NC} $SERVER_IP"
echo -e "${YELLOW}Total Records:${NC} ${#RECORDS[@]}"
echo

# Check if Cloudflare credentials are available
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ZONE_ID:-}" ]; then
  echo -e "${GREEN}✓ Cloudflare credentials found${NC}"
  echo
  echo "Creating DNS records via API..."
  
  for record in "${RECORDS[@]}"; do
    RECORD_NAME="$record"
    FULL_DOMAIN="${record}.${DOMAIN}"
    if [ "$record" = "@" ]; then
      FULL_DOMAIN="$DOMAIN"
    fi
    
    echo -e "\n${YELLOW}Creating:${NC} $FULL_DOMAIN → $SERVER_IP"
    
    # Check if record exists
    RECORD_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?name=${FULL_DOMAIN}&type=A" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" | jq -r '.result[0].id // empty')
    
    if [ -n "$RECORD_ID" ]; then
      echo -e "${YELLOW}  Record exists (ID: $RECORD_ID) - Updating...${NC}"
      curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${RECORD_ID}" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data "{\"type\":\"A\",\"name\":\"${RECORD_NAME}\",\"content\":\"${SERVER_IP}\",\"ttl\":1,\"proxied\":false}" \
        | jq -r 'if .success then "✓ Updated" else "✗ Failed: \(.errors[0].message)" end'
    else
      echo -e "${YELLOW}  Creating new record...${NC}"
      curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data "{\"type\":\"A\",\"name\":\"${RECORD_NAME}\",\"content\":\"${SERVER_IP}\",\"ttl\":1,\"proxied\":false}" \
        | jq -r 'if .success then "✓ Created" else "✗ Failed: \(.errors[0].message)" end'
    fi
  done
  
  echo
  echo -e "${GREEN}✓ DNS records configured via API${NC}"
  
else
  echo -e "${YELLOW}⚠ Cloudflare credentials not found${NC}"
  echo
  echo "Manual DNS Configuration Required:"
  echo
  echo "1. Login to Cloudflare Dashboard:"
  echo "   https://dash.cloudflare.com"
  echo
  echo "2. Select domain: $DOMAIN"
  echo
  echo "3. Go to: DNS → Records"
  echo
  echo "4. Create the following 6 A records:"
  echo
  echo "   ┌────────────┬──────────────────────────────┬─────────────────┬─────────┐"
  echo "   │ Type       │ Name                         │ IPv4 Address    │ Proxy   │"
  echo "   ├────────────┼──────────────────────────────┼─────────────────┼─────────┤"
  
  for record in "${RECORDS[@]}"; do
    FULL_DOMAIN="${record}.${DOMAIN}"
    if [ "$record" = "@" ]; then
      FULL_DOMAIN="$DOMAIN (root)"
    fi
    printf "   │ %-10s │ %-28s │ %-15s │ %-7s │\n" "A" "$FULL_DOMAIN" "$SERVER_IP" "DNS only"
  done
  
  echo "   └────────────┴──────────────────────────────┴─────────────────┴─────────┘"
  echo
  echo -e "${YELLOW}Note:${NC} Use 'DNS only' (gray cloud ☁️) NOT 'Proxied' (orange cloud 🟠)"
  echo
  echo "5. After creation, verify with:"
  echo "   dig +short $DOMAIN"
  echo "   (Should return: $SERVER_IP)"
fi

echo
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Post-setup verification
echo "DNS Propagation Check (after 5 minutes):"
echo
for record in "${RECORDS[@]}"; do
  FULL_DOMAIN="${record}.${DOMAIN}"
  if [ "$record" = "@" ]; then
    FULL_DOMAIN="$DOMAIN"
  fi
  echo "  dig +short $FULL_DOMAIN"
done
echo

echo "Public Service URLs (after DNS propagation):"
echo
echo "  https://$DOMAIN                    - Main Gateway"
echo "  https://www.$DOMAIN                - WWW Alias"
echo "  https://gateway.$DOMAIN            - Gateway API"
echo "  https://auth.$DOMAIN               - Keycloak (port 8080)"
echo "  https://grafana.$DOMAIN            - Grafana Dashboard"
echo "  https://app.$DOMAIN                - Future UI Application"
echo

echo -e "${GREEN}✓ Setup complete${NC}"
echo
