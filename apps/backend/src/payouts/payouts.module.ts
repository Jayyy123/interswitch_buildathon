import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { InterswitchModule } from '../interswitch/interswitch.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TermiiModule } from '../termii/termii.module';
import { PayoutProcessor } from './payout.processor';
import { PAYOUT_QUEUE } from './payout.queue';

@Module({
  imports: [
    PrismaModule,
    InterswitchModule,
    TermiiModule,
    BullModule.registerQueue({ name: PAYOUT_QUEUE }),
  ],
  providers: [PayoutProcessor],
  // Export the queue registration so ClaimsModule can inject the Queue
  exports: [BullModule],
})
export class PayoutsModule {}
