---
name: create-repository
description: Crée interface repository (port) + implémentation Prisma (adapter)
argument-hint: <EntityName> in <module-name>
---

# Create Repository

Crée le port (interface) et l'adapter (implémentation Prisma) pour `$ARGUMENTS`.

## Étape 1 — Créer l'interface (port outbound)

Fichier : `src/modules/<module>/ports/outbound/i-<entity-name>-repository.ts`

```typescript
import { <EntityName> } from '../../domain/entities/<entity-name>';

export interface I<EntityName>Repository {
  findById(id: string): Promise<<EntityName> | null>;
  findMany(filter: <EntityName>Filter): Promise<<EntityName>[]>;
  create(entity: <EntityName>): Promise<<EntityName>>;
  update(id: string, data: Partial<<EntityName>>): Promise<<EntityName>>;
  delete(id: string): Promise<void>;
}

export interface <EntityName>Filter {
  // Filtres spécifiques au domaine
}
```

## Étape 2 — Créer l'implémentation Prisma (adapter)

Fichier : `src/modules/<module>/adapters/outbound/<entity-name>-prisma.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/prisma/prisma.service';
import { I<EntityName>Repository } from '../../ports/outbound/i-<entity-name>-repository';

@Injectable()
export class <EntityName>PrismaRepository implements I<EntityName>Repository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const record = await this.prisma.<entityName>.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  // ... autres méthodes

  private toDomain(record: Prisma<EntityName>): <EntityName> {
    return <EntityName>Schema.parse(record);
  }
}
```

## Étape 3 — Enregistrer le provider NestJS

Dans le module :
```typescript
{
  provide: 'I<EntityName>Repository',
  useClass: <EntityName>PrismaRepository,
}
```

Dans les use cases, injecter via `@Inject('I<EntityName>Repository')`.

## Étape 4 — Tests

**Unit test** : mock de PrismaService pour tester le mapping toDomain.
**Integration test** : Testcontainers PostgreSQL pour tester les vraies queries.

## Conventions

- Interface préfixée par `I` : `IBasketRepository`
- Implémentation suffixée par le type d'adapter : `BasketPrismaRepository`
- Utiliser `select` Prisma pour ne charger que les champs nécessaires
- Toujours retourner l'entité de domaine (pas le type Prisma)

## Validation

- [ ] L'interface est dans `ports/outbound/`
- [ ] L'implémentation est dans `adapters/outbound/`
- [ ] Le mapping toDomain utilise le schema Zod
- [ ] Le provider est enregistré dans le module
- [ ] Tests unitaires + intégration passent
