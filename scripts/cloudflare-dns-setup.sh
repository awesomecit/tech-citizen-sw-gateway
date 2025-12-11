#!/bin/bash
# Cloudflare DNS Setup for tech-citizen.me
# Manual configuration helper

DOMAIN="tech-citizen.me"
SERVER_IP="46.224.61.146"

echo "======================================"
echo "Cloudflare DNS Configuration Helper"
echo "======================================"
echo ""
echo "Domain: $DOMAIN"
echo "Server IP: $SERVER_IP"
echo ""

echo "Step 1: Login to Cloudflare Dashboard"
echo "  https://dash.cloudflare.com"
echo ""

echo "Step 2: Select domain: $DOMAIN"
echo ""

echo "Step 3: Go to DNS → Records"
echo ""

echo "Step 4: Create/Update these DNS records:"
echo ""
echo "  Record 1 (Root domain):"
echo "    Type:    A"
echo "    Name:    @"
echo "    IPv4:    $SERVER_IP"
echo "    TTL:     Auto"
echo "    Proxy:   ✅ Proxied (orange cloud)"
echo ""
echo "  Record 2 (WWW subdomain):"
echo "    Type:    A"
echo "    Name:    www"
echo "    IPv4:    $SERVER_IP"
echo "    TTL:     Auto"
echo "    Proxy:   ✅ Proxied (orange cloud)"
echo ""
echo "  Record 3 (API subdomain - optional):"
echo "    Type:    A"
echo "    Name:    api"
echo "    IPv4:    $SERVER_IP"
echo "    TTL:     Auto"
echo "    Proxy:   ✅ Proxied (orange cloud)"
echo ""

echo "Step 5: Verify DNS propagation (wait 2-5 minutes):"
echo "  dig +short $DOMAIN"
echo "  dig +short www.$DOMAIN"
echo ""

echo "Step 6: Test from your machine:"
echo "  ping $DOMAIN"
echo ""

echo "======================================"
echo "After DNS propagation, run bootstrap:"
echo "  bash scripts/bootstrap-server.sh"
echo "======================================"
