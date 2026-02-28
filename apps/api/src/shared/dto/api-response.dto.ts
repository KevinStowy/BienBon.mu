import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Error details for API error responses.
 */
export class ApiErrorDetail {
  @ApiProperty({ description: 'Machine-readable error code', example: 'INSUFFICIENT_STOCK' })
  code!: string;

  @ApiProperty({ description: 'Human-readable error message', example: 'Not enough stock available' })
  message!: string;

  @ApiPropertyOptional({
    description: 'Additional error details (e.g., field-level validation errors)',
    example: { field: 'quantity', reason: 'Must be at least 1' },
  })
  details?: Record<string, unknown>;
}

/**
 * Standard success response wrapper.
 *
 * @example
 * ```typescript
 * return ApiSuccessResponse.of(basket);
 * ```
 */
export class ApiSuccessResponse<T> {
  @ApiProperty({ description: 'Indicates success', example: true })
  success!: true;

  @ApiProperty({ description: 'Response payload' })
  data!: T;

  static of<T>(data: T): ApiSuccessResponse<T> {
    const response = new ApiSuccessResponse<T>();
    response.success = true;
    response.data = data;
    return response;
  }
}

/**
 * Standard error response wrapper.
 *
 * @example
 * ```typescript
 * return ApiErrorResponse.of('NOT_FOUND', 'Basket not found');
 * ```
 */
export class ApiErrorResponse {
  @ApiProperty({ description: 'Indicates failure', example: false })
  success!: false;

  @ApiProperty({ description: 'Error information', type: ApiErrorDetail })
  error!: ApiErrorDetail;

  static of(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ): ApiErrorResponse {
    const response = new ApiErrorResponse();
    response.success = false;
    response.error = { code, message, details };
    return response;
  }
}
