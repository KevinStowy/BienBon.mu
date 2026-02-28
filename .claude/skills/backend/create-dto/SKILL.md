---
name: create-dto
description: Crée un DTO avec class-validator + class-transformer + OpenAPI
argument-hint: <DtoName> in <module-name>
---

# Create DTO

Crée un DTO (Data Transfer Object) `$ARGUMENTS` pour la couche API.

## Étape 1 — Créer le DTO

Fichier : `src/modules/<module>/application/dtos/<dto-name>.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsEmail, IsOptional, IsEnum, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Transform, Expose } from 'class-transformer';

export class <DtoName>Dto {
  @ApiProperty({ description: 'Unique identifier', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Name', example: 'Panier surprise boulangerie' })
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ description: 'Optional field' })
  @IsOptional()
  @IsString()
  description?: string;
}
```

## Étape 2 — Conventions par type de DTO

### CreateDto (input POST)
- Pas de `id`, `createdAt`, `updatedAt` (générés côté serveur)
- Tous les champs requis marqués avec validators
- `@Transform` pour le trim des strings

### UpdateDto (input PUT/PATCH)
- Hériter de `PartialType(CreateDto)` pour PATCH
- Ou définir explicitement pour PUT

### ResponseDto (output)
- `@Expose()` sur chaque champ (class-transformer)
- `@Exclude()` pour les champs internes
- Pas de validators (c'est un output)

### FilterDto (input query params)
- Tous les champs `@IsOptional()`
- `@Transform` pour les conversions (string → number pour query params)
- Pagination : `page`, `limit` avec valeurs par défaut

```typescript
export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit: number = 20;
}
```

## Étape 3 — Tests

Tester la validation avec `class-validator` :
```typescript
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

const dto = plainToInstance(<DtoName>Dto, { /* invalid data */ });
const errors = await validate(dto);
expect(errors.length).toBeGreaterThan(0);
```

## Validation

- [ ] Chaque champ a un décorateur `@ApiProperty` ou `@ApiPropertyOptional`
- [ ] Chaque champ input a au moins un validator `class-validator`
- [ ] Les strings sont trimmés via `@Transform`
- [ ] Les query params numériques sont parsés via `@Transform`
- [ ] Tests de validation passent
