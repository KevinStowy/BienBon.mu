---
name: validate-pr
description: Pipeline complet de validation PR — lint + typecheck + tests + security + architecture
argument-hint: [branch-name]
---

# Validate PR

Pipeline complet de validation pour la PR `$ARGUMENTS`.

## Étape 1 — Lint

```bash
npm run lint
```

Doit être clean (0 erreurs, 0 warnings).

## Étape 2 — TypeScript check

```bash
npx tsc --noEmit
```

Doit compiler sans erreur.

## Étape 3 — Tests unitaires

```bash
npx vitest run
```

Tous les tests doivent passer.

## Étape 4 — Tests d'intégration

```bash
npx vitest run --project integration
```

Tous les tests d'intégration doivent passer.

## Étape 5 — Couverture

```bash
npx vitest run --coverage
```

Vérifier les seuils par module (ADR-023).

## Étape 6 — Security check

Invoquer le skill `/review-security` sur les fichiers modifiés.

Vérifier :
- `npm audit` clean
- Pas de secrets dans le diff
- Packages fantômes checké

## Étape 7 — Architecture check

Invoquer le skill `/check-architecture` sur les modules touchés.

Vérifier :
- Pas d'imports cross-BC
- Pas de dépendances framework dans le domaine

## Étape 8 — Build

```bash
npm run build
```

Le build doit réussir.

## Rapport final

```markdown
## PR Validation — <branch>

| Check | Status | Details |
|-------|--------|---------|
| Lint | ✅/❌ | X errors |
| TypeScript | ✅/❌ | X errors |
| Unit tests | ✅/❌ | X/Y passed |
| Integration tests | ✅/❌ | X/Y passed |
| Coverage | ✅/❌ | Lines: X%, Branches: X% |
| Security | ✅/❌ | X findings |
| Architecture | ✅/❌ | X violations |
| Build | ✅/❌ | |

### Verdict : ✅ Ready to merge | ❌ Issues found
```
