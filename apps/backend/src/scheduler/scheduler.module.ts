import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { InterswitchModule } from '../interswitch/interswitch.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TermiiModule } from '../termii/termii.module';
import { SchedulerController } from './scheduler.controller';
import { WeeklyDebitProcessor } from './scheduler.processor';
import { WEEKLY_DEBIT_QUEUE } from './scheduler.queue';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: WEEKLY_DEBIT_QUEUE }),
    PrismaModule,
    InterswitchModule,
    TermiiModule,
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService, WeeklyDebitProcessor],
  exports: [SchedulerService],
})
export class SchedulerModule {}
