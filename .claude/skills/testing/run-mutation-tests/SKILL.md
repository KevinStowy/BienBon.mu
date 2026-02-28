---
name: run-mutation-tests
description: Lance Stryker mutation testing sur les modules critiques
argument-hint: <module-path>
---

# Run Mutation Tests

Lance Stryker sur `$ARGUMENTS` pour valider que les tests détectent les vrais bugs (ADR-023).

## Pourquoi le mutation testing

La couverture de code ne garantit pas que les tests sont utiles. Un test peut exécuter 100% du code sans vérifier aucun résultat. Le mutation testing modifie le code source et vérifie que les tests échouent.

**Score cible : > 80%** sur les modules critiques.

## Étape 1 — Configurer Stryker

Fichier : `stryker.config.mjs`

```javascript
export default {
  mutate: ['src/modules/<module>/domain/**/*.ts', 'src/modules/<module>/application/**/*.ts'],
  testRunner: 'vitest',
  reporters: ['clear-text', 'html'],
  coverageAnalysis: 'perTest',
  thresholds: {
    high: 80,
    low: 60,
    break: 50,
  },
};
```

## Étape 2 — Lancer

```bash
npx stryker run --mutate 'src/modules/<module>/**/*.ts'
```

## Étape 3 — Analyser les survivants

Les **mutants survivants** sont des modifications que les tests n'ont pas détectées. Pour chaque survivant :

1. **Comprendre la mutation** : quel opérateur/valeur a été changé ?
2. **Évaluer le risque** : est-ce un vrai bug potentiel ?
3. **Écrire le test manquant** ou justifier pourquoi c'est acceptable

### Mutations courantes à surveiller

- `>` → `>=` (off-by-one)
- `&&` → `||` (logique inversée)
- `return value` → `return undefined` (valeur manquante)
- `if (condition)` → `if (true)` (guard désactivé)
- `array.length > 0` → `array.length >= 0` (toujours vrai)

## Étape 4 — Rapport

```markdown
## Mutation Testing — <module>

- **Mutants totaux** : 150
- **Tués** : 128 (85%)
- **Survivants** : 12 (8%)
- **Timeout** : 10 (7%)
- **Score** : 85% ✅ (seuil : 80%)

### Survivants critiques
1. `reservation.ts:42` — `stock > 0` → `stock >= 0` — **Écrire test stock=0**
2. `commission.ts:18` — `rate / 100` → `rate / 10` — **Écrire test property-based**
```

## Modules obligatoires

- `ordering` (state machine réservation, stock)
- `payment` (ledger, commissions, webhooks)
- `catalog` (prix, stock, créneaux)
- `identity-access` (auth, RBAC)
- `fraud` (règles de détection)

## Validation

- [ ] Stryker configuré et lancé
- [ ] Score > 80% sur les modules critiques
- [ ] Survivants analysés et traités
- [ ] Tests manquants écrits pour les survivants critiques
