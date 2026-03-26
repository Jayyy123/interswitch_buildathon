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
import { AssociationsService } from './associations.service';
import { CreateAssociationDto, VerifyPaymentDto } from './dto/associations.dto';

@Controller('associations')
@UseGuards(JwtAuthGuard)
export class AssociationsController {
  constructor(private readonly associationsService: AssociationsService) {}

  /** POST /associations — Iyaloja creates their association + auto-creates pool wallet */
  @Post()
  create(@Body() dto: CreateAssociationDto, @Request() req) {
    return this.associationsService.createAssociation(
      dto,
      req.user.userId,
      req.user.phone,
    );
  }

  /** GET /associations — Role-aware: Iyaloja gets owned, Member gets enrolled */
  @Get()
  list(@Request() req) {
    return this.associationsService.listAssociations(
      req.user.userId,
      req.user.role,
    );
  }

  /** GET /associations/:id — Full dashboard (members + claims + pool balance) */
  @Get(':id')
  getDashboard(@Param('id') id: string, @Request() req) {
    return this.associationsService.getAssociation(id, req.user.userId);
  }

  /** POST /associations/:id/verify-payment — Verify web checkout + credit pool */
  @Post(':id/verify-payment')
  verifyPayment(
    @Param('id') id: string,
    @Body() dto: VerifyPaymentDto,
    @Request() req,
  ) {
    return this.associationsService.verifyAndCreditPool(
      id,
      dto,
      req.user.userId,
    );
  }
}
