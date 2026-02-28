---
name: add-error-handling
description: Ajoute la gestion d'erreurs standardisée (error codes, i18n messages)
argument-hint: <module-name>
---

# Add Error Handling

Ajoute la gestion d'erreurs standardisée pour `$ARGUMENTS`.

## Étape 1 — Définir les erreurs du module

Fichier : `src/modules/<module>/domain/errors.ts`

```typescript
import { DomainError } from '@shared/errors/domain-error';

export class <Module>NotFoundError extends DomainError {
  constructor(entityId: string) {
    super({
      code: '<MODULE>_NOT_FOUND',
      message: `<Entity> with id ${entityId} not found`,
      i18nKey: 'errors.<module>.notFound',
      statusCode: 404,
    });
  }
}

export class <Module>ValidationError extends DomainError {
  constructor(field: string, reason: string) {
    super({
      code: '<MODULE>_VALIDATION_ERROR',
      message: `Validation failed for ${field}: ${reason}`,
      i18nKey: 'errors.<module>.validation',
      statusCode: 400,
    });
  }
}

export class InsufficientStockError extends DomainError {
  constructor(basketId: string, requested: number, available: number) {
    super({
      code: 'BASKET_INSUFFICIENT_STOCK',
      message: `Insufficient stock for basket ${basketId}: requested ${requested}, available ${available}`,
      i18nKey: 'errors.basket.insufficientStock',
      statusCode: 409,
    });
  }
}
```

## Étape 2 — Base class DomainError

Fichier : `src/shared/errors/domain-error.ts`

```typescript
export interface DomainErrorOptions {
  code: string;          // Code unique machine-readable
  message: string;       // Message technique (logs)
  i18nKey: string;       // Clé i18n pour le message utilisateur
  statusCode: number;    // HTTP status code
  metadata?: Record<string, unknown>;
}

export class DomainError extends Error {
  readonly code: string;
  readonly i18nKey: string;
  readonly statusCode: number;
  readonly metadata?: Record<string, unknown>;

  constructor(options: DomainErrorOptions) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.i18nKey = options.i18nKey;
    this.statusCode = options.statusCode;
    this.metadata = options.metadata;
  }
}
```

## Étape 3 — Exception filter NestJS

```typescript
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    response.status(exception.statusCode).json({
      error: {
        code: exception.code,
        message: exception.i18nKey, // Le client traduit
        metadata: exception.metadata,
      },
    });
  }
}
```

## Étape 4 — Messages i18n

```yaml
# FR
errors:
  module:
    notFound: "Ressource introuvable"
    validation: "Données invalides"
  basket:
    insufficientStock: "Stock insuffisant pour ce panier"
```

## Conventions

- Chaque erreur a un `code` unique (SCREAMING_SNAKE_CASE)
- Chaque erreur a une `i18nKey` pour le message utilisateur
- Les erreurs métier étendent `DomainError`
- Les erreurs techniques (infra) restent des `InternalServerErrorException` NestJS
- Pas de `throw new Error('...')` générique

## Validation

- [ ] Erreurs typées pour le module
- [ ] Codes d'erreur uniques
- [ ] Messages i18n en 3 locales
- [ ] Exception filter NestJS configuré
- [ ] Tests vérifient les codes d'erreur
