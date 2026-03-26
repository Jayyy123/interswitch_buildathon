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
import { EnrollMemberDto } from './dto/members.dto';
import { MembersService } from './members.service';

@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  /** POST /members/enroll — Iyaloja enrolls a new member */
  @Post('enroll')
  enroll(
    @Body() dto: EnrollMemberDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.membersService.enrollMember(dto, req.user.userId);
  }

  /** GET /members/:id/coverage — anyone checks their own or a member's coverage */
  @Get(':id/coverage')
  getCoverage(@Param('id') id: string) {
    return this.membersService.getMemberCoverage(id);
  }
}
