import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssociationsModule } from './associations/associations.module';
import { AuthModule } from './auth/auth.module';
import { InterswitchModule } from './interswitch/interswitch.module';
import { MembersModule } from './members/members.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),   // enables @Cron / @Interval decorators globally
    PrismaModule,
    AuthModule,
    InterswitchModule,
    PaymentsModule,
    MembersModule,
    AssociationsModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
