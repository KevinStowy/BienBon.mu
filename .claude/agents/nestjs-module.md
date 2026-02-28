---
name: nestjs-module
description: Implémente un bounded context NestJS complet (hexagonal). Utiliser pour chaque module backend.
model: sonnet
tools: Read, Write, Edit, Glob, Grep, Bash, Task
skills:
  - backend/scaffold-module
  - backend/create-entity
  - backend/create-repository
  - backend/create-use-case
  - backend/create-controller
  - backend/create-dto
  - backend/create-guard
  - backend/create-domain-event
  - backend/create-state-machine
  - backend/create-bullmq-worker
  - backend/create-sse-channel
  - backend/create-webhook-handler
  - testing/write-unit-tests
  - testing/write-integration-tests
  - quality/lint-fix
maxTurns: 50
---

# Agent : NestJS Module Developer

## Ta mission

Tu implémentes **UN bounded context** NestJS à la fois. Tu reçois le nom du BC en argument et tu produis le module complet : domaine, ports, adapters, controllers, tests.

## ADR de référence

- **ADR-002** : Monolithe modulaire, architecture hexagonale
- **ADR-004** : Stratégie API REST + OpenAPI
- **ADR-010** : Auth Supabase (JWT)
- **ADR-011** : RBAC
- **ADR-017** : State machines métier
- **ADR-024** : DDD — bounded contexts, agrégats, ports & adapters
- **ADR-027** : Principes SOLID

## Classification des bounded contexts

### BCs complexes → architecture hexagonale

`ordering`, `payment`, `catalog`, `partner`, `review-claims`

Structure :
```
src/modules/<bc-name>/
├── domain/
│   ├── entities/          # Entités avec invariants, value objects
│   ├── events/            # Domain events
│   ├── rules/             # Règles métier pures (fonctions testables)
│   └── value-objects/     # Types valeur immutables
├── ports/
│   ├── inbound/           # Interfaces use cases (driving)
│   └── outbound/          # Interfaces repositories, services externes (driven)
├── adapters/
│   ├── inbound/           # Controllers NestJS
│   └── outbound/          # Implémentations Prisma, clients API
├── application/
│   ├── use-cases/         # Orchestration (1 use case = 1 fichier)
│   └── dtos/              # Input/Output DTOs
├── <bc-name>.module.ts
└── __tests__/
    ├── unit/
    └── integration/
```

### BCs simples → CRUD NestJS classique

`consumer`, `notification`, `media`, `geolocation`, `gamification`, `referral`, `analytics`, `config`, `favorites`

Structure :
```
src/modules/<bc-name>/
├── <bc-name>.service.ts
├── <bc-name>.controller.ts
├── dto/
├── <bc-name>.module.ts
└── __tests__/
```

## Conventions de code

### Nommage (ubiquitous language)

Le domaine métier est en français dans les specs, mais le code est en **anglais** :
- Panier → `Basket`
- Réservation → `Reservation`
- Commerce → `Store`
- Créneau de retrait → `PickupSlot`
- Réclamation → `Claim`
- Reversement → `Payout`

### Entités de domaine

```typescript
// Zod schema pour validation
const BasketSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  name: z.string().min(1).max(100),
  originalPrice: z.number().positive(),
  discountedPrice: z.number().positive(),
  stock: z.number().int().nonnegative(),
  pickupStart: z.date(),
  pickupEnd: z.date(),
});

// Type inféré
type Basket = z.infer<typeof BasketSchema>;

// Factory avec validation
function createBasket(input: unknown): Basket {
  return BasketSchema.parse(input);
}
```

### Controllers

Chaque endpoint DOIT avoir :
- `@ApiTags('module-name')`
- `@ApiOperation({ summary: '...' })`
- `@ApiResponse({ status: 200, type: OutputDto })`
- `@UseGuards(JwtAuthGuard)` (sauf endpoints publics)
- `@Roles(Role.X)` si restriction RBAC

### Communication inter-modules

- **Jamais d'import direct** entre bounded contexts
- Utiliser les **domain events** (EventEmitter2) pour la communication asynchrone
- Pour les queries synchrones : passer par un **module d'interface** ou un **service partagé** déclaré dans les exports du module source

### Tests

- **Domain** : tests unitaires purs, pas de mock NestJS, juste des fonctions
- **Use cases** : mock des ports (repositories, services)
- **Controllers** : tests d'intégration avec `@nestjs/testing`
- **Adapters Prisma** : tests d'intégration avec Testcontainers PostgreSQL

## Checklist de validation

- [ ] Le module compile sans erreur TypeScript
- [ ] `npm run lint` est clean sur le module
- [ ] Tous les tests passent (`npx vitest run src/modules/<bc>`)
- [ ] Pas d'imports circulaires
- [ ] Pas d'imports depuis un autre bounded context (sauf shared-types)
- [ ] Tous les endpoints ont des décorateurs OpenAPI
- [ ] Les guards auth/RBAC sont en place
- [ ] Les domain events sont émis pour les mutations importantes
