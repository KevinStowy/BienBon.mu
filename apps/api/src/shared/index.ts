// Domain errors
export {
  DomainError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
  BusinessRuleError,
} from './errors/domain-error';

// Exception filters
export { DomainErrorFilter } from './filters/domain-error.filter';
export { AllExceptionsFilter } from './filters/all-exceptions.filter';

// Interceptors
export { LoggingInterceptor } from './interceptors/logging.interceptor';

// DTOs
export {
  PaginationQueryDto,
  PaginationMeta,
  PaginatedResponseDto,
} from './dto/pagination.dto';
export {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiErrorDetail,
} from './dto/api-response.dto';

// Module
export { SharedModule } from './shared.module';
