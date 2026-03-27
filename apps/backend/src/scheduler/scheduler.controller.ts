import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SchedulerService } from './scheduler.service';

@Controller('scheduler')
@UseGuards(JwtAuthGuard)
export class SchedulerController {
  constructor(private readonly scheduler: SchedulerService) {}

  /**
   * POST /scheduler/trigger-debit
   * Admin-only endpoint to manually trigger the weekly debit run.
   * Used for testing without waiting for Monday morning.
   */
  @Post('trigger-debit')
  triggerDebit() {
    return this.scheduler.triggerManualDebit();
  }
}
