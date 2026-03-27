import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClinicController } from './clinic.controller';
import { ClinicService } from './clinic.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClinicController],
  providers: [ClinicService],
  exports: [ClinicService], // ClaimsModule uses getClinicAdmin()
})
export class ClinicModule {}
