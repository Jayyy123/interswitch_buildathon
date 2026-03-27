import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MembersService } from './members.service';

@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  /**
   * GET /members/:id/coverage
   * Public-ish — used by member lite view and clinic portal to check coverage.
   * No ownership check: memberId is the identifier.
   */
  @Get(':id/coverage')
  getCoverage(@Param('id') id: string) {
    return this.membersService.getMemberCoverage(id);
  }
}
