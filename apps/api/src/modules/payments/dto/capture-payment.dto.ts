import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CapturePaymentDto {
  @ApiProperty({
    description: 'The pre-auth transaction ID to capture',
    format: 'uuid',
  })
  @IsUUID()
  transactionId!: string;
}
