# [EPIC-XXX] US-YYY: {Task Name}

**Data**: YYYY-MM-DD  
**Durata stimata**: X ore  
**Status**: 🔴 Not Started  
**Commit SHA**: N/A

---

## Obiettivo

{Descrizione task atomico - 1-2 frasi}

## Acceptance Criteria (Gherkin)

```gherkin
Feature: {Feature name}

  Scenario: {Nome scenario}
    Given {precondizione}
    When {azione}
    Then {risultato atteso}
```

## Pre-requisiti

- [ ] {Cosa serve prima di iniziare}
- [ ] {Dipendenze, file, conoscenze}

## Step-by-Step (TDD Red-Green-Refactor)

### 1. RED - Scrivi test che fallisce

```bash
# Comando per vedere test fallire
npm run test:unit
```

**Output atteso**: `FAIL: Expected X but got Y`

### 2. GREEN - Implementa soluzione minima

**File da creare/modificare**:

- `path/to/file.ts`

**Codice**:

```typescript
// Implementazione minima
```

**Verifica**:

```bash
npm run test:unit
# PASS
```

### 3. REFACTOR - Migliora codice

**Cosa migliorare**:

- Naming
- Duplicazione
- Complessità

**Verifica finale**:

```bash
npm run quality:fix
npm run test:unit
```

## Problemi Incontrati

- [ ] {Problema 1}: {Soluzione}

## Commit Message

```
{type}({scope}): {subject}

{body}

{footer}
```

Esempio:

```
feat(test): add jest preset for shared config

- Created jest.preset.cjs with TypeScript + ESM support
- Root jest.config.cjs extends preset

Refs: EPIC-014, US-050
```

## Lessons Learned

- {Cosa ho imparato}
- {Pattern riutilizzabili}

## Next Steps

- [ ] {Prossimo task nella sequenza}

---

**Completed**: N/A  
**Next Scenario**: [Next task](./YYYY-MM-DD-next.md)
