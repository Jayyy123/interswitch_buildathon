import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('claims')
  getMyClaims(@Request() req: { user: { userId: string } }) {
    return this.paymentsService.getUserClaims(req.user.userId);
  }

  @Get('claims/:id')
  getClaim(@Param('id') id: string) {
    return this.paymentsService.getClaimById(id);
  }
}
