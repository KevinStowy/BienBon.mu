---
name: scaffold-module
description: Crée la structure hexagonale complète d'un module NestJS
argument-hint: <module-name>
---

# Scaffold Module NestJS

Crée la structure d'un module NestJS pour le bounded context `$ARGUMENTS`.

## Étape 1 — Déterminer le type de module

**Modules complexes** (architecture hexagonale) :
`ordering`, `payment`, `catalog`, `partner`, `review-claims`

**Modules simples** (CRUD NestJS classique) :
`consumer`, `identity-access`, `notification`, `media`, `geolocation`, `gamification`, `referral`, `analytics`, `config`, `fraud`, `admin`

## Étape 2 — Créer la structure

### Si module complexe :

```
src/modules/$ARGUMENTS/
├── domain/
│   ├── entities/
│   │   └── .gitkeep
│   ├── value-objects/
│   │   └── .gitkeep
│   ├── events/
│   │   └── .gitkeep
│   └── rules/
│       └── .gitkeep
├── ports/
│   ├── inbound/
│   │   └── .gitkeep
│   └── outbound/
│       └── .gitkeep
├── adapters/
│   ├── inbound/
│   │   └── .gitkeep
│   └── outbound/
│       └── .gitkeep
├── application/
│   ├── use-cases/
│   │   └── .gitkeep
│   └── dtos/
│       └── .gitkeep
├── $ARGUMENTS.module.ts
├── index.ts
└── __tests__/
    ├── unit/
    │   └── .gitkeep
    └── integration/
        └── .gitkeep
```

### Si module simple :

```
src/modules/$ARGUMENTS/
├── $ARGUMENTS.service.ts
├── $ARGUMENTS.controller.ts
├── dto/
│   └── .gitkeep
├── $ARGUMENTS.module.ts
├── index.ts
└── __tests__/
    └── .gitkeep
```

## Étape 3 — Créer le fichier module NestJS

```typescript
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class ${PascalCase($ARGUMENTS)}Module {}
```

## Étape 4 — Créer le barrel export (index.ts)

N'exporter QUE les interfaces publiques du module. Jamais les implémentations internes.

## Étape 5 — Enregistrer dans AppModule

Ajouter le module dans les imports de `app.module.ts`.

## Validation

- [ ] Le module compile (`tsc --noEmit`)
- [ ] Le module est enregistré dans AppModule
- [ ] La structure de dossiers est correcte
- [ ] Le barrel export n'expose que l'API publique
