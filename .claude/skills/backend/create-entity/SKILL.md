---
name: create-entity
description: Crée une entité de domaine avec validation Zod + type Prisma
argument-hint: <EntityName> in <module-name>
---

# Create Entity

Crée une entité de domaine `$ARGUMENTS` avec validation Zod.

## Étape 1 — Créer le schema Zod

Fichier : `src/modules/<module>/domain/entities/<entity-name>.ts`

```typescript
import { z } from 'zod';

export const <EntityName>Schema = z.object({
  id: z.string().uuid(),
  // ... champs métier
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type <EntityName> = z.infer<typeof <EntityName>Schema>;
```

## Étape 2 — Créer la factory function

```typescript
export function create<EntityName>(input: Omit<<EntityName>, 'id' | 'createdAt' | 'updatedAt'>): <EntityName> {
  return <EntityName>Schema.parse({
    id: generateUuidV7(),
    ...input,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
```

## Étape 3 — Ajouter les invariants métier

Les règles métier doivent être dans le schema Zod (`.refine()`) ou dans des fonctions séparées dans `domain/rules/`.

```typescript
export const <EntityName>Schema = z.object({
  // ...
}).refine(
  (data) => data.pickupEnd > data.pickupStart,
  { message: 'Pickup end must be after pickup start' }
);
```

## Étape 4 — Vérifier la correspondance Prisma

S'assurer que le model Prisma dans `schema.prisma` correspond aux champs de l'entité. L'entité domaine peut être un sous-ensemble du model Prisma.

## Étape 5 — Écrire les tests

Fichier : `src/modules/<module>/__tests__/unit/<entity-name>.spec.ts`

Tester :
- Création valide avec la factory
- Rejet des inputs invalides (chaque champ)
- Invariants métier (refine rules)
- Edge cases (valeurs limites, null, undefined)

## Conventions

- Nom de fichier : `kebab-case.ts` (ex: `pickup-slot.ts`)
- Type exporté : `PascalCase` (ex: `PickupSlot`)
- Schema exporté : `PascalCaseSchema` (ex: `PickupSlotSchema`)
- Factory : `createPascalCase` (ex: `createPickupSlot`)
- Pas de dépendance framework (NestJS, Prisma) dans le domaine

## Validation

- [ ] Le schema Zod parse des inputs valides
- [ ] Le schema rejette des inputs invalides
- [ ] Les invariants métier sont testés
- [ ] Pas d'import NestJS ou Prisma dans le fichier
- [ ] Tests passent
