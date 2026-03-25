import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TermiiService } from './termii.service';

@Module({
  imports: [HttpModule],
  providers: [TermiiService],
  exports: [TermiiService],
})
export class TermiiModule {}
