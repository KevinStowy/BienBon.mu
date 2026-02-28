---
name: create-controller
description: Crée un controller NestJS avec décorateurs OpenAPI + guards
argument-hint: <ControllerName> in <module-name>
---

# Create Controller

Crée un controller NestJS `$ARGUMENTS` avec OpenAPI et guards auth/RBAC.

## Étape 1 — Créer le controller

Fichier : `src/modules/<module>/adapters/inbound/<controller-name>.controller.ts`

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { Role } from '@shared/enums/role.enum';

@ApiTags('<module-name>')
@ApiBearerAuth()
@Controller('<module-name>')
@UseGuards(JwtAuthGuard, RolesGuard)
export class <ControllerName>Controller {
  constructor(
    private readonly <useCaseName>: <UseCaseName>UseCase,
  ) {}

  @Post()
  @Roles(Role.CONSUMER)
  @ApiOperation({ summary: 'Create a new <entity>' })
  @ApiResponse({ status: 201, type: <OutputDto> })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: Create<Entity>Dto): Promise<<OutputDto>> {
    return this.<useCaseName>.execute(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get <entity> by ID' })
  @ApiResponse({ status: 200, type: <OutputDto> })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<<OutputDto>> {
    // ...
  }
}
```

## Étape 2 — Décorateurs obligatoires

Chaque endpoint DOIT avoir :
- `@ApiOperation({ summary })` — description de l'action
- `@ApiResponse({ status, type/description })` — pour chaque status possible
- `@UseGuards(JwtAuthGuard)` — sauf si endpoint public
- `@Roles(Role.X)` — si restriction RBAC

Endpoints publics (sans auth) :
- `GET /health`
- `POST /auth/login`
- `POST /auth/register`
- `GET /baskets` (catalogue public)

## Étape 3 — Validation des paramètres

- `@Param('id', ParseUUIDPipe)` pour les UUID
- `@Query()` avec un DTO validé pour les filtres
- `@Body()` avec un DTO class-validator
- Pipes globaux dans `main.ts` : `ValidationPipe`, `ClassSerializerInterceptor`

## Étape 4 — Enregistrer dans le module

Ajouter le controller dans `controllers` du module.

## Étape 5 — Test d'intégration

Fichier : `src/modules/<module>/__tests__/integration/<controller-name>.spec.ts`

Utiliser `@nestjs/testing` :
```typescript
const module = await Test.createTestingModule({
  controllers: [<ControllerName>Controller],
  providers: [{ provide: <UseCaseName>UseCase, useValue: mockUseCase }],
}).compile();
```

Tester : status codes, validation errors, auth/RBAC enforcement.

## Validation

- [ ] Tous les endpoints ont les décorateurs OpenAPI
- [ ] Auth guards en place
- [ ] Paramètres validés (UUID, DTOs)
- [ ] Test d'intégration couvre les cas nominaux et d'erreur
- [ ] Le controller ne contient pas de logique métier
