# Maintenance & Monitoring Guide

> **Project**: Tech Citizen Software Gateway  
> **Environment**: Production (tech-citizen.me)  
> **Last Updated**: 2025-12-12

---

## Table of Contents

1. [Server Health Checks](#server-health-checks)
2. [Application Health Checks](#application-health-checks)
3. [Dashboard Access](#dashboard-access)
4. [Monitoring Endpoints](#monitoring-endpoints)
5. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Emergency Contacts](#emergency-contacts)

---

## Server Health Checks

### 1. System Status

**Check Server Connectivity:**

```bash
# SSH access
ssh -i ~/.ssh/hetzner_techcitizen root@46.224.61.146

# System uptime and load
uptime

# Memory usage
free -h

# Disk usage
df -h

# CPU usage
top -bn1 | head -20
```

**Expected Results:**

- SSH connection successful
- Load average < 2.0 (4 CPU cores)
- Memory usage < 80%
- Disk usage < 75%

---

### 2. Docker Services Status

**Check Running Containers:**

```bash
ssh root@46.224.61.146 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
```

**Expected Containers:**

```
NAMES                STATUS              PORTS
gateway-caddy        Up (healthy)        80->80, 443->443, 2019->2019
gateway-prometheus   Up (healthy)        19090->9090
gateway-grafana      Up (healthy)        3000->3000
```

**Container Health Checks:**

```bash
# Check Caddy
docker inspect gateway-caddy --format '{{.State.Health.Status}}'  # Expected: healthy

# Check Prometheus
docker inspect gateway-prometheus --format '{{.State.Health.Status}}'  # Expected: healthy

# Check Grafana
docker inspect gateway-grafana --format '{{.State.Health.Status}}'  # Expected: healthy
```

---

### 3. Network & Firewall

**Check Open Ports:**

```bash
ssh root@46.224.61.146 "ss -tlnp | grep -E ':(22|80|443|2019|3000|9090)'"
```

**Expected Listening Ports:**

- `22` - SSH (secured with key-based auth)
- `80` - HTTP (Caddy, redirects to HTTPS)
- `443` - HTTPS (Caddy, TLS termination)
- `2019` - Caddy Admin API (localhost only)
- `3000` - Grafana (should be accessed via grafana.tech-citizen.me)
- `19090` - Prometheus (internal, should close after reverse proxy working)

**UFW Firewall Status:**

```bash
ssh root@46.224.61.146 "ufw status numbered"
```

**Expected Rules:**

```
[ 1] 22/tcp         ALLOW IN    Anywhere  # SSH
[ 2] 80/tcp         ALLOW IN    Anywhere  # HTTP
[ 3] 443/tcp        ALLOW IN    Anywhere  # HTTPS
[ 4] 3001/tcp       ALLOW IN    Anywhere  # Grafana (temporary)
[ 5] 19090/tcp      ALLOW IN    Anywhere  # Prometheus (temporary)
```

---

### 4. SSL/TLS Certificates

**Check Certificate Expiry:**

```bash
# Via OpenSSL
echo | openssl s_client -servername www.tech-citizen.me -connect 46.224.61.146:443 2>/dev/null | \
  openssl x509 -noout -dates

# Via Caddy Admin API
ssh root@46.224.61.146 "curl -s http://localhost:2019/config/ | jq '.apps.http.servers.srv0.tls_connection_policies'"
```

**Expected:**

- Issuer: Let's Encrypt (R3 or R10)
- Expires: ~90 days from issue date
- Auto-renewal: Caddy handles automatically (30 days before expiry)

**Certificate Storage:**

```bash
ssh root@46.224.61.146 "ls -lh /var/lib/docker/volumes/gateway_caddy-data/_data/caddy/certificates/"
```

---

### 5. Log Files

**Caddy Logs:**

```bash
# Access logs (JSON format)
ssh root@46.224.61.146 "docker logs gateway-caddy --tail 50"

# Filter for errors
ssh root@46.224.61.146 "docker logs gateway-caddy 2>&1 | grep -i error"

# Filter for certificate issues
ssh root@46.224.61.146 "docker logs gateway-caddy 2>&1 | grep -i 'certificate\|acme'"
```

**Prometheus Logs:**

```bash
ssh root@46.224.61.146 "docker logs gateway-prometheus --tail 50"
```

**Grafana Logs:**

```bash
ssh root@46.224.61.146 "docker logs gateway-grafana --tail 50"
```

---

### 6. Secrets and Credentials

**Location of Production Secrets:**

```bash
# Local machine (gitignored)
~/secrets/production.env

# Server (gitignored, deployed via Ansible)
/opt/gateway/.env
```

**View secrets:**

```bash
# Local
cat ~/secrets/production.env

# Server
ssh -i ~/.ssh/hetzner_techcitizen root@46.224.61.146 "cat /opt/gateway/.env"
```

**Secrets documentation:**

- Generation: See `scripts/generate-keys.js`
- Template: `.env.example` in repository root
- Never commit: Listed in `.gitignore` and checked by `scripts/check-secrets.cjs`

---

## Application Health Checks

### 1. HTTP/HTTPS Endpoints

**Public Endpoints (all domains):**

| Domain                    | Endpoint      | Expected Response                    | Status Code |
| ------------------------- | ------------- | ------------------------------------ | ----------- |
| `tech-citizen.me`         | `/`           | Redirect to `www.tech-citizen.me`    | 301/308     |
| `www.tech-citizen.me`     | `/`           | "Tech Citizen Gateway - Coming Soon" | 200         |
| `gateway.tech-citizen.me` | `/health`     | Gateway health JSON (when deployed)  | 200         |
| `auth.tech-citizen.me`    | `/health`     | Keycloak health (when deployed)      | 200         |
| `grafana.tech-citizen.me` | `/api/health` | Grafana health JSON                  | 200         |
| `app.tech-citizen.me`     | `/`           | Frontend app (when deployed)         | 200         |

**Test Commands:**

```bash
# Root domain redirect
curl -sI https://tech-citizen.me | grep -i location
# Expected: Location: https://www.tech-citizen.me

# WWW placeholder
curl -s https://www.tech-citizen.me
# Expected: "Tech Citizen Gateway - Coming Soon"

# Grafana health (via reverse proxy)
curl -s https://grafana.tech-citizen.me/api/health | jq
# Expected: {"database": "ok", "version": "11.3.1"}

# Grafana health (direct, temporary)
curl -s http://46.224.61.146:3000/api/health | jq
# Expected: same as above

# Prometheus health (direct, temporary)
curl -s http://46.224.61.146:19090/-/healthy
# Expected: "Prometheus Server is Healthy."
```

---

### 2. DNS Configuration

**Verify DNS Records:**

```bash
# All domains should point to server IP
dig +short tech-citizen.me        # Expected: 46.224.61.146
dig +short www.tech-citizen.me    # Expected: 46.224.61.146
dig +short gateway.tech-citizen.me # Expected: 46.224.61.146
dig +short auth.tech-citizen.me   # Expected: 46.224.61.146
dig +short grafana.tech-citizen.me # Expected: 46.224.61.146
dig +short app.tech-citizen.me    # Expected: 46.224.61.146
```

**Check DNS Propagation:**

```bash
# Use external DNS servers
dig @8.8.8.8 +short tech-citizen.me       # Google DNS
dig @1.1.1.1 +short tech-citizen.me       # Cloudflare DNS
dig @208.67.222.222 +short tech-citizen.me # OpenDNS
```

---

### 3. Gateway Application Health (When Deployed)

**API Endpoints:**

```bash
# Health check
curl -s https://gateway.tech-citizen.me/health | jq
# Expected: {"status": "healthy", "version": "x.x.x", "uptime": 12345}

# API documentation (if enabled)
curl -s https://gateway.tech-citizen.me/documentation
# Expected: Swagger UI HTML or JSON spec

# Metrics endpoint
curl -s https://gateway.tech-citizen.me/metrics
# Expected: Prometheus metrics in text format
```

**Check Application Logs:**

```bash
# When gateway-app container is deployed
ssh root@46.224.61.146 "docker logs gateway-app --tail 100"
```

---

### 4. Keycloak Authentication (When Deployed)

**Health Endpoints:**

```bash
# Keycloak health
curl -s https://auth.tech-citizen.me/health | jq
# Expected: {"status": "UP", "checks": [...]}

# Realm configuration
curl -s https://auth.tech-citizen.me/realms/gateway/.well-known/openid-configuration | jq
# Expected: OpenID Connect discovery document
```

**Admin Console:**

- URL: https://auth.tech-citizen.me/admin
- Credentials: `~/secrets/production.env` → `KEYCLOAK_ADMIN_USER` / `KEYCLOAK_ADMIN_PASSWORD`

---

## Dashboard Access

### 1. Grafana

**URL:** https://grafana.tech-citizen.me

**Default Credentials:**

- Username: `admin`
- Password: `~/secrets/production.env` → `GF_SECURITY_ADMIN_PASSWORD`
- Or on server: `/opt/gateway/.env` → `GF_SECURITY_ADMIN_PASSWORD`

**Initial Setup:**

1. Login with default credentials
2. Change admin password immediately
3. Add Prometheus data source:
   - URL: `http://prometheus:9090`
   - Access: Server (default)
   - Save & Test

**Pre-built Dashboards:**

- **Caddy Metrics**: Request rates, response times, error rates
- **Gateway API**: Endpoint performance, authentication metrics
- **Infrastructure**: CPU, memory, disk, network per container

**Import Dashboard:**

```bash
# From Grafana dashboard library
# ID: 14282 (Caddy)
# ID: 1860 (Node Exporter - if installed)
```

---

### 2. Prometheus

**URL (Direct):** http://46.224.61.146:19090  
**URL (Via Proxy - Future):** https://prometheus.tech-citizen.me

**Useful Queries:**

```promql
# HTTP request rate (per second)
rate(http_requests_total[5m])

# HTTP error rate
rate(http_requests_total{status=~"5.."}[5m])

# Container memory usage
container_memory_usage_bytes{name=~"gateway.*"}

# Container CPU usage
rate(container_cpu_usage_seconds_total{name=~"gateway.*"}[5m])

# Caddy uptime
up{job="caddy"}
```

**Targets Health:**

- Navigate to: Status → Targets
- All targets should show state: **UP**

---

### 3. Caddy Admin API

**URL:** http://localhost:2019 (localhost only, SSH tunnel required)

**SSH Tunnel:**

```bash
ssh -i ~/.ssh/hetzner_techcitizen -L 2019:localhost:2019 root@46.224.61.146
```

**Endpoints:**

```bash
# Current configuration
curl -s http://localhost:2019/config/ | jq

# Loaded certificates
curl -s http://localhost:2019/pki/certificates | jq

# Active TLS connections
curl -s http://localhost:2019/config/apps/http/servers/srv0 | jq
```

---

## Monitoring Endpoints

### Quick Health Check Script

Create `scripts/health-check.sh`:

```bash
#!/usr/bin/env bash
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
  if curl -sI --max-time 5 "https://$domain" >/dev/null 2>&1; then
    status=$(curl -sI --max-time 5 "https://$domain" | grep -i "HTTP/" | awk '{print $2}')
    echo "  ✅ https://$domain → $status"
  else
    echo "  ❌ https://$domain → Connection failed"
  fi
done
echo ""

# Container status (SSH required)
echo "🐳 Docker Containers:"
ssh -i ~/.ssh/hetzner_techcitizen root@"$SERVER" \
  "docker ps --format '{{.Names}}: {{.Status}}' | grep gateway" || echo "  ❌ SSH connection failed"
echo ""

# Prometheus health
echo "📊 Monitoring:"
if curl -s --max-time 5 "http://$SERVER:19090/-/healthy" >/dev/null 2>&1; then
  echo "  ✅ Prometheus (port 19090)"
else
  echo "  ❌ Prometheus unreachable"
fi

# Grafana health
if curl -s --max-time 5 "http://$SERVER:3000/api/health" >/dev/null 2>&1; then
  version=$(curl -s "http://$SERVER:3000/api/health" | jq -r '.version')
  echo "  ✅ Grafana v$version (port 3000)"
else
  echo "  ❌ Grafana unreachable"
fi

echo ""
echo "✅ Health check complete"
```

**Usage:**

```bash
chmod +x scripts/health-check.sh
bash scripts/health-check.sh
```

---

## Common Issues & Troubleshooting

### Issue 1: HTTPS Connection Refused (Port 443)

**Symptoms:**

```
curl: (7) Failed to connect to www.tech-citizen.me port 443: Connection refused
```

**Diagnosis:**

```bash
# Check if Caddy is listening on port 443
ssh root@46.224.61.146 "ss -tlnp | grep :443"

# Check docker-compose.yml port mapping
ssh root@46.224.61.146 "grep -A 3 'caddy:' /opt/gateway/docker-compose.yml"
```

**Solution:**

1. Ensure `docker-compose.yml` maps `443:443` (not `18443:8443`)
2. Restart Caddy:
   ```bash
   ssh root@46.224.61.146 "cd /opt/gateway && docker compose restart caddy"
   ```
3. Check UFW allows port 443:
   ```bash
   ssh root@46.224.61.146 "ufw status | grep 443"
   ```

---

### Issue 2: SSL Certificate Not Obtained

**Symptoms:**

- Caddy logs show: `"error obtaining certificate"`
- HTTPS endpoints return connection errors

**Diagnosis:**

```bash
# Check Caddy logs for ACME errors
ssh root@46.224.61.146 "docker logs gateway-caddy 2>&1 | grep -i 'acme\|certificate'"
```

**Common Causes:**

1. **DNS not configured**: Verify `dig +short <domain>` returns correct IP
2. **Port 80 blocked**: Let's Encrypt requires port 80 for HTTP-01 challenge
3. **Rate limit hit**: Let's Encrypt staging mode enabled (ssl_staging: true)

**Solution:**

```bash
# 1. Verify DNS resolves
dig +short tech-citizen.me

# 2. Test port 80 connectivity
curl -I http://tech-citizen.me

# 3. Check Caddyfile for auto_https setting
ssh root@46.224.61.146 "grep -i 'auto_https' /opt/gateway/infrastructure/caddy/Caddyfile"
# Should NOT be: auto_https off

# 4. Force certificate renewal
ssh root@46.224.61.146 "docker exec gateway-caddy caddy reload --config /etc/caddy/Caddyfile"
```

---

### Issue 3: Container Unhealthy or Restarting

**Symptoms:**

```
docker ps shows: "Restarting (1) 5 seconds ago"
```

**Diagnosis:**

```bash
# Check container logs
ssh root@46.224.61.146 "docker logs <container-name> --tail 100"

# Check health check configuration
ssh root@46.224.61.146 "docker inspect <container-name> --format '{{json .State.Health}}' | jq"
```

**Solution:**

1. Identify error in logs
2. Check configuration files (Caddyfile, prometheus.yml, etc.)
3. Verify volumes are mounted correctly
4. Restart with clean state if needed:
   ```bash
   ssh root@46.224.61.146 "cd /opt/gateway && docker compose down && docker compose up -d"
   ```

---

### Issue 4: High Memory/CPU Usage

**Symptoms:**

- Server slow to respond
- `top` shows high load

**Diagnosis:**

```bash
# Check container resource usage
ssh root@46.224.61.146 "docker stats --no-stream"

# Check system resources
ssh root@46.224.61.146 "free -h && df -h"
```

**Solution:**

1. Identify resource-hungry container
2. Check for memory leaks in application logs
3. Restart affected container:
   ```bash
   ssh root@46.224.61.146 "docker restart <container-name>"
   ```
4. Consider adding resource limits to `docker-compose.yml`:
   ```yaml
   services:
     caddy:
       deploy:
         resources:
           limits:
             cpus: '1'
             memory: 512M
   ```

---

### Issue 5: Prometheus Targets Down

**Symptoms:**

- Grafana dashboards show "No data"
- Prometheus UI shows targets in DOWN state

**Diagnosis:**

```bash
# Check Prometheus targets
curl -s http://46.224.61.146:19090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

**Solution:**

1. Verify scrape configuration in `prometheus.yml`
2. Check network connectivity between containers:
   ```bash
   ssh root@46.224.61.146 "docker exec gateway-prometheus wget -O- http://caddy:8080/health"
   ```
3. Restart Prometheus:
   ```bash
   ssh root@46.224.61.146 "docker restart gateway-prometheus"
   ```

---

## Maintenance Procedures

### 1. Update Docker Images

**Procedure:**

```bash
# 1. Backup current state
ssh root@46.224.61.146 "cd /opt/gateway && docker compose config > docker-compose.backup.yml"

# 2. Pull latest images
ssh root@46.224.61.146 "cd /opt/gateway && docker compose pull"

# 3. Restart with new images (zero-downtime with Caddy)
ssh root@46.224.61.146 "cd /opt/gateway && docker compose up -d"

# 4. Verify health
bash scripts/health-check.sh
```

**Rollback (if needed):**

```bash
ssh root@46.224.61.146 "cd /opt/gateway && docker compose down && docker compose -f docker-compose.backup.yml up -d"
```

---

### 2. Rotate Secrets

**Procedure:**

```bash
# 1. Generate new secrets
npm run keys:all:prod

# 2. Update ~/secrets/production.env on local machine

# 3. Deploy new secrets
scp -i ~/.ssh/hetzner_techcitizen .env root@46.224.61.146:/opt/gateway/.env

# 4. Restart affected services
ssh root@46.224.61.146 "cd /opt/gateway && docker compose restart"

# 5. Verify
bash scripts/health-check.sh
```

---

### 3. Backup & Restore

**Backup Procedure:**

```bash
# 1. Backup Docker volumes
ssh root@46.224.61.146 "cd /opt/gateway && \
  docker run --rm -v gateway_caddy-data:/data -v /root/backups:/backup alpine \
    tar czf /backup/caddy-data-$(date +%Y%m%d).tar.gz -C /data ."

# Repeat for prometheus-data, grafana-data

# 2. Backup configuration files
ssh root@46.224.61.146 "cd /opt && tar czf /root/backups/gateway-config-$(date +%Y%m%d).tar.gz gateway/"

# 3. Download backups
scp -i ~/.ssh/hetzner_techcitizen root@46.224.61.146:/root/backups/*.tar.gz ./backups/
```

**Restore Procedure:**

```bash
# 1. Upload backup
scp -i ~/.ssh/hetzner_techcitizen ./backups/caddy-data-20251212.tar.gz root@46.224.61.146:/root/

# 2. Stop services
ssh root@46.224.61.146 "cd /opt/gateway && docker compose down"

# 3. Restore volume
ssh root@46.224.61.146 "docker run --rm -v gateway_caddy-data:/data -v /root:/backup alpine \
  tar xzf /backup/caddy-data-20251212.tar.gz -C /data"

# 4. Start services
ssh root@46.224.61.146 "cd /opt/gateway && docker compose up -d"
```

---

### 4. Security Updates

**Procedure:**

```bash
# 1. SSH to server
ssh -i ~/.ssh/hetzner_techcitizen root@46.224.61.146

# 2. Update system packages
apt update && apt upgrade -y

# 3. Check for reboots (kernel updates)
if [ -f /var/run/reboot-required ]; then
  echo "⚠️  Reboot required"
  # Schedule maintenance window
fi

# 4. Update Docker images (see procedure above)

# 5. Run security audit
bash /opt/gateway/scripts/security-audit.sh
```

---

### 5. Log Rotation

**Caddy Logs:**
Caddy logs to `/var/log/caddy/access.log` inside container (mounted volume).

**Setup logrotate:**

```bash
# On server
cat > /etc/logrotate.d/caddy <<'EOF'
/var/lib/docker/volumes/gateway_caddy-logs/_data/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    postrotate
        docker exec gateway-caddy caddy reload --config /etc/caddy/Caddyfile
    endscript
}
EOF
```

---

## Emergency Contacts

### On-Call Engineers

| Role            | Name              | Contact                   | Availability   |
| --------------- | ----------------- | ------------------------- | -------------- |
| **DevOps Lead** | Antonio Cittadino | awesome.cit.dev@gmail.com | 24/7           |
| **Backup**      | TBD               | -                         | Business hours |

### Escalation Path

1. **Level 1**: Check this maintenance guide
2. **Level 2**: Review application logs
3. **Level 3**: Contact DevOps Lead
4. **Level 4**: Emergency server reboot (last resort)

### Critical Commands

**Emergency Stop All Services:**

```bash
ssh root@46.224.61.146 "cd /opt/gateway && docker compose down"
```

**Emergency Restart:**

```bash
ssh root@46.224.61.146 "reboot"
# Wait 2-3 minutes, then verify:
bash scripts/health-check.sh
```

**Enable Maintenance Mode:**

```bash
# Update Caddyfile to return 503 for all domains
ssh root@46.224.61.146 "cat > /opt/gateway/infrastructure/caddy/Caddyfile <<'EOF'
{
    email awesome.cit.dev@gmail.com
}

tech-citizen.me, www.tech-citizen.me, gateway.tech-citizen.me, auth.tech-citizen.me, grafana.tech-citizen.me {
    respond \"System under maintenance. Please try again later.\" 503
}
EOF
docker exec gateway-caddy caddy reload --config /etc/caddy/Caddyfile"
```

---

## Monitoring Checklist

### Daily Checks

- [ ] All containers running (`docker ps`)
- [ ] No errors in Caddy logs
- [ ] Grafana dashboards showing data
- [ ] Prometheus targets UP

### Weekly Checks

- [ ] SSL certificates valid (not expiring in < 30 days)
- [ ] Disk usage < 75%
- [ ] Security updates available
- [ ] Backup integrity test

### Monthly Checks

- [ ] Review access logs for anomalies
- [ ] Update Docker images
- [ ] Rotate secrets
- [ ] Run full security audit (`ansible-playbook security-audit.yml`)

---

## Related Documentation

- **Production Setup**: [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)
- **Ansible Guide**: [ANSIBLE.md](./ANSIBLE.md)
- **Security Audit**: [POST_DEPLOYMENT_AUDIT.md](../security/POST_DEPLOYMENT_AUDIT.md)
- **Infrastructure**: [INFRASTRUCTURE.md](../infrastructure/INFRASTRUCTURE.md)
- **Secrets Management**: See `~/secrets/production.env` and `.env.example`

---

## Lessons Learned (First Deployment)

### Issue 1: Incorrect Port Mappings

**Problem:**

- Initial `docker-compose.yml` used `18080:8080` and `18443:8443`
- Let's Encrypt requires standard ports `80` and `443` for HTTP-01 challenge
- SSL certificates could not be obtained

**Root Cause:**
Development configuration with non-standard ports to avoid conflicts was carried over to production.

**Solution:**

```yaml
# docker-compose.yml - Production
ports:
  - '80:80' # HTTP (Let's Encrypt validation)
  - '443:443' # HTTPS
  - '2019:2019' # Admin API (localhost only)
```

**Prevention:**

- Separate `docker-compose.yml` for dev vs production
- Or use environment-specific port variables in `.env`

---

### Issue 2: Health Check Port Mismatch

**Problem:**

- Ansible playbook `setup-caddy.yml` health check used `localhost:18080`
- After fixing docker-compose, Caddy was on port `80` but check still failed
- Multiple occurrences of hardcoded port in playbook

**Root Cause:**
Inconsistent port variables and hardcoded values in health check tasks.

**Solution:**

```yaml
# ansible/playbooks/setup-caddy.yml
pre_tasks:
  - name: Set service ports
    set_fact:
      caddy_http_port: 80
      caddy_https_port: 443

tasks:
  - name: Wait for Caddy to be healthy
    uri:
      url: 'http://localhost:{{ caddy_http_port }}/health'
```

**Prevention:**

- Use variables for all port references
- Single source of truth for port configuration
- Test playbook with `--check` and `--diff` flags

---

### Issue 3: YAML Syntax Errors

**Problem:**

- Indentation errors in `setup-caddy.yml` (extra spaces)
- Missing newline between `pre_tasks` and `tasks` sections

**Root Cause:**
Manual editing with inconsistent indentation (spaces vs tabs).

**Solution:**

- Use YAML linter: `yamllint ansible/playbooks/*.yml`
- Validate with: `ansible-playbook --syntax-check playbook.yml`
- VSCode extension: "YAML" by Red Hat

**Prevention:**

- Enable EditorConfig in IDE (2 spaces for YAML)
- Pre-commit hook with `yamllint`
- Use Ansible Lint: `ansible-lint ansible/playbooks/*.yml`

---

### Issue 4: HTTP to HTTPS Redirect Breaks Health Check

**Problem:**
Caddy automatically redirects `http://localhost:80/health` → `https://localhost/health`, causing Ansible `uri` module to fail.

**Current Workaround:**
Accept that health check will fail during Ansible run, verify manually:

```bash
curl -I https://www.tech-citizen.me  # Should return 200 OK
```

**Better Solution (Future):**

```yaml
- name: Wait for Caddy to be healthy
  uri:
    url: 'https://localhost/health'
    validate_certs: no # Self-signed cert on localhost
    status_code: 200
```

Or use dedicated health endpoint on non-redirecting port.

---

### What Worked Well

✅ **Ansible Bootstrap**: 47 tasks executed successfully on clean server  
✅ **DNS Configuration**: All 6 A records resolved correctly  
✅ **Let's Encrypt**: Certificates obtained automatically without rate limits  
✅ **Security**: No secrets committed to git, external secrets file verified  
✅ **Documentation**: Step-by-step troubleshooting enabled quick fixes  
✅ **Idempotency**: Re-running Ansible playbooks safe and predictable

---

### Deployment Checklist (Updated)

Before deploying to new server:

- [ ] Verify `docker-compose.yml` uses ports `80:80` and `443:443`
- [ ] Check all Ansible playbooks with `ansible-playbook --syntax-check`
- [ ] Validate YAML files with `yamllint`
- [ ] Test playbooks with `--check --diff` (dry-run)
- [ ] Ensure DNS records created BEFORE running Caddy setup
- [ ] Verify secrets file exists: `~/secrets/production.env`
- [ ] Test SSH connection: `ssh -i ~/.ssh/hetzner_techcitizen root@<IP>`
- [ ] Run bootstrap in test environment first (if available)
- [ ] Have rollback plan ready (backup docker-compose.yml)

---

**Document Version**: 1.0  
**Last Review**: 2025-12-12  
**Next Review**: 2026-01-12  
**Deployment History**: 2025-12-11 (first production deployment - successful after 3 iterations)
