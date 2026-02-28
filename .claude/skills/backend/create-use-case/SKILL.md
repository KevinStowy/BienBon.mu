---
name: create-use-case
description: Crée un use case applicatif avec DTOs input/output
argument-hint: <UseCaseName> in <module-name>
---

# Create Use Case

Crée un use case `$ARGUMENTS` dans la couche application.

## Étape 1 — Créer l'interface (port inbound)

Fichier : `src/modules/<module>/ports/inbound/i-<use-case-name>.ts`

```typescript
export interface I<UseCaseName> {
  execute(input: <UseCaseName>Input): Promise<<UseCaseName>Output>;
}
```

## Étape 2 — Créer les DTOs

Fichier : `src/modules/<module>/application/dtos/<use-case-name>.dto.ts`

```typescript
import { z } from 'zod';

export const <UseCaseName>InputSchema = z.object({
  // Champs d'entrée validés
});
export type <UseCaseName>Input = z.infer<typeof <UseCaseName>InputSchema>;

export const <UseCaseName>OutputSchema = z.object({
  // Champs de sortie
});
export type <UseCaseName>Output = z.infer<typeof <UseCaseName>OutputSchema>;
```

## Étape 3 — Créer le use case

Fichier : `src/modules/<module>/application/use-cases/<use-case-name>.use-case.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class <UseCaseName>UseCase implements I<UseCaseName> {
  constructor(
    @Inject('I<Entity>Repository')
    private readonly repository: I<Entity>Repository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: <UseCaseName>Input): Promise<<UseCaseName>Output> {
    // 1. Valider l'input
    const validated = <UseCaseName>InputSchema.parse(input);

    // 2. Exécuter la logique métier
    // ...

    // 3. Émettre les domain events
    this.eventEmitter.emit('<module>.<event-name>', payload);

    // 4. Retourner l'output
    return output;
  }
}
```

## Étape 4 — Enregistrer dans le module

Ajouter le use case dans `providers` du module.

## Étape 5 — Tests unitaires

Fichier : `src/modules/<module>/__tests__/unit/<use-case-name>.spec.ts`

- Mock des repositories (ports outbound)
- Tester le cas nominal
- Tester les validations d'input
- Tester les erreurs métier
- Tester les domain events émis
- Tester les edge cases

## Principes

- **SRP** : un use case = une action métier
- **Pas de logique dans le controller** : le controller délègue au use case
- **Domain events** : émettre pour toute mutation significative
- Le use case ne connaît que les ports (interfaces), jamais les adapters

## Validation

- [ ] Le use case est injectable via NestJS DI
- [ ] L'input est validé par Zod
- [ ] La logique métier est testée
- [ ] Les domain events sont émis
- [ ] Les tests passent avec mocks des ports
