import { Module } from '@nestjs/common';
import { ClinicModule } from '../clinic/clinic.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';

@Module({
  imports: [
    PrismaModule,
    ClinicModule, // for ClinicService.getClinicAdmin()
    PayoutsModule, // re-exports BullModule so ClaimsService can @InjectQueue
  ],
  controllers: [ClaimsController],
  providers: [ClaimsService],
})
export class ClaimsModule {}
