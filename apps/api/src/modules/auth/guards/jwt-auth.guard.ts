import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseService } from '../../supabase/supabase.service';
import { Role } from '@bienbon/shared-types';
import type { AuthUser } from '../interfaces/auth-user.interface';

interface RequestWithUser {
  headers: Record<string, string | undefined>;
  user?: AuthUser;
}

/**
 * Global guard that verifies JWT tokens via Supabase Auth.
 * Routes decorated with @Public() bypass authentication.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithUser>();

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    // If Supabase is not configured, reject in non-development
    if (!this.supabaseService.isReady()) {
      this.logger.warn(
        'Supabase is not configured. Rejecting authenticated request.',
      );
      throw new UnauthorizedException(
        'Authentication service is not configured',
      );
    }

    try {
      const {
        data: { user },
        error,
      } = await this.supabaseService.getClient().auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Extract roles from user metadata
      const userMetadata = user.user_metadata as
        | Record<string, unknown>
        | undefined;
      const rolesRaw = userMetadata?.['roles'];
      const roles = this.parseRoles(rolesRaw);

      // Attach authenticated user to the request
      const authUser: AuthUser = {
        id: user.id,
        supabaseId: user.id,
        email: user.email ?? '',
        phone: user.phone,
        roles,
      };

      request.user = authUser;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException('Token verification failed');
    }
  }

  private extractTokenFromHeader(
    request: RequestWithUser,
  ): string | undefined {
    const authorization = request.headers['authorization'];
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private parseRoles(rolesRaw: unknown): Role[] {
    if (!Array.isArray(rolesRaw)) {
      return [Role.CONSUMER]; // Default role
    }

    const validRoles = Object.values(Role) as string[];
    return rolesRaw.filter(
      (r): r is Role => typeof r === 'string' && validRoles.includes(r),
    );
  }
}
