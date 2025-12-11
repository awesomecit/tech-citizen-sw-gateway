# Security Audit Checklist - Post-Deployment

**Run after**: Initial server bootstrap  
**Frequency**: After each deployment + Monthly  
**Estimated Time**: 15 minutes

---

## 🔐 Manual Security Checks (After Ansible Bootstrap)

### 1. SSL/TLS Validation

```bash
# Test SSL certificate
curl -I https://techcitizen.it/health

# Check certificate expiry
echo | openssl s_client -connect techcitizen.it:443 2>/dev/null | openssl x509 -noout -dates

# SSL Labs scan (manual)
# https://www.ssllabs.com/ssltest/analyze.html?d=techcitizen.it
```

**Expected**:

- ✅ Let's Encrypt certificate valid
- ✅ Grade A or A+ on SSL Labs
- ✅ TLS 1.3 supported
- ✅ Strong cipher suites only

---

### 2. Port Scanning (External)

```bash
# From LOCAL machine (not server!)
nmap -sV -p- <SERVER_IP>
```

**Expected Open Ports**:

- ✅ 22 (SSH)
- ✅ 80 (HTTP redirect to HTTPS)
- ✅ 443 (HTTPS)
- ✅ 3001 (Grafana)
- ✅ 9090 (Prometheus)
- ❌ ALL other ports closed

**Critical**: 5432 (PostgreSQL), 6379 (Redis), 8090 (Keycloak) MUST be closed externally.

---

### 3. SSH Hardening Verification

```bash
# SSH into server
ssh -i ~/.ssh/hetzner_techcitizen root@<SERVER_IP>

# Check SSH config
sudo grep -E "^(PermitRootLogin|PasswordAuthentication|PubkeyAuthentication)" /etc/ssh/sshd_config
```

**Expected**:

```
PermitRootLogin prohibit-password  # or 'no' for deploy user
PasswordAuthentication no
PubkeyAuthentication yes
```

```bash
# Check SSH allowed users
sudo grep "AllowUsers" /etc/ssh/sshd_config

# Check fail2ban status
sudo systemctl status fail2ban
sudo fail2ban-client status sshd
```

**Expected**: fail2ban active, 0-5 banned IPs (normal activity).

---

### 4. Firewall Rules Verification

```bash
# Check UFW status
sudo ufw status verbose

# Check iptables (underlying rules)
sudo iptables -L -n -v | grep -E "(22|80|443|3001|9090)"
```

**Expected**:

```
Status: active
Logging: on (low)

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
3001/tcp                   ALLOW       Anywhere
9090/tcp                   ALLOW       Anywhere
```

---

### 5. Docker Security

```bash
# Check Docker daemon config
sudo cat /etc/docker/daemon.json

# Verify user namespace isolation
sudo grep dockremap /etc/subuid /etc/subgid

# Check running containers security
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Inspect container security settings
docker inspect gateway | jq '.[0].HostConfig.SecurityOpt'
```

**Expected**:

- ✅ User namespace remapping enabled
- ✅ No privileged containers
- ✅ AppArmor or SELinux profiles applied
- ✅ Read-only root filesystems where possible

---

### 6. Secret Exposure Check

```bash
# Check for hardcoded secrets in configs
sudo grep -r "password\|secret\|key" /opt/gateway/*.yml /opt/gateway/.env 2>/dev/null | grep -v "# "

# Verify .env permissions
sudo ls -la /opt/gateway/.env
```

**Expected**:

- ✅ .env file: `-rw------- root root` (600 permissions)
- ❌ NO plaintext secrets in committed files (docker-compose.yml should use env vars)

---

### 7. Keycloak Security

```bash
# SSH into server
ssh -i ~/.ssh/hetzner_techcitizen root@<SERVER_IP>

# Check Keycloak admin is not exposed publicly
curl -I http://localhost:8090/auth/admin/ 2>&1 | head -5

# From EXTERNAL machine:
curl -I https://techcitizen.it/auth/admin/ 2>&1 | head -5
```

**Expected**:

- ✅ Localhost responds (200 or 401)
- ❌ External request fails or requires authentication

```bash
# Check Keycloak SSL/TLS mode
docker compose exec keycloak cat /opt/keycloak/conf/keycloak.conf | grep https
```

**Expected**: `https-port=8443` or behind reverse proxy.

---

### 8. Database Access Control

```bash
# PostgreSQL should NOT be accessible externally
telnet <SERVER_IP> 5432

# Redis should NOT be accessible externally
telnet <SERVER_IP> 6379
```

**Expected**: Connection refused (both).

```bash
# Check PostgreSQL auth config
docker compose exec postgres cat /var/lib/postgresql/data/pg_hba.conf | grep -v "^#"
```

**Expected**: `host all all 172.*/16 md5` (Docker network only).

---

### 9. Rate Limiting Test

```bash
# From LOCAL machine - hammer the API
for i in {1..150}; do curl -s https://techcitizen.it/health > /dev/null & done; wait
echo "Sent 150 requests"

# Check response (should start getting 429 after 100 req/min)
curl -I https://techcitizen.it/health
```

**Expected**: HTTP 429 (Too Many Requests) after exceeding limit.

---

### 10. CORS Validation

