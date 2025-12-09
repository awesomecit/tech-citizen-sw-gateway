# Git Workflow: Trunk-Based Development

## ✅ Scelta: **Trunk-Based Development**

### Rationale

- **Team size**: 1-2 devs → no overhead
- **Release frequency**: Continuous → no release branches
- **Complexity**: Low → YAGNI principle
- **CI/CD**: Fast feedback loops
- **XP methodology**: Continuous integration core practice

## 🌳 Workflow

```text
main (protected)
  ├─ feat/gateway-routes  ← 2-3 giorni max
  └─ fix/docker-binding   ← hotfix immediato
```

### Rules

1. **main** always deployable (protected)
2. **Feature branches** < 3 days lifespan
3. **Commit early**, push often
4. **CI must pass** before merge
5. **No develop branch** (YAGNI)

## 📝 Branch Naming

```bash
feat/short-description    # New features
fix/issue-description     # Bug fixes
chore/task-description    # Tooling, deps
docs/topic                # Documentation
```

## 🔄 Daily Flow

```bash
# Start day
git checkout main && git pull

# New feature
git checkout -b feat/health-metrics
# Work...
git add -A && git commit -m "feat(metrics): add Prometheus endpoint"
git push -u origin feat/health-metrics

# Create PR (or merge direct if solo)
gh pr create --fill
gh pr merge --squash --delete-branch
```

## 🚫 Rejected Alternatives

### ❌ Git Flow

- **Overkill**: 5 branch types (main/develop/feature/release/hotfix)
- **Overhead**: Merge ceremonies, long-lived branches
- **Mismatch**: Not for continuous delivery

### ❌ GitHub Flow

- **Almost**: Similar to trunk-based
- **Difference**: Requires PR reviews (solo dev = waste)
- **When**: Useful with 3+ devs + code review process

## 🛡️ Protection Rules

```bash
# main branch protections (when team grows)
- Require status checks (CI)
- Require linear history (squash/rebase)
- No force push
- No branch deletion
```

## 📊 Metrics Success

- **Lead time**: < 1 day (commit → production)
- **Deployment freq**: Multiple/day
- **MTTR**: < 1 hour
- **Change failure**: < 15%

---

**Decision**: Trunk-Based Development
**Effective**: 2025-12-08
**Review**: When team > 2 devs
