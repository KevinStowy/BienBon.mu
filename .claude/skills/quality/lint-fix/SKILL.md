---
name: lint-fix
description: Auto-fix ESLint + rapport des violations non-fixables
argument-hint: [file-or-module-path]
---

# Lint Fix

Auto-fix les violations ESLint pour `$ARGUMENTS` et rapporte les violations non-fixables.

## Étape 1 — Auto-fix

```bash
npx eslint --fix $ARGUMENTS
```

## Étape 2 — Vérifier les violations restantes

```bash
npx eslint $ARGUMENTS
```

## Étape 3 — Pour chaque violation non-fixable

1. **Lire la règle** pour comprendre pourquoi
2. **Corriger manuellement** si c'est une vraie erreur
3. **Documenter** si c'est un faux positif (avec `// eslint-disable-next-line` + commentaire justificatif)

## Règles critiques (jamais désactivées)

- `@typescript-eslint/no-explicit-any` — Utiliser `unknown`
- `@typescript-eslint/no-unsafe-assignment` — Typer correctement
- `no-eval` — Jamais d'eval
- `react-hooks/rules-of-hooks` — Règles des hooks React
- `react-hooks/exhaustive-deps` — Dépendances des hooks

## Validation

- [ ] `npx eslint $ARGUMENTS` retourne 0 erreurs
- [ ] Aucun `eslint-disable` sans justification
- [ ] Pas de `any` introduit
