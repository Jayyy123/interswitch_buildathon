import { Module } from '@nestjs/common';
import { InterswitchModule } from '../interswitch/interswitch.module';
import { TermiiModule } from '../termii/termii.module';
import { WalletProvisionModule } from '../wallet-provision/wallet-provision.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [InterswitchModule, TermiiModule, WalletProvisionModule],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