```bash
# Test CORS headers
curl -I -H "Origin: https://malicious-site.com" https://techcitizen.it/health

# Test preflight
curl -X OPTIONS \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST" \
  https://techcitizen.it/api/protected
```

**Expected**:

- ❌ No `Access-Control-Allow-Origin` for untrusted origins
- ✅ CORS headers only for configured domains

---

### 11. Log Analysis

```bash
# SSH into server
ssh -i ~/.ssh/hetzner_techcitizen root@<SERVER_IP>

# Check for suspicious auth attempts
sudo journalctl -u sshd | grep "Failed password" | tail -20

# Check fail2ban bans
sudo fail2ban-client status sshd

# Check Docker logs for errors
cd /opt/gateway
docker compose logs --tail=100 | grep -iE "error|warn|fatal"
```

**Review**:

- Failed SSH attempts (normal: 5-20/day, suspicious: 100+/day)
- Fail2ban bans (trigger investigation if > 50 unique IPs)
- Application errors (investigate any FATAL)

---

### 12. Backup Verification

```bash
# Check if backups are configured
sudo crontab -l | grep backup

# Test backup script
sudo /opt/gateway/backup.sh --dry-run

# Verify backup storage
ls -lh /backups/ 2>/dev/null || echo "Backups not configured"
```

**Expected**:

- ✅ Daily backups scheduled (cron job)
- ✅ Backup directory exists with recent files
- ✅ Offsite backup configured (S3, rsync, etc.)

---

### 13. Monitoring Alerts Test

```bash
# Generate high CPU load (test alerting)
ssh -i ~/.ssh/hetzner_techcitizen root@<SERVER_IP>
stress --cpu 4 --timeout 120s

# Check Prometheus alerts
curl http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.state=="firing")'

# Check Grafana for alert notifications
# Open: https://techcitizen.it:3001/alerting/list
```

**Expected**: Alert fires within 2-5 minutes, notification sent.

---

### 14. Compliance Scan (Automated)

```bash
# Run security audit playbook
bash scripts/bootstrap-server.sh --audit-only

# Alternative - manual Ansible
ansible-playbook -i ansible/inventory/hosts.ini ansible/playbooks/security-audit.yml --limit=production
```

**Review Ansible output** for:

- ✅ All checks pass
- ⚠️ Warnings investigated
- ❌ Failures remediated

---

### 15. Vulnerability Scanning

```bash
# Docker image vulnerabilities (Trivy)
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image gateway:latest

# OS package vulnerabilities
ssh -i ~/.ssh/hetzner_techcitizen root@<SERVER_IP>
sudo apt update && sudo apt list --upgradable
```

**Action**: Update packages with vulnerabilities (test in staging first).

---

## 📊 Security Audit Report Template

After running checks, fill this:

```markdown
# Security Audit Report

**Date**: YYYY-MM-DD  
**Auditor**: [Name]  
**Environment**: Production  
**Server**: techcitizen.it (<IP>)

## Summary

- ✅ SSL/TLS: Grade A (SSL Labs)
- ✅ Ports: Only 22, 80, 443, 3001, 9090 open
- ✅ SSH: Key-only, fail2ban active
- ✅ Firewall: UFW enabled, restrictive rules
- ✅ Docker: User namespaces enabled
- ✅ Secrets: No exposure detected
- ⚠️ Backups: Not configured (ACTION REQUIRED)
- ⚠️ Rate limiting: Needs testing
- ❌ Monitoring alerts: Not triggered (ACTION REQUIRED)

## Actions Required

1. [ ] Configure offsite backups (Priority: HIGH)
2. [ ] Test rate limiting (Priority: MEDIUM)
3. [ ] Verify monitoring alerts (Priority: MEDIUM)
4. [ ] Rotate secrets (due: YYYY-MM-DD)

## Next Audit

Scheduled: [DATE] (30 days from now)
```

---

## 🚨 Critical Issues - Immediate Action

If you discover any of these, **stop and fix immediately**:

1. ❌ **PostgreSQL/Redis exposed externally** → Block ports in firewall
2. ❌ **SSH password auth enabled** → Disable, key-only
3. ❌ **No firewall active** → Enable UFW immediately
4. ❌ **Secrets in git history** → Rotate ALL secrets, rewrite git history
5. ❌ **SSL certificate expired** → Renew via Caddy or Let's Encrypt
6. ❌ **Keycloak admin panel exposed** → Restrict to VPN or IP whitelist
7. ❌ **fail2ban not running** → Enable and configure
8. ❌ **Docker containers running as root** → Fix user namespace remapping

---

## 📅 Recurring Schedule

| Check                      | Frequency | Owner                  |
| -------------------------- | --------- | ---------------------- |
| **SSL certificate expiry** | Monthly   | Automated (Caddy)      |
| **Port scanning**          | Monthly   | Security team          |
| **Vulnerability scanning** | Weekly    | Automated (Trivy cron) |
| **Log analysis**           | Weekly    | Ops team               |
| **Full security audit**    | Quarterly | Security team          |
| **Secret rotation**        | Quarterly | Ops team               |
| **Backup restore test**    | Quarterly | Ops team               |
| **Penetration testing**    | Annually  | External vendor        |

---

**Last Updated**: 2025-12-11  
**Related Playbooks**: `ansible/playbooks/security-audit.yml`  
**Automation**: Integrate with CI/CD for automated scans
