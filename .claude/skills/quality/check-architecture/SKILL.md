---
name: check-architecture
description: Valide les frontières de bounded contexts avec dependency-cruiser (ADR-024)
argument-hint: [module-path]
---

# Check Architecture

Valide les frontières de bounded contexts pour `$ARGUMENTS` (ADR-024).

## Étape 1 — Vérifier les imports inter-modules

Règle fondamentale : un bounded context ne doit JAMAIS importer directement depuis un autre BC.

```bash
# Vérifier avec dependency-cruiser
npx depcruise --config .dependency-cruiser.cjs src/modules/
```

## Étape 2 — Règles dependency-cruiser

```javascript
// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    {
      name: 'no-cross-bc-imports',
      comment: 'Bounded contexts must not import from each other directly',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/',
        pathNot: '$1', // Pas le même module
      },
    },
    {
      name: 'no-domain-framework-deps',
      comment: 'Domain layer must not depend on NestJS or Prisma',
      severity: 'error',
      from: { path: '/domain/' },
      to: { path: ['@nestjs', '@prisma'] },
    },
    {
      name: 'no-adapter-to-adapter',
      comment: 'Adapters must not depend on other adapters',
      severity: 'warn',
      from: { path: '/adapters/' },
      to: { path: '/adapters/' },
    },
  ],
};
```

## Étape 3 — Vérifications manuelles

Si dependency-cruiser n'est pas configuré, vérifier manuellement :

1. **Grep les imports cross-BC** :
   ```
   Dans src/modules/ordering/ → pas d'import de src/modules/payment/
   ```

2. **Vérifier la couche domaine** :
   ```
   Dans src/modules/*/domain/ → pas d'import @nestjs ou @prisma
   ```

3. **Vérifier les exports (index.ts)** :
   Chaque module ne doit exporter que son API publique (types, interfaces, events).

## Étape 4 — Communication légitime entre BCs

| Mécanisme | Quand |
|-----------|-------|
| Domain events (EventEmitter2) | Notifications asynchrones |
| Shared types (`@bienbon/shared-types`) | DTOs, enums partagés |
| Interface exportée dans index.ts | Query synchrone |

## Format du rapport

```markdown
## Architecture Check — <scope>

### Violations
- 🔴 `ordering/use-case.ts` imports `payment/service.ts` — use domain event instead
- 🟡 `catalog/domain/entity.ts` imports `@nestjs/common` — remove framework dep

### Statistiques
- Modules analysés : X
- Violations : X error, X warning
- Verdict : ✅ Clean | ❌ Violations found
```
