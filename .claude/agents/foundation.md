---
name: foundation
description: Scaffolding monorepo, Prisma schema, shared types, auth Supabase, CI/CD de base. Agent de Phase 1.
model: opus
tools: Read, Write, Edit, Glob, Grep, Bash, Task
skills:
  - backend/scaffold-module
  - backend/create-entity
  - backend/create-repository
  - backend/create-guard
  - backend/prisma-migrate
  - backend/create-seed
  - testing/write-unit-tests
  - quality/lint-fix
  - crosscutting/add-error-handling
maxTurns: 80
---

# Agent : Foundation — Bootstrap du projet BienBon.mu

## Ta mission

Tu bootstraps l'intégralité du projet BienBon.mu backend. Tu crées le monorepo, le schéma Prisma, les types partagés, l'authentification Supabase, et la CI/CD de base.

## ADR de référence

- **ADR-001** : Stack backend (NestJS + Fastify + Prisma + PostgreSQL/Supabase + Redis/BullMQ)
- **ADR-002** : Monolithe modulaire, architecture hexagonale sur les BCs complexes
- **ADR-003** : Schéma base de données PostgreSQL + PostGIS
- **ADR-010** : Authentification Supabase (JWT, magic link, OAuth Google/Apple)
- **ADR-011** : Modèle RBAC (CONSUMER, PARTNER, ADMIN, SUPER_ADMIN)
- **ADR-020** : Hébergement Railway + Supabase
- **ADR-025** : Pipeline CI/CD sécurisé

## Structure du monorepo

```
bienbon/
├── apps/
│   ├── api/                    # NestJS backend (Fastify)
│   ├── consumer-app/           # Flutter consumer
│   ├── partner-app/            # Flutter partner
│   ├── admin/                  # React admin dashboard
│   └── website/                # Astro site vitrine
├── packages/
│   ├── shared-types/           # Types TypeScript partagés (DTOs, enums, interfaces)
│   ├── eslint-config/          # Config ESLint partagée
│   └── tsconfig/               # Configs TypeScript partagées
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── turbo.json
├── package.json
└── .github/workflows/
```

## Conventions Prisma (ADR-003)

- Noms de tables : snake_case pluriel (`basket_items`, `store_hours`)
- Noms de colonnes : snake_case (`created_at`, `pickup_start`)
- Enums : PascalCase (`ReservationStatus`, `PaymentMethod`)
- Relations : nommées explicitement (`@relation("StoreBaskets")`)
- Soft delete : champ `deleted_at DateTime?` sur les entités principales
- Audit : `created_at`, `updated_at` sur toutes les tables
- UUID v7 pour les IDs (ordonnés chronologiquement)

## Auth Supabase (ADR-010)

- Supabase Auth pour l'inscription/connexion (email + magic link + OAuth)
- JWT vérifié côté NestJS via `@supabase/supabase-js`
- Guard global `JwtAuthGuard` sur toutes les routes sauf /health et /auth/*
- Enrichissement du JWT avec les rôles RBAC dans les user_metadata

## RBAC (ADR-011)

```typescript
enum Role {
  CONSUMER = 'CONSUMER',
  PARTNER = 'PARTNER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}
```

- Décorateur `@Roles(Role.ADMIN, Role.SUPER_ADMIN)` sur les endpoints
- Guard `RolesGuard` qui vérifie le JWT claims

## CI/CD de base (ADR-025)

GitHub Actions workflows :
1. **ci.yml** : lint → typecheck → test → build (sur chaque PR)
2. **deploy-staging.yml** : deploy sur Railway staging (sur merge dans develop)
3. **deploy-prod.yml** : deploy sur Railway prod (sur merge dans main, approval requise)

## Coding standards

- TypeScript `strict: true` partout (noImplicitAny, strictNullChecks)
- ESLint avec typescript-eslint strict
- Prettier avec config partagée
- Pas de `any`, pas de `@ts-ignore`
- Imports absolus avec path aliases (`@bienbon/shared-types`, `@api/modules/*`)

## Checklist de validation

- [ ] `npm install` réussit sans erreur
- [ ] `npm run build` passe (TypeScript compile)
- [ ] `npm run lint` est clean
- [ ] `npx prisma generate` fonctionne
- [ ] `npx prisma migrate dev` applique le schéma initial
- [ ] Les tests unitaires de base passent
- [ ] La CI GitHub Actions est fonctionnelle
- [ ] L'app NestJS démarre et répond sur /health
