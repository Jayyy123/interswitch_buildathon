import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { WEEKLY_DEBIT_JOB, WEEKLY_DEBIT_QUEUE } from './scheduler.queue';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue(WEEKLY_DEBIT_QUEUE)
    private readonly weeklyDebitQueue: Queue,
  ) {
    // Attach error listener immediately so BullMQ errors don't become uncaught exceptions
    weeklyDebitQueue.on('error', (err) => this.logger.warn('Weekly debit queue error:', err.message));
  }

  /**
   * On startup, register (or confirm) the repeatable weekly debit job.
   * Runs every Monday at 08:00 WAT (07:00 UTC).
   * Wrapped in try/catch so a missing Redis does NOT crash the app.
   * Once REDIS_URL is set in Railway env, the next deploy will register the job.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.weeklyDebitQueue.add(
        WEEKLY_DEBIT_JOB,
        {}, // no payload needed — processor reads from DB
        {
          repeat: {
            pattern: '0 7 * * 1',  // Monday 08:00 WAT (07:00 UTC)
            tz: 'Africa/Lagos',
          },
          jobId: 'weekly-debit-repeatable', // stable ID prevents duplicate schedules
          removeOnComplete: 50,
          removeOnFail: 200,
        },
      );
      this.logger.log('Weekly debit repeatable job registered (Monday 08:00 WAT)');
    } catch (err) {
      this.logger.warn(
        'Redis unavailable — weekly debit job NOT scheduled. Set REDIS_URL in Railway and redeploy.',
        err?.message,
      );
    }
  }

  /**
   * POST /scheduler/trigger-debit — add an immediate one-off job for manual testing.
   * Does NOT affect the scheduled repeatable job.
   */
  async triggerManualDebit(): Promise<{ message: string }> {
    try {
      await this.weeklyDebitQueue.add(
        WEEKLY_DEBIT_JOB,
        { manual: true },
        {
          jobId: `manual-debit-${Date.now()}`,
          removeOnComplete: true,
          removeOnFail: 50,
        },
      );
    } catch (err) {
      this.logger.warn('Trigger debit failed (Redis unavailable):', err?.message);
    }
    return { message: 'Weekly debit job queued — check logs for progress' };
  }
}
