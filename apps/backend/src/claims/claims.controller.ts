import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClaimsService } from './claims.service';
import { SubmitClaimDto } from './dto/claims.dto';

@Controller('claims')
@UseGuards(JwtAuthGuard)
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  /** GET /claims/members/lookup?phone=08012345678 */
  @Get('members/lookup')
  lookupMember(@Query('phone') phone: string) {
    return this.claimsService.lookupMember(phone);
  }

  /** GET /claims/stats */
  @Get('stats')
  getStats(@Request() req: { user: { userId: string } }) {
    return this.claimsService.getStats(req.user.userId);
  }

  /** GET /claims */
  @Get()
  getClaims(@Request() req: { user: { userId: string } }) {
    return this.claimsService.getClaims(req.user.userId);
  }

  /** POST /claims */
  @Post()
  submitClaim(
    @Body() dto: SubmitClaimDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.claimsService.submitClaim(dto, req.user.userId);
  }
}
