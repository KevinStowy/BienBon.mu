---
name: check-coverage
description: Vérifie la couverture de code par module vs seuils ADR-023
argument-hint: [module-path]
---

# Check Coverage

Vérifie la couverture de code pour `$ARGUMENTS` vs les seuils ADR-023.

## Seuils par type de module

| Type | Lines | Branches | Functions |
|------|-------|----------|-----------|
| **Critique** (ordering, payment, catalog) | 90% | 85% | 90% |
| **Standard** (partner, review-claims, fraud) | 80% | 75% | 80% |
| **CRUD simple** (favorites, notifications, media) | 70% | 65% | 70% |

## Étape 1 — Lancer la couverture

```bash
npx vitest run --coverage --reporter=json --reporter=text src/modules/<module>/
```

## Étape 2 — Analyser les résultats

Vérifier :
- **Lines** : pourcentage de lignes exécutées
- **Branches** : pourcentage de branches (if/else, switch) testées
- **Functions** : pourcentage de fonctions appelées
- **Uncovered lines** : identifier les lignes non couvertes

## Étape 3 — Identifier les lacunes

Pour chaque fichier sous le seuil :
1. Identifier les lignes non couvertes
2. Déterminer si c'est un edge case manquant, un chemin d'erreur, ou du dead code
3. Écrire les tests manquants ou supprimer le dead code

## Étape 4 — Rapport

```markdown
## Coverage Report — <module>

| Fichier | Lines | Branches | Functions | Status |
|---------|-------|----------|-----------|--------|
| entity.ts | 95% | 90% | 100% | ✅ |
| use-case.ts | 82% | 78% | 85% | ✅ |
| controller.ts | 65% | 60% | 70% | ❌ |

### Lignes non couvertes
- `use-case.ts:45-52` — Error handling branch for network timeout
- `controller.ts:30-35` — Rate limit exceeded path

### Verdict : ⚠️ controller.ts sous le seuil (65% < 80%)
```

## Validation

- [ ] Coverage calculée pour le module
- [ ] Comparaison avec les seuils ADR-023
- [ ] Lacunes identifiées avec lignes précises
- [ ] Rapport produit
