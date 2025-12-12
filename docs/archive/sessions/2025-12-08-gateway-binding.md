# 🎓 Session Story: Gateway Binding Fix (2025-12-08)

## 📖 Epic Journey: localhost → 0.0.0.0

### 🎯 Problem Statement

Gateway inaccessibile da altri container Docker nonostante configurazione `hostname: "0.0.0.0"` in `watt.json`.

**Symptoms:**

```bash
# ❌ Fallisce
curl http://hetzner-sim:3042/health
# Connection refused

# ✅ Funziona
curl http://localhost:3042/health  # Solo dentro container
```

### 🔍 Investigation Path

#### 1. Network Debugging

```bash
# Verifica binding
docker exec hetzner-sim netstat -tuln | grep :3042
# Output: NESSUNO ← smoking gun!

# Logs mostrano
"Server listening at http://127.0.0.1:3042"  # ← Ecco il problema
```

**Lesson**: `netstat` mostra binding reale, logs non mentono

#### 2. Configuration Hunt

```bash
# Check service config
cat services/gateway/watt.json
# "hostname": "0.0.0.0" ✓ Corretto

# Verifica processo runtime
docker exec hetzner-sim ps aux | grep watt
# Still binds to 127.0.0.1 ← config ignorato?
```

**Lesson**: Config file ≠ runtime behavior (cache? environment?)

#### 3. Root Cause Discovery

```bash
# 💡 Eureka moment
cat watt.json  # ROOT config
# "hostname": "127.0.0.1" ← !!

# Platformatic legge DUE config:
# 1. watt.json (root) - definisce RUNTIME binding
# 2. services/gateway/watt.json - definisce service
```

**Lesson**: Framework architecture matters! RTFM about config hierarchy

#### 4. Env Var Attempt (Failed)

```bash
# Try 1: Environment variables
export PLT_SERVER_HOSTNAME=0.0.0.0
npm start
# Still 127.0.0.1 ← Platformatic usa {VAR} syntax, not direct env

# Try 2: set -a + source
set -a && source .env && set +a
# Still fails ← env vars not in build process
```

**Lesson**: Placeholder interpolation ≠ env var expansion

#### 5. Solution: Template Generation

```bash
# Create watt.json.template
{
  "server": {
    "hostname": "${PLT_SERVER_HOSTNAME}",  # $ syntax!
    "port": ${PORT}                        # No quotes = number
  }
}

# Generate at deploy
export $(cat .env | xargs)
envsubst '${PLT_SERVER_HOSTNAME} ${PORT}' < watt.json.template > watt.json

# Clean rebuild
rm -rf dist .watt && npm run build && npm start
```

**Result**: `Platformatic is now listening at http://0.0.0.0:3042` ✅

### 💡 Key Learnings

1. **Dual Config**: Watt runtime (root) + service config (both matter!)
2. **Template over Env**: `envsubst` > environment variable interpolation
3. **JSON Types**: `${PORT}` (number) vs `"${PORT}"` (string) - matters!
4. **Clean Rebuild**: Config changes need `rm -rf dist .watt`
5. **Verification**: `netstat -tuln` shows truth, logs can mislead

### 🛠️ Key Commands Learned

```bash
# Network debugging
docker exec CONTAINER netstat -tuln | grep :PORT
docker exec CONTAINER ss -tuln                    # Alternative
docker exec CONTAINER lsof -i :PORT               # Alternative

# Config generation
envsubst '${VAR1} ${VAR2}' < template > output    # Explicit vars
export $(cat .env | xargs)                        # Load .env

# Docker testing
docker exec CONTAINER curl http://0.0.0.0:PORT    # Test bind
docker exec -it CONTAINER bash                    # Debug inside

# Clean rebuild
rm -rf dist .watt node_modules/.cache
npm run build
```

---

## 🎬 Video Outline (45 min)

### Chapter 1: Problem Discovery (8 min)

- Docker multi-container setup (Cloudflare sim + Gateway)
- Curl fails from Cloudflare → Gateway
- `netstat` shows nothing on :3042
- Logs reveal 127.0.0.1 binding

### Chapter 2: Configuration Deep Dive (12 min)

- Platformatic Watt architecture
- Root vs service `watt.json`
- Why both matter (demo with wrong config)
- Environment variable attempts (show failures)

### Chapter 3: Template Solution (15 min)

- `envsubst` introduction
- Template creation (${VAR} syntax)
- Port as number trick (JSON types)
- Deploy script integration
- Clean rebuild necessity

### Chapter 4: Verification & Testing (7 min)

- `netstat -tuln` output analysis
- Inter-container curl tests
- Logs confirmation
- End-to-end test via Cloudflare

### Chapter 5: Lessons & Best Practices (3 min)

- RTFM on config hierarchy
- Template > env vars for complex configs
- Network debugging toolbox
- Clean rebuild checklist

---

## 📊 Session Metrics

```bash
Commits:      9
Files:        22 changed
Lines:        +1247 -153
Duration:     ~4 hours
Issues:       3 closed (binding, env vars, deploy)
Tests:        20/20 passing ✅
Security:     0 vulnerabilities ✅
```

## 🎯 Next Session Priorities

1. **Epic 3 completion**: Service discovery, routing rules
2. **Epic 4 start**: RabbitMQ integration, CloudEvents
3. **Debt**: Consolidate docs (execute CONSOLIDATION_PLAN.md)

---

**Story Type**: Debugging Journey
**Difficulty**: Intermediate
**Prerequisites**: Docker, Node.js, basic networking
**Target Audience**: Backend devs, DevOps engineers
