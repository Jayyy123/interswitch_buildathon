import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InitiatePaymentDto } from './dto/payments.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  initiatePayment(
    @Request() req: { user: { userId: string } },
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(req.user.userId, dto);
  }

  @Get('verify/:reference')
  verifyPayment(@Param('reference') reference: string) {
    return this.paymentsService.verifyPayment(reference);
  }

  @Get('history')
  getHistory(@Request() req: { user: { userId: string } }) {
    return this.paymentsService.getUserTransactions(req.user.userId);
  }
}
