# Platformatic Watt Configuration Guide

## Environment Variable Interpolation

### Problem Solved

Platformatic Watt requires configuration at **two levels**:

1. **Root `watt.json`** - Defines the Watt runtime server binding
2. **Service `services/gateway/watt.json`** - Defines each service configuration

If the root config has `"hostname": "127.0.0.1"`, **the entire runtime binds to localhost only**, making it inaccessible from other containers even if service configs have `"hostname": "0.0.0.0"`.

### Solution: Template-Based Configuration

We use `envsubst` to generate runtime configurations from templates:

```bash
# Root template: watt.json.template
{
  "$schema": "https://schemas.platformatic.dev/@platformatic/runtime/3.0.0.json",
  "server": {
    "hostname": "${PLT_SERVER_HOSTNAME}",  # Uses env var
    "port": ${PORT}                        # Number without quotes!
  }
}

# Generate at deploy time
export $(cat services/gateway/.env | xargs)
envsubst '${PLT_SERVER_HOSTNAME} ${PORT} ${LOG_LEVEL}' < watt.json.template > watt.json
```

### Critical Details

#### Port as Number

```json
// ❌ Wrong - port as string
"port": "${PORT}"  → becomes "port": "3042" (string)

// ✅ Correct - port as number
"port": ${PORT}    → becomes "port": 3042 (number)
```

Platformatic requires `port` to be a JSON number, not string.

#### Specify Variables Explicitly

```bash
# ❌ Wrong - substitutes ALL $vars including $schema
envsubst < template.json

# ✅ Correct - only substitutes listed vars
envsubst '${PLT_SERVER_HOSTNAME} ${PORT} ${LOG_LEVEL}' < template.json
```

This prevents `$schema` from being replaced.

#### Build Before Start

The build process caches configuration. You MUST rebuild after changing `watt.json`:

```bash
rm -rf dist .watt              # Clean build artifacts
npm run build                   # Rebuild with new config
npm start                       # Start with new binding
```

### Environment File Structure

```bash
# services/gateway/.env
PLT_SERVER_HOSTNAME=0.0.0.0    # Bind to all interfaces
PORT=3042
LOG_LEVEL=info
```

### Deployment Integration

In `scripts/deploy-staging.sh`:

```bash
# Install envsubst (from gettext-base package)
apt-get install -y gettext-base

# Generate both configs
export $(cat services/gateway/.env | xargs)

# Root runtime config
envsubst '${PLT_SERVER_HOSTNAME} ${PORT} ${LOG_LEVEL}' \
  < watt.json.template > watt.json

# Service config
envsubst '${PLT_SERVER_HOSTNAME} ${PORT} ${LOG_LEVEL}' \
  < services/gateway/watt.json.template > services/gateway/watt.json

# Build AFTER generation
npm run build
npm start
```

### Verification

#### Check Binding

```bash
# Inside container
netstat -tuln | grep :3042
# Should show: tcp 0 0 0.0.0.0:3042 0.0.0.0:* LISTEN

# From logs
docker logs container | grep "listening at"
# Should show: "Platformatic is now listening at http://0.0.0.0:3042"
```

#### Test Connectivity

```bash
# From same container (localhost)
curl http://localhost:3042/health

# From another container (network)
curl http://container-name:3042/health

# From host (port mapping required)
curl http://localhost:3042/health
```

### Troubleshooting

#### Still binds to 127.0.0.1

1. Verify generated config:

   ```bash
   cat watt.json | jq .server
   # Must show: "hostname": "0.0.0.0", "port": 3042
   ```

2. Check BOTH files:

   ```bash
   cat watt.json | jq .server
   cat services/gateway/watt.json | jq .server
   # Both must have 0.0.0.0
   ```

3. Clean rebuild:
   ```bash
   rm -rf dist .watt node_modules/.cache
   npm run build
   ```

#### envsubst not found

```bash
# Ubuntu/Debian
apt-get install -y gettext-base

# Alpine
apk add gettext
```

#### Port as string instead of number

Check template has `${PORT}` **without quotes**:

```json
// Template
"port": ${PORT}  ← No quotes!

// Generated
"port": 3042     ← Number type
```

### Git Workflow

```gitignore
# .gitignore
watt.json                      # Generated at deploy time
services/gateway/watt.json     # Generated at deploy time

# Keep templates
!watt.json.template
!services/gateway/watt.json.template
```

Commit **only templates**, never generated files.

### References

- [Platformatic Watt Docs](https://docs.platformatic.dev/docs/watt)
- [envsubst Manual](https://www.gnu.org/software/gettext/manual/html_node/envsubst-Invocation.html)
- ADR-0007: Template-Based Configuration (this solution)

---

**Last Updated**: 2025-12-08  
**Issue Resolved**: Gateway binding to 127.0.0.1 in containers  
**Solution**: envsubst templates + clean rebuild
