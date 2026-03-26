import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssociationsService } from './associations.service';
import { CreateAssociationDto, VerifyPaymentDto } from './dto/associations.dto';

@Controller('associations')
@UseGuards(JwtAuthGuard)
export class AssociationsController {
  constructor(private readonly associationsService: AssociationsService) {}

  /** POST /associations — Iyaloja creates their association */
  @Post()
  create(
    @Body() dto: CreateAssociationDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.associationsService.createAssociation(dto, req.user.userId);
  }

  /** GET /associations/:id — Dashboard data (members, claims, pool balance) */
  @Get(':id')
  getDashboard(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.associationsService.getAssociation(id, req.user.userId);
  }

  /** POST /associations/:id/verify-payment — Server-side verify after web checkout */
  @Post(':id/verify-payment')
  verifyPayment(
    @Param('id') id: string,
    @Body() dto: VerifyPaymentDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.associationsService.verifyAndCreditPool(id, dto, req.user.userId);
  }
}
