import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { InterswitchModule } from '../interswitch/interswitch.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TermiiModule } from '../termii/termii.module';
import { WalletProvisionProcessor } from './wallet-provision.processor';
import { WALLET_PROVISION_QUEUE } from './wallet-provision.queue';

@Module({
  imports: [
    BullModule.registerQueue({ name: WALLET_PROVISION_QUEUE }),
    PrismaModule,
    InterswitchModule,
    TermiiModule,
  ],
  providers: [WalletProvisionProcessor],
  exports:   [BullModule],  // exports the registered queue token so other modules can inject it
})
export class WalletProvisionModule {}
