---
name: check-phantom-packages
description: Détecte les packages npm hallucinés par l'IA (supply chain)
argument-hint: [package.json path]
---

# Check Phantom Packages

Vérifie que tous les packages npm dans `$ARGUMENTS` existent réellement (ADR-026).

## Contexte

Les LLM peuvent halluciner des noms de packages npm qui n'existent pas. Ces noms peuvent être squattés par des acteurs malveillants (supply chain attack). C'est un risque réel : des chercheurs ont trouvé que 5.2% des packages suggérés par ChatGPT n'existent pas sur npm.

## Étape 1 — Extraire les dépendances

Lire `package.json` et lister tous les packages dans `dependencies` et `devDependencies`.

## Étape 2 — Vérifier chaque package

Pour chaque package :

```bash
npm view <package-name> version 2>/dev/null
```

Si la commande échoue → **package fantôme détecté** 🔴

## Étape 3 — Vérifications supplémentaires

Pour les packages qui existent, vérifier :

1. **Téléchargements hebdomadaires** > 1000 (sinon suspect)
   ```bash
   npm view <package-name> --json | jq '.time'
   ```

2. **Pas de typosquatting** : le nom ressemble-t-il à un package populaire ?
   - `lodahs` vs `lodash`
   - `expres` vs `express`

3. **Repository GitHub actif** : le package a-t-il un repo avec des commits récents ?

## Étape 4 — Rapport

```markdown
## Phantom Package Check

### ✅ Packages vérifiés (X/Y)
Tous les packages existent sur npm.

### 🔴 Packages fantômes détectés
- `package-name` — N'existe pas sur npm. Probablement halluciné par l'IA.
  → Trouver le vrai package ou implémenter manuellement.

### ⚠️ Packages suspects
- `package-name` — Existe mais < 100 téléchargements/semaine. Vérifier manuellement.
```

## Validation

- [ ] Tous les packages de package.json vérifiés
- [ ] Aucun package fantôme
- [ ] Aucun typosquatting détecté
