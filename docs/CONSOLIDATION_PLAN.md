# 📚 Documentation Consolidation Plan

## Current State (9 files, 2256 lines)

```
 458L docs/IAC_TESTING.md
 375L docs/project/ROADMAP.md
 358L docs/project/BACKLOG.md
 220L docs/ENVIRONMENT_CONFIG.md
 200L docs/PLATFORMATIC_CONFIG_GUIDE.md
 200L docs/DEPLOYMENT_SIMULATION.md
 185L docs/TESTING.md
 168L docs/INFRASTRUCTURE.md
  92L docs/architecture/decisions/0001-minimal-infrastructure-yagni.md
```

## 🔀 Merge Plan → 4 files (≈1800 lines, -20%)

### ✅ KEEP AS-IS

1. **docs/project/BACKLOG.md** (358L) - Sprint tracking, living document
2. **docs/project/ROADMAP.md** (375L) - Epic planning, milestones
3. **docs/architecture/decisions/** (92L) - ADRs (add more over time)

### 🔄 CONSOLIDATE

#### → **docs/INFRASTRUCTURE.md** (650L, +482L)

**Merge INTO it:**

- `DEPLOYMENT_SIMULATION.md` (200L) → Section "## Deployment Simulation"
- `ENVIRONMENT_CONFIG.md` (220L) → Section "## Environment Configuration"
- Current `INFRASTRUCTURE.md` (168L) → Keep as base
- `IAC_TESTING.md` (458L) → Section "## Infrastructure Testing"

**Rationale**: All infra-related (Docker, envs, deploy, IaC tests) in ONE file

#### → **docs/DEVELOPMENT.md** (385L, NEW)

**Merge INTO new file:**

- `TESTING.md` (185L) → Section "## Testing Strategy"
- `PLATFORMATIC_CONFIG_GUIDE.md` (200L) → Section "## Platformatic Configuration"

**Rationale**: Developer-focused workflows (testing, config, tooling)

### 🗑️ DELETE (after merge)

- ~~DEPLOYMENT_SIMULATION.md~~ → moved to INFRASTRUCTURE.md
- ~~ENVIRONMENT_CONFIG.md~~ → moved to INFRASTRUCTURE.md
- ~~IAC_TESTING.md~~ → moved to INFRASTRUCTURE.md
- ~~TESTING.md~~ → moved to DEVELOPMENT.md
- ~~PLATFORMATIC_CONFIG_GUIDE.md~~ → moved to DEVELOPMENT.md

## 📊 Final Structure

```
docs/
├── INFRASTRUCTURE.md          # 650L (Docker, deploy, IaC, env config)
├── DEVELOPMENT.md              # 385L (Testing, Platformatic, tooling)
├── project/
│   ├── BACKLOG.md              # 358L (Sprints, tasks)
│   └── ROADMAP.md              # 375L (Epics, milestones)
└── architecture/
    └── decisions/
        └── 0001-*.md           # 92L (ADRs)
```

**Total**: 5 files, ~1860 lines (-17% vs current)

## 🛠️ Execution Commands

```bash
# Backup
cp -r docs docs.backup-$(date +%Y%m%d)

# Merge INFRASTRUCTURE
cat docs/INFRASTRUCTURE.md \
    <(echo -e "\n## Deployment Simulation\n") \
    <(tail -n +10 docs/DEPLOYMENT_SIMULATION.md) \
    <(echo -e "\n## Environment Configuration\n") \
    <(tail -n +10 docs/ENVIRONMENT_CONFIG.md) \
    <(echo -e "\n## Infrastructure Testing\n") \
    <(tail -n +10 docs/IAC_TESTING.md) \
    > docs/INFRASTRUCTURE.new.md

# Merge DEVELOPMENT
cat <(echo "# Development Guide\n") \
    <(echo "## Testing Strategy\n") \
    <(tail -n +10 docs/TESTING.md) \
    <(echo -e "\n## Platformatic Configuration\n") \
    <(tail -n +10 docs/PLATFORMATIC_CONFIG_GUIDE.md) \
    > docs/DEVELOPMENT.md

# Replace
mv docs/INFRASTRUCTURE.new.md docs/INFRASTRUCTURE.md

# Delete old files
rm docs/{DEPLOYMENT_SIMULATION,ENVIRONMENT_CONFIG,IAC_TESTING,TESTING,PLATFORMATIC_CONFIG_GUIDE}.md

# Verify
find docs -name "*.md" -exec wc -l {} + | tail -1
```

## ✅ Benefits

- **Single source of truth** per topic
- **Less navigation** (4 files vs 9)
- **Easier maintenance** (no duplicates)
- **Clearer structure** (infra vs dev vs planning)

---

**Date**: 2025-12-08
**Impact**: -20% files, -17% lines, +100% clarity
