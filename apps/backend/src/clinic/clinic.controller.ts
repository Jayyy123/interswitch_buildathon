import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RegisterClinicDto, SaveClinicSetupDto } from './dto/clinic.dto';
import { ClinicService } from './clinic.service';

@Controller('clinic')
@UseGuards(JwtAuthGuard)
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  /** POST /clinic/register — one-time: create clinic + link user as admin */
  @Post('register')
  registerClinic(
    @Body() dto: RegisterClinicDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.clinicService.registerClinic(dto, req.user.userId);
  }

  /** GET /clinic/setup */
  @Get('setup')
  getSetup(@Request() req: { user: { userId: string } }) {
    return this.clinicService.getSetup(req.user.userId);
  }

  /** GET /clinic/wallet — wallet details + live balance */
  @Get('wallet')
  getWallet(@Request() req: { user: { userId: string } }) {
    return this.clinicService.getWalletInfo(req.user.userId);
  }

  /** PATCH /clinic/setup */
  @Patch('setup')
  saveSetup(
    @Body() dto: SaveClinicSetupDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.clinicService.saveSetup(dto, req.user.userId);
  }
}
