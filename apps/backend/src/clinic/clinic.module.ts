import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InterswitchModule } from '../interswitch/interswitch.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { ClinicController } from './clinic.controller';
import { ClinicService } from './clinic.service';

@Module({
  imports: [
    PrismaModule,
    InterswitchModule, // for getWalletInfo() balance lookup
    PayoutsModule, // exports BullModule so @InjectQueue(PAYOUT_QUEUE) works
  ],
  controllers: [ClinicController],
  providers: [ClinicService],
  exports: [ClinicService],
})
export class ClinicModule {}
