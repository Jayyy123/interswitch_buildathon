import { Module } from '@nestjs/common';
import { InterswitchModule } from '../interswitch/interswitch.module';
import { MembersModule } from '../members/members.module';
import { TermiiModule } from '../termii/termii.module';
import { WalletProvisionModule } from '../wallet-provision/wallet-provision.module';
import { AssociationsController } from './associations.controller';
import { AssociationsService } from './associations.service';

@Module({
  imports: [InterswitchModule, TermiiModule, MembersModule, WalletProvisionModule],
  controllers: [AssociationsController],
  providers: [AssociationsService],
  exports: [AssociationsService],
})
export class AssociationsModule {}
