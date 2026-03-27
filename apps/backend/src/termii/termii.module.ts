import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TermiiController } from './termii.controller';
import { TermiiInboundService } from './termii.inbound.service';
import { TermiiService } from './termii.service';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [TermiiController],
  providers: [TermiiService, TermiiInboundService],
  exports: [TermiiService],
})
export class TermiiModule {}
