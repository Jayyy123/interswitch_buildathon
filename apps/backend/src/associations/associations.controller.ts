import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MembersService } from '../members/members.service';
import { AssociationsService } from './associations.service';
import {
  ClaimsQueryDto,
  CreateAssociationDto,
  EnrollMembersDto,
  MembersQueryDto,
  TransactionsQueryDto,
  VerifyPaymentDto,
} from './dto/associations.dto';

@Controller('associations')
@UseGuards(JwtAuthGuard)
export class AssociationsController {
  constructor(
    private readonly associationsService: AssociationsService,
    private readonly membersService: MembersService,
  ) {}

  // ─── Association CRUD ──────────────────────────────────────────────────────

  /** POST /associations — Iyaloja creates association + auto-creates pool wallet */
  @Post()
  create(@Body() dto: CreateAssociationDto, @Request() req) {
    return this.associationsService.createAssociation(dto, req.user.userId, req.user.phone);
  }

  /** GET /associations — Role-aware list: Iyaloja gets owned, Member gets enrolled */
  @Get()
  list(@Request() req) {
    return this.associationsService.listAssociations(req.user.userId, req.user.role);
  }

  // ─── Dashboard & sub-pages ────────────────────────────────────────────────

  /** GET /associations/:id/dashboard — Stat cards: pool balance, member counts, total paid out */
  @Get(':id/dashboard')
  getDashboard(@Param('id') id: string, @Request() req) {
    return this.associationsService.getDashboard(id, req.user.userId);
  }

  /** GET /associations/:id/wallet — Pool wallet details + weekly target */
  @Get(':id/wallet')
  getWallet(@Param('id') id: string, @Request() req) {
    return this.associationsService.getWallet(id, req.user.userId);
  }

  // ─── Members ──────────────────────────────────────────────────────────────

  /**
   * GET /associations/:id/members
   * Query: page, limit, status (ACTIVE|PAUSED|FLAGGED|INCOMPLETE), search
   */
  @Get(':id/members')
  getMembers(
    @Param('id') id: string,
    @Query() query: MembersQueryDto,
    @Request() req,
  ) {
    return this.associationsService.getMembers(id, req.user.userId, query);
  }

  /** GET /associations/:id/members/:memberId — Member profile + wallet + last 10 contributions */
  @Get(':id/members/:memberId')
  getMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
  ) {
    return this.associationsService.getMember(id, memberId, req.user.userId);
  }

  /**
   * POST /associations/:id/members/enroll
   * Handles both single and bulk enrollment.
   * Frontend parses CSV → sends JSON array.
   * Returns 200 immediately; wallet provisioning runs in background.
   * Body: { members: [{ fullName, phoneNumber, bvn }] }
   */
  @Post(':id/members/enroll')
  enrollMembers(
    @Param('id') id: string,
    @Body() dto: EnrollMembersDto,
    @Request() req,
  ) {
    return this.membersService.enrollMembers(id, dto.members, req.user.userId);
  }

  /**
   * POST /associations/:id/members/:memberId/retry-wallet
   * Retries wallet provisioning for a member with walletStatus = FAILED.
   */
  @Post(':id/members/:memberId/retry-wallet')
  retryWallet(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
  ) {
    return this.membersService.retryWallet(id, memberId, req.user.userId);
  }

  // ─── Claims ───────────────────────────────────────────────────────────────

  /** GET /associations/:id/claims — paginated, filterable by status */
  @Get(':id/claims')
  getClaims(
    @Param('id') id: string,
    @Query() query: ClaimsQueryDto,
    @Request() req,
  ) {
    return this.associationsService.getClaims(id, req.user.userId, query);
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  /** GET /associations/:id/transactions — paginated contributions, filterable by source + week */
  @Get(':id/transactions')
  getTransactions(
    @Param('id') id: string,
    @Query() query: TransactionsQueryDto,
    @Request() req,
  ) {
    return this.associationsService.getTransactions(id, req.user.userId, query);
  }

  // ─── Payment ──────────────────────────────────────────────────────────────

  /** POST /associations/:id/verify-payment — Verify web checkout + credit pool */
  @Post(':id/verify-payment')
  verifyPayment(
    @Param('id') id: string,
    @Body() dto: VerifyPaymentDto,
    @Request() req,
  ) {
    return this.associationsService.verifyAndCreditPool(id, dto, req.user.userId);
  }
}
