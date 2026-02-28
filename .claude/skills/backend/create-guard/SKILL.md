---
name: create-guard
description: Crée un guard NestJS (auth JWT, RBAC, rate-limit, ownership)
argument-hint: <guard-type> [jwt-auth | rbac | rate-limit | ownership]
---

# Create Guard

Crée un guard NestJS de type `$ARGUMENTS`.

## Types de guards

### jwt-auth — Authentification JWT Supabase

Fichier : `src/shared/guards/jwt-auth.guard.ts`

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Missing token');

    const { data: { user }, error } = await this.supabase.auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid token');

    request.user = user;
    return true;
  }

  private extractToken(request: any): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
```

### rbac — Contrôle de rôles

Fichier : `src/shared/guards/roles.guard.ts`

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.app_metadata?.role === role);
  }
}
```

Décorateur associé : `src/shared/decorators/roles.decorator.ts`

### rate-limit — Limitation de débit avec Redis

Basé sur `@nestjs/throttler` avec store Redis pour le mode distribué.

### ownership — Vérification de propriété

Vérifie que l'utilisateur est propriétaire de la ressource accédée. Paramétré par l'entité et le champ userId.

## Tests

- Tester avec un token valide → passe
- Tester sans token → 401
- Tester avec token invalide → 401
- Tester RBAC avec mauvais rôle → 403
- Tester ownership avec un autre user → 403

## Validation

- [ ] Le guard est injectable
- [ ] Les cas d'erreur retournent les bons status HTTP
- [ ] Tests couvrent les cas nominaux et d'erreur
- [ ] Le guard est enregistré dans le module approprié
