---
name: review-code
description: Checklist complète de review code — naming, patterns, DDD, SOLID, ADR compliance
argument-hint: [file-or-module-path]
---

# Review Code

Review de code pour `$ARGUMENTS` selon les standards BienBon (ADR-024, 026, 027).

## Checklist

### 1. Architecture & DDD (ADR-024)
- Pas d'import entre bounded contexts (sauf shared-types)
- Entités de domaine sans dépendances framework
- Ports dans le bon dossier (inbound/outbound)
- Communication inter-BC via events ou interfaces exportées

### 2. SOLID (ADR-027)
- **S**RP : 1 classe = 1 responsabilité
- **O**CP : extensible sans modification
- **L**SP : sous-types respectent les contrats
- **I**SP : interfaces spécifiques, pas de "god interface"
- **D**IP : dépendances vers abstractions

### 3. TypeScript
- Pas de `any` (utiliser `unknown`)
- Pas de `@ts-ignore`
- Types explicites sur les exports
- Discriminated unions > types optionnels
- Enums > string literals pour les statuts métier

### 4. Naming (ubiquitous language)
- PascalCase types/classes, camelCase fonctions/variables
- Noms alignés avec le domaine (Basket, Store, Reservation)
- Pas d'abréviations (sauf conventionnelles : id, url, api)

### 5. Error handling
- Erreurs typées (pas de `new Error('...')` générique)
- Codes d'erreur pour les erreurs métier
- Messages traduisibles (i18n keys)

### 6. Performance
- Pas de N+1 (Prisma `include`/`select`)
- `Promise.all` pour les opérations parallèles
- Pas de re-renders inutiles (React)

### 7. Sécurité
- Input validation sur les endpoints
- Guards auth/RBAC en place
- Pas de secrets hardcodés

### 8. Tests
- Tests présents et significatifs
- Edge cases couverts
- Pas de tests miroir

## Format du rapport

Sévérités : 🔴 Critical | 🟡 Warning | 🔵 Suggestion

```
## Review — <scope>
### Findings
- **[ARCH-001]** 🔴 fichier:ligne — Description → Recommandation
- **[TYPE-002]** 🟡 fichier:ligne — Description → Recommandation
### Verdict : ✅ Approve | ⚠️ Changes requested | ❌ Block
```
