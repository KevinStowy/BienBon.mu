import { Module } from '@nestjs/common';
import { StateMachineService } from '../../shared/state-machine';
import { PartnerService } from './services/partner.service';
import { PartnerRegistrationService } from './services/partner-registration.service';
import { PartnerController } from './controllers/partner.controller';
import { PartnerAdminController } from './controllers/partner-admin.controller';

@Module({
  providers: [
    StateMachineService,
    PartnerService,
    PartnerRegistrationService,
  ],
  controllers: [PartnerController, PartnerAdminController],
  exports: [PartnerService, PartnerRegistrationService],
})
export class PartnerModule {}
