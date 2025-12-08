# Setup DX Stack - Quick Start

## 1. Install Dependencies

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

## 2. Initialize Husky

```bash
npx husky init
```

## 3. Add NPM Scripts

Copia gli script da DX-IMPLEMENTATION-GUIDE.md nel package.json:

- build, start, lint, format, test, analyze, security, verify, release

## 4. Update package.json

Aggiungi in package.json:

```json
{
  "lint-staged": {
    "*.{ts,js}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  },
  "engines": {
    "node": ">=20.8.0",
    "npm": ">=10.0.0"
  }
}
```

## 5. Verify Setup

```bash
npm run verify
npm run release:suggest
npm run analyze
```

## 6. First Commit

```bash
git add .
git commit -m "chore: setup DX stack (linting, testing, release automation)"
```

Vedi DX-IMPLEMENTATION-GUIDE.md per dettagli completi.
