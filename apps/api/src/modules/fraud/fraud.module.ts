import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { FraudRuleController } from './fraud-rule.controller';
import { FraudRuleService } from './fraud-rule.service';
import { FraudAlertController } from './fraud-alert.controller';
import { FraudAlertService } from './fraud-alert.service';
import { FraudSuspensionController } from './fraud-suspension.controller';
import { FraudSuspensionService } from './fraud-suspension.service';
import { FraudExtraController } from './fraud-extra.controller';

/**
 * FraudModule provides admin-only CRUD operations for:
 * - FraudRules: configuration of the fraud detection engine
 * - FraudAlerts: review and resolution of detected fraud signals
 * - FraudSuspensions: management and lifting of user suspensions
 * - FraudExtra: duplicate accounts, threshold alerts/rules (additional endpoints)
 *
 * All endpoints require ADMIN or SUPER_ADMIN role.
 * PrismaService is injected via the global SharedModule.
 */
@Module({
  imports: [SharedModule],
  controllers: [FraudRuleController, FraudAlertController, FraudSuspensionController, FraudExtraController],
  providers: [FraudRuleService, FraudAlertService, FraudSuspensionService],
})
export class FraudModule {}
