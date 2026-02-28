import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';

/**
 * DTO returned by the profile endpoint.
 * Matches the AuthUser interface for OpenAPI documentation.
 */
class ProfileResponseDto {
  id!: string;
  supabaseId!: string;
  email!: string;
  phone?: string;
  roles!: string[];
}

@ApiTags('Identity & Access')
@ApiBearerAuth()
@Controller('auth')
export class IdentityAccessController {
  @Get('profile')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns the authenticated user profile extracted from the JWT token.',
  })
  @ApiOkResponse({
    description: 'User profile returned successfully',
    type: ProfileResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid authentication token',
  })
  getProfile(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
