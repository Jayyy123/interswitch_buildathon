import { Module } from '@nestjs/common';
import { InterswitchModule } from '../interswitch/interswitch.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [InterswitchModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
