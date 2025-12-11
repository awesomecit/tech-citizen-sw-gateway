# Release Notes v1.7.0

## 📋 Summary

This release includes improvements to code quality, documentation, and development workflow.

## 🚀 Features

- feat(test): improve coverage and complexity analysis (c3242d2)
- feat(test): implement self-contained test automation with parallel support (1a83107)
- feat(project): sincronizza versioning e aggiungi EPIC-011 Docker (511af26)

## 🐛 Bug Fixes

- fix(release): use test:cov instead of non-existent test:coverage:check (66f5dd4)
- fix(test): replace return with continue in bash case statement (392f8b6)
- fix(test): add idempotent infrastructure startup and fix E2E open handles (b21f389)
- fix(test): add complete environment isolation for test containers (1d02944)
- fix(test): add workspace package resolution to jest config (8ffb2ce)

## 📚 Documentation

- docs(test): add test infrastructure architecture documentation (1fc29eb)

## 🔧 Code Refactoring

## ⚡ Performance Improvements

## 🏗️ Build System

## 📊 Quality Metrics

### Code Complexity

- Cognitive Complexity: ≤ 10 ✅
- Cyclomatic Complexity: ≤ 10 ✅
- Function Length: ≤ 50 lines ✅
- Max Parameters: ≤ 4 ✅

### Test Coverage

- Lines: 70.27%
- Functions: 64.7%
- Branches: 64.58%
- Statements: 70.27%

## 🔍 Static Analysis

- ESLint violations: Static analysis data not available (run manually: npm run lint:check)
- SonarJS cognitive complexity issues: Run manually with npm run analyze:cognitive

## 🛠️ Development

### Requirements

- Node.js ≥ 18.x
- npm ≥ 9.x
- PostgreSQL ≥ 13.x (for full functionality)

### Installation

\`\`\`bash
npm install
npm run build
npm run test:all
\`\`\`

### Quality Checks

\`\`\`bash
npm run quality # Complete quality check
npm run analyze # Complexity analysis
npm run test:coverage:check # Test coverage
\`\`\`

## 🚨 Breaking Changes

- test(infra): add hybrid bash/Node test infrastructure with separated test suites (82ed48a)
- feat(test): implement self-contained test automation with parallel support (1a83107)

## 📝 Migration Guide

### From Previous Version

No special migration steps required for this release.

## 🤝 Contributors

- Antonio Cittadino

## 🔗 Links

- [Full Changelog](https://github.com/awesomecit/tech-citizen-sw-gateway/compare/v1.5.0...v1.7.0)
- [Issues](https://github.com/awesomecit/tech-citizen-sw-gateway/issues)
- [Documentation](./docs/)

---

**Full changelog**: https://github.com/awesomecit/tech-citizen-sw-gateway/compare/v1.5.0...v1.7.0
