# Developer Experience Implementation Guide

> **Purpose**: Replicate Tech-citizen-sw-gateway DX stack on new projects  
> **Last Updated**: 2025-12-08  
> **Estimated Setup Time**: 2-3 hours

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Core Dependencies](#core-dependencies)
4. [Configuration Files](#configuration-files)
5. [Scripts Implementation](#scripts-implementation)
6. [Git Hooks Setup](#git-hooks-setup)
7. [NPM Scripts](#npm-scripts)
8. [Testing Infrastructure](#testing-infrastructure)
9. [Verification & Troubleshooting](#verification--troubleshooting)
10. [Known Issues & Solutions](#known-issues--solutions)

---

## Overview

This stack provides:

- ✅ **Semantic versioning automation** (auto-release with rollback)
- ✅ **Code quality enforcement** (ESLint + SonarJS + Prettier)
- ✅ **Security scanning** (secrets detection, dependency audit)
- ✅ **Multi-layer testing** (unit/integration/e2e with safety guards)
- ✅ **Git hooks** (commitlint, lint-staged, pre-push)
- ✅ **Complexity analysis** (cognitive/cyclomatic metrics)
- ✅ **AI-assisted development** (context preparation scripts)

---

## Prerequisites

**Required:**

- Node.js >= 20.8.0
- npm >= 10.0.0
- Git >= 2.30

**Verify:**

```bash
node -v    # Should show v20.8.0 or higher
npm -v     # Should show 10.0.0 or higher
git --version
```

---

## Core Dependencies

### 1. Install Dev Dependencies

```bash
npm install --save-dev \
  @commitlint/cli@^19.8.1 \
  @commitlint/config-conventional@^19.8.1 \
  @eslint/js@^9.30.0 \
  eslint@^8.57.1 \
  eslint-config-prettier@^10.0.1 \
  eslint-plugin-prettier@^5.2.2 \
  eslint-plugin-sonarjs@^0.25.1 \
  typescript-eslint@^8.35.1 \
  prettier@^3.4.2 \
  husky@^9.1.7 \
  lint-staged@^16.1.2 \
  jest@^29.7.0 \
  ts-jest@^29.2.5 \
  @types/jest@^29.5.14
```

### 2. Update package.json Engines

```json
{
  "engines": {
    "node": ">=20.8.0",
    "npm": ">=10.0.0"
  }
}
```

---

## Configuration Files

### 1. ESLint Configuration (`eslint.config.mjs`)

**CRITICAL**: Copy exactly from Tech-citizen-sw-gateway to avoid SonarJS issues.

<details>
<summary>Click to expand full eslint.config.mjs</summary>

```javascript
// @ts-check
// eslint.config.mjs - Configurazione bilanciata (meno warning, focus su cognitive complexity)

import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Files to ignore
  {
    ignores: [
      'eslint.config.mjs',
      'commitlint.config.js',
      'scripts/**/*.js',
      'dist/**/*',
      'node_modules/**/*',
      'coverage/**/*',
      'reports/**/*',
      'reference/**/*',
      '*.config.js',
      '**/*.spec.ts',
      '**/*.test.ts',
      'test/**/*.ts',
      'test/**/*.js',
    ],
  },

  // Base configurations
  ...tseslint.configs.recommended,

  // SonarJS configuration - Focus su cognitive complexity
  {
    plugins: {
      sonarjs,
    },
    rules: {
      // 🧠 COGNITIVE COMPLEXITY - Clean Code Focus!
      'sonarjs/cognitive-complexity': ['error', 10],

      // 🔄 COMPLEXITY - Soglie restrittive per clean code
      complexity: ['error', { max: 10 }],
      'max-lines-per-function': [
        'error',
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['error', { max: 4 }],
      'max-depth': ['error', { max: 3 }],
      'max-nested-callbacks': ['error', { max: 3 }],
      'max-statements': ['error', { max: 20 }],
      'max-statements-per-line': ['error', { max: 1 }],

      // 🎯 SONARJS - Clean Code Rules
      'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/prefer-immediate-return': 'error',
      'sonarjs/prefer-single-boolean-return': 'error',
      'sonarjs/no-small-switch': 'error',
      'sonarjs/no-nested-template-literals': 'error',
      'sonarjs/no-redundant-jump': 'error',
      'sonarjs/no-same-line-conditional': 'error',
      'sonarjs/no-useless-catch': 'error',

      // 🎯 TYPESCRIPT (più permissivo per NestJS)
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // 🏗️ CODE QUALITY
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'off',
      'no-debugger': 'error',

      // 🚫 DISABLE per NestJS
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  // Language options
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },

  // Prettier (ultimo per evitare conflitti)
  eslintPluginPrettierRecommended,
);
```

</details>

### 2. Prettier Configuration (`.prettierrc`)

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 80,
  "endOfLine": "lf",
  "arrowParens": "avoid"
}
```

### 3. Commitlint Configuration (`commitlint.config.js`)

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'subject-max-length': [2, 'always', 72],
  },
};
```

### 4. Jest Configurations

**jest.config.js** (Unit Tests):

```javascript
module.exports = {
  displayName: 'Unit Tests',
  testEnvironment: 'node',
  maxWorkers: '50%',
  testTimeout: 5000,
  detectOpenHandles: true,
  forceExit: false,
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.integration\\.spec\\.ts$',
    '\\.e2e\\.spec\\.ts$',
  ],
  preset: 'ts-jest',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
};
```

**jest.integration.config.js**:

```javascript
module.exports = {
  displayName: 'Integration Tests',
  testEnvironment: 'node',
  maxWorkers: 1,
  testTimeout: 30000,
  testMatch: ['<rootDir>/test/**/*.integration.spec.ts'],
  preset: 'ts-jest',
};
```

**jest.e2e.config.js**:

```javascript
module.exports = {
  displayName: 'E2E Tests',
  testEnvironment: 'node',
  maxWorkers: 1,
  testTimeout: 60000,
  testMatch: ['<rootDir>/test/**/*.e2e.spec.ts'],
  preset: 'ts-jest',
};
```

### 5. TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### 6. Husky Configuration (`.husky-config.json`)

**IMPORTANT**: This file controls git hooks behavior.

```json
{
  "$schema": "https://json-schema.org/draft-07/schema",
  "description": "Husky git hooks configuration",
  "enabled": true,
  "hooks": {
    "commit-msg": {
      "enabled": true,
      "validator": "commitlint"
    },
    "pre-commit": {
      "enabled": true,
      "runLintStaged": true,
      "runTests": false
    },
    "pre-push": {
      "enabled": true,
      "runBuild": true,
      "runTests": false,
      "autoRelease": true
    }
  }
}
```

### 7. Release Configuration (`.release-config.json`)

**CRITICAL**: Review `_advisory` field before enabling autoRelease.

```json
{
  "$schema": "https://json-schema.org/draft-07/schema",
  "description": "Release automation configuration",
  "_advisory": "Auto-release bypasses pre-push tests. Ensure CI/CD tests are configured before enabling!",
  "enabled": true,
  "branches": {
    "main": {
      "autoRelease": true,
      "releaseType": "auto",
      "runBuild": true,
      "pushTag": true
    }
  },
  "versioning": {
    "strategy": "semver",
    "syncLockFile": true
  },
  "git": {
    "tagPrefix": "v",
    "remoteName": "origin"
  }
}
```

### 8. lint-staged Configuration (in package.json)

```json
{
  "lint-staged": {
    "*.{ts,js}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

---

## Scripts Implementation

### Create `scripts/` Directory

```bash
mkdir -p scripts
```

### 1. Auto-Release Script (`scripts/auto-release.js`)

**Source**: Copy from `/home/antoniocittadino/MyRepos/tech-citizen-sw-gateway/scripts/auto-release.js`

**Key Features**:

- ✅ Semantic version calculation from commit history
- ✅ CHANGELOG.md generation
- ✅ Rollback on failure
- ✅ Dry-run support
- ⚠️ **Known Issue**: Modifies files in dry-run mode (BUG-001 in BACKLOG.md)

**Usage**:

```bash
npm run release:suggest  # Preview changes
npm run release          # Execute release
```

### 2. Complexity Analyzer (`scripts/analyze-complexity.js`)

**Source**: Copy from `/home/antoniocittadino/MyRepos/tech-citizen-sw-gateway/scripts/analyze-complexity.js`

**Usage**:

```bash
npm run analyze                # All checks
npm run analyze:cognitive      # Cognitive complexity only
npm run analyze:json           # JSON output
```

### 3. Secret Scanner (`scripts/check-secrets.js`)

**Source**: Copy from `/home/antoniocittadino/MyRepos/tech-citizen-sw-gateway/scripts/check-secrets.js`

**Prevents Commits With**:

- API keys (AWS, GitHub, Stripe)
- Private keys (RSA, PGP)
- JWT tokens
- Database credentials
- Hardcoded passwords

**Usage**:

```bash
npm run security:check    # Scan staged files
```

### 4. Test Environment Guard (`scripts/test-env-guard.sh`)

**Purpose**: Prevents running integration/e2e tests on production databases.

**Source**: Copy from `/home/antoniocittadino/MyRepos/tech-citizen-sw-gateway/scripts/test-env-guard.sh`

**Safety Checks**:

- ✅ `NODE_ENV=test` required
- ✅ Database name must NOT contain "prod", "production", "live"
- ✅ Loads `.env.test` automatically

**Usage**:

```bash
npm run test:integration:safe
npm run test:e2e:safe
```

### 5. AI Context Preparation (`scripts/prepare-copilot-context.sh`)

**Purpose**: Generate compact context file (~500-1000 tokens) for Copilot sessions.

**Source**: Copy from `/home/antoniocittadino/MyRepos/tech-citizen-sw-gateway/scripts/prepare-copilot-context.sh`

**Output**: `/tmp/copilot-context-YYYYMMDD-HHMMSS.md`

**Usage**:

```bash
./scripts/prepare-copilot-context.sh
# Copy output file content to Copilot chat
```

### 6. End-of-Day Debrief (`scripts/end-of-day-debrief.sh`)

**Purpose**: Generate development session report with metrics.

**Source**: Copy from `/home/antoniocittadino/MyRepos/tech-citizen-sw-gateway/scripts/end-of-day-debrief.sh`

**Generates**:

- Commit breakdown by type
- Code hotspots (most changed files)
- Quality gates report
- Complexity analysis
- Test coverage summary

**Usage**:

```bash
./scripts/end-of-day-debrief.sh
# Output: docs/dev/debrief-YYYYMMDD.md
```

---

## Git Hooks Setup

### 1. Initialize Husky

```bash
npm install --save-dev husky
npx husky init
```

### 2. Create Pre-Commit Hook (`.husky/pre-commit`)

**Source**: Copy from `/home/antoniocittadino/MyRepos/tech-citizen-sw-gateway/.husky/pre-commit`

**What it does**:

- Runs `lint-staged` (format + lint staged files)
- Runs `check-secrets.js`
- Configurable via `.husky-config.json`

### 3. Create Commit-Msg Hook (`.husky/commit-msg`)

```bash
#!/bin/sh
echo "🔍 Validating commit message format..."
npx --no-install commitlint --edit "$1"
```

Make executable:

```bash
chmod +x .husky/commit-msg
```

### 4. Create Pre-Push Hook (`.husky/pre-push`)

**Source**: Copy from `/home/antoniocittadino/MyRepos/tech-citizen-sw-gateway/.husky/pre-push`

**Features**:

- Optional build verification
- Optional test execution
- Auto-release trigger (main/master only)
- Configurable per branch

---

## NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",

    "lint": "eslint \"{src,test}/**/*.ts\" --fix",
    "lint:check": "eslint \"{src,test}/**/*.ts\"",

    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\" \"*.json\" \"*.md\"",
    "format:check": "prettier --check \"src/**/*.ts\" \"test/**/*.ts\" \"*.json\" \"*.md\"",

    "quality": "npm run format:check && npm run lint:check",
    "quality:fix": "npm run format && npm run lint",

    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:integration": "jest --config ./jest.integration.config.js",
    "test:integration:safe": "bash scripts/test-env-guard.sh integration",
    "test:e2e": "jest --config ./jest.e2e.config.js",
    "test:e2e:safe": "bash scripts/test-env-guard.sh e2e",

    "analyze": "node scripts/analyze-complexity.js --type=all",
    "analyze:cognitive": "node scripts/analyze-complexity.js --type=cognitive",
    "analyze:json": "node scripts/analyze-complexity.js --type=all --json",

    "security:check": "node scripts/check-secrets.js",
    "security:scan": "npm audit --audit-level=moderate",

    "verify": "npm run format:check && npm run lint:check && npm run test && npm run build",
    "verify:full": "npm run verify && npm run test:cov",

    "release": "node scripts/auto-release.js --type=\"auto\"",
    "release:suggest": "node scripts/auto-release.js --type=\"auto\" --dry-run",
    "release:minor": "node scripts/auto-release.js --type=\"minor\"",
    "release:major": "node scripts/auto-release.js --type=\"major\"",

    "prepare": "husky",
    "pre-commit": "lint-staged"
  }
}
```

---

## Testing Infrastructure

### 1. Create Test Directory Structure

```bash
mkdir -p test
touch test/setup.integration.ts
```

### 2. Environment Files

**`.env.test`** (for integration/e2e tests):

```bash
NODE_ENV=test
DATABASE_NAME=myapp_test
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
```

**`.env.example`** (template for developers):

```bash
NODE_ENV=development
DATABASE_NAME=myapp_dev
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password_here
```

### 3. Safety Guard Configuration

Edit `scripts/test-env-guard.sh` to match your database naming:

```bash
# Line 44-51: Customize safe database patterns
case "$DATABASE_NAME" in
    *test*|*dev*|*local*)
        echo "✅ Database name looks safe: $DATABASE_NAME"
        ;;
    *prod*|*production*|*live*)
        echo "❌ DANGER! Database name suggests production: $DATABASE_NAME"
        exit 1
        ;;
esac
```

---

## Verification & Troubleshooting

### 1. Verify Installation

```bash
# Test all quality gates
npm run verify

# Test git hooks
git commit --allow-empty -m "test: verify commit-msg hook"

# Test release (dry-run)
npm run release:suggest

# Test complexity analysis
npm run analyze
```

### 2. Common Issues

**Problem**: ESLint fails with "Cannot find module 'typescript-eslint'"

**Solution**:

```bash
npm install --save-dev typescript-eslint@^8.35.1
```

**Problem**: Husky hooks not running

**Solution**:

```bash
npm run prepare
chmod +x .husky/*
```

**Problem**: commitlint fails on valid commit

**Solution**: Check scopes in `commitlint.config.js` match your project modules.

**Problem**: Pre-push hook blocks legitimate push

**Solution**: Temporarily disable in `.husky-config.json`:

```json
{
  "hooks": {
    "pre-push": {
      "enabled": false
    }
  }
}
```

**Problem**: Tests timeout on CI

**Solution**: Increase timeout in jest configs:

```javascript
testTimeout: 30000; // 30 seconds
```

---

## Known Issues & Solutions

### BUG-001: Dry-Run Modifies Files

**Status**: Documented in Tech-citizen-sw-gateway BACKLOG.md

**Issue**: `npm run release:suggest` modifies `package.json` and `package-lock.json` even in dry-run mode.

**Workaround**:

```bash
# After dry-run, restore files
git restore package.json package-lock.json
```

**Root Cause**: `auto-release.js` calls external script `generate-release-notes.sh` which doesn't respect `--dry-run` flag.

**Fix**: Modify `auto-release.js` line ~700-750 to pass `dryRun` flag to external scripts.

### Security: Auto-Release Bypasses Pre-Push Tests

**Warning**: By default, `auto-release.js` sets `SKIP_PRE_PUSH_HOOK=true` to avoid circular dependency.

**Recommendation**:

1. ✅ Enable CI/CD pipeline with full test suite
2. ✅ Only run releases from `main` branch
3. ⚠️ Never release from feature branches

### TypeScript Project Compatibility

**NestJS Projects**: Fully compatible (tested)

**Express Projects**: Modify `eslint.config.mjs`:

- Remove NestJS-specific ignores
- Adjust `@typescript-eslint` rules

**React/Next.js**: Add React plugin:

```bash
npm install --save-dev eslint-plugin-react
```

---

## Migration Checklist

- [ ] Install all dev dependencies
- [ ] Copy all configuration files (eslint, prettier, jest, tsconfig)
- [ ] Copy `.husky-config.json` and `.release-config.json`
- [ ] Copy all scripts from `scripts/` directory
- [ ] Initialize Husky (`npx husky init`)
- [ ] Copy git hooks (`.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push`)
- [ ] Make scripts executable (`chmod +x scripts/*.sh .husky/*`)
- [ ] Add NPM scripts to `package.json`
- [ ] Create test directory structure
- [ ] Create `.env.test` and `.env.example`
- [ ] Run `npm run verify` to test setup
- [ ] Test release with `npm run release:suggest`
- [ ] Update `.gitignore` (add `coverage/`, `reports/`, `docs/dev/`)
- [ ] Create `CONTRIBUTING.md` (copy from Tech-citizen-sw-gateway)
- [ ] Test all git hooks with dummy commits

---

## Post-Setup Recommendations

### 1. CI/CD Integration (High Priority)

**GitHub Actions** (`.github/workflows/ci.yml`):

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run verify:full
      - run: npm run analyze:json
```

### 2. Dependency Updates

**Renovate** (`.github/renovate.json`):

```json
{
  "extends": ["config:base"],
  "schedule": ["every weekend"],
  "automerge": true,
  "automergeType": "pr",
  "packageRules": [
    {
      "matchUpdateTypes": ["patch", "minor"],
      "automerge": true
    }
  ]
}
```

### 3. Documentation

**Copy from Tech-citizen-sw-gateway**:

- `CONTRIBUTING.md` (development workflow)
- `SECURITY.md` (vulnerability reporting)
- `docs/QUICKSTART.md` (15-minute onboarding)

---

## Support & References

**Original Project**: [Tech-citizen-sw-gateway](https://github.com/your-org/tech-citizen-sw-gateway)

**Key Files to Reference**:

- `eslint.config.mjs` - ESLint + SonarJS configuration
- `scripts/auto-release.js` - Release automation (981 lines)
- `scripts/analyze-complexity.js` - Complexity analysis
- `.husky-config.json` - Git hooks control
- `CONTRIBUTING.md` - Complete workflow documentation

**Community**:

- GitHub Issues: Report bugs in implementation
- Discussions: Share improvements to this guide

---

**Last Updated**: 2025-12-08  
**Tested On**: Node v20.8.0, npm 10.0.0, NestJS 11.x  
**License**: MIT (adapt to your project)

---

## Quick Start Commands

```bash
# 1. Copy this guide to new project root
cp DX-IMPLEMENTATION-GUIDE.md /path/to/new-project/

# 2. Install dependencies
cd /path/to/new-project
npm install --save-dev [see Core Dependencies section]

# 3. Copy configuration files
cp tech-citizen-sw-gateway/eslint.config.mjs .
cp tech-citizen-sw-gateway/.prettierrc .
cp tech-citizen-sw-gateway/commitlint.config.js .
cp tech-citizen-sw-gateway/jest.config.js .
cp tech-citizen-sw-gateway/.husky-config.json .
cp tech-citizen-sw-gateway/.release-config.json .

# 4. Copy scripts
cp -r tech-citizen-sw-gateway/scripts/* scripts/
chmod +x scripts/*.sh

# 5. Initialize Husky
npx husky init
cp tech-citizen-sw-gateway/.husky/pre-commit .husky/
cp tech-citizen-sw-gateway/.husky/commit-msg .husky/
cp tech-citizen-sw-gateway/.husky/pre-push .husky/
chmod +x .husky/*

# 6. Verify setup
npm run verify
npm run release:suggest
npm run analyze

# 7. First commit with new hooks
git add .
git commit -m "chore: setup DX stack (linting, testing, release automation)"
```

**Estimated Time**: 2-3 hours including verification.

**Token Savings**: ~80% reduction in Copilot context preparation with `prepare-copilot-context.sh`.

---

**End of Guide**
