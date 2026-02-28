import { PartialType } from '@nestjs/swagger';
import { CreateFraudRuleDto } from './create-fraud-rule.dto';

/**
 * DTO for updating an existing fraud detection rule.
 * All fields are optional — only provided fields are updated.
 */
export class UpdateFraudRuleDto extends PartialType(CreateFraudRuleDto) {}
