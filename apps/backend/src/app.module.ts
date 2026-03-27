import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssociationsModule } from './associations/associations.module';
import { AuthModule } from './auth/auth.module';
import { ClaimsModule } from './claims/claims.module';
import { ClinicModule } from './clinic/clinic.module';
import { InterswitchModule } from './interswitch/interswitch.module';
import { MembersModule } from './members/members.module';
import { PaymentsModule } from './payments/payments.module';
import { PayoutsModule } from './payouts/payouts.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { WalletProvisionModule } from './wallet-provision/wallet-provision.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // BullMQ — connects to Railway Redis via REDIS_URL env var
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url:                  config.get<string>('REDIS_URL', 'redis://localhost:6379'),
          maxRetriesPerRequest: null,   // required for BullMQ 5.x workers
          enableReadyCheck:     false,  // required for BullMQ 5.x — prevents "Connection is closed" crash
          retryStrategy:        (times: number) => Math.min(times * 500, 5000),
        },
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
    }),

    PrismaModule,
    AuthModule,
    InterswitchModule,
    PaymentsModule,
    MembersModule,
    AssociationsModule,
    SchedulerModule,
    ClinicModule,
    ClaimsModule,
    PayoutsModule,
    WalletProvisionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
