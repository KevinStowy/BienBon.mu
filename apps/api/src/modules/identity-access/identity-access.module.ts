import { Module } from '@nestjs/common';
import { IdentityAccessController } from './identity-access.controller';

@Module({
  controllers: [IdentityAccessController],
})
export class IdentityAccessModule {}
