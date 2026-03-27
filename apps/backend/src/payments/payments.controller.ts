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
import { ApproveClaimDto, SubmitClaimDto } from './dto/payments.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ─── Claims ────────────────────────────────────────────────────────────────

  @Get('claims')
  getMyClaims(@Request() req: { user: { userId: string } }) {
    return this.paymentsService.getUserClaims(req.user.userId);
  }

  @Get('claims/:id')
  getClaim(@Param('id') id: string) {
    return this.paymentsService.getClaimById(id);
  }

  /** Member submits a hospital bill for approval */
  @Post('claims')
  submitClaim(
    @Body() dto: SubmitClaimDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.paymentsService.submitClaim(dto, req.user.userId);
  }

  /**
   * Iyaloja approves a claim.
   * For amounts >= ₦50,000: first call triggers SafeToken SMS.
   * Retry with { safeTokenOtp } to complete the payout.
   */
  @Post('claims/:id/approve')
  approveClaim(
    @Param('id') id: string,
    @Body() dto: ApproveClaimDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.paymentsService.approveClaim(id, dto, req.user.userId);
  }

  // ─── Info ──────────────────────────────────────────────────────────────────

  /** Pool wallet balance + member wallets — Iyaloja only */
  @Get('wallet-balance')
  getWalletBalance(@Request() req) {
    return this.paymentsService.getWalletBalance(req.user.userId);
  }

  /** Bank code list for hospital registration dropdown */
  @Get('banks')
  getBanks() {
    return this.paymentsService.getBankCodes();
  }
}
