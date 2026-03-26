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
import { BulkEnrollDto, EnrollMemberDto } from './dto/members.dto';
import { MembersService } from './members.service';

@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  /** POST /members/enroll — Iyaloja enrolls a single member */
  @Post('enroll')
  enroll(@Body() dto: EnrollMemberDto, @Request() req) {
    return this.membersService.enrollMember(dto, req.user.sub);
  }

  /**
   * POST /members/bulk-enroll — Iyaloja bulk-enrolls members from CSV
   * Body: { associationId, members: [{ full_name, phone, bvn }] }
   * Returns per-row enrolled/skipped/failed summary
   */
  @Post('bulk-enroll')
  bulkEnroll(@Body() dto: BulkEnrollDto, @Request() req) {
    return this.membersService.bulkEnrollMembers(
      dto.associationId,
      dto.members,
      req.user.sub,
    );
  }

  /** GET /members/:id/coverage — Check a member's coverage and wallet details */
  @Get(':id/coverage')
  getCoverage(@Param('id') id: string) {
    return this.membersService.getMemberCoverage(id);
  }
}
