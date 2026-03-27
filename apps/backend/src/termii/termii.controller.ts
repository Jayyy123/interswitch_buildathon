import { Body, Controller, Logger, Post } from '@nestjs/common';
import { TermiiInboundService } from './termii.inbound.service';

/**
 * Termii Inbound SMS Webhook
 *
 * URL to set in Termii dashboard:
 *   https://backend-production-675a9.up.railway.app/termii/inbound
 *
 * Termii sends a POST with body:
 *   { from: "+2347xxx", to: "OMOHEALTH", text: "STATUS", id: "...", ... }
 *
 * No auth guard — Termii webhooks don't send JWT.
 */
@Controller('termii')
export class TermiiController {
  private readonly logger = new Logger(TermiiController.name);

  constructor(private readonly inbound: TermiiInboundService) {}

  @Post('inbound')
  async receiveInbound(@Body() body: Record<string, any>): Promise<{ received: boolean }> {
    const from: string = body.from ?? body.sender ?? body.msisdn ?? '';
    const text: string = body.text ?? body.message ?? body.sms ?? '';

    this.logger.log(`Inbound SMS webhook: from=${from} text="${text}"`);

    if (from && text) {
      // Fire-and-forget — respond 200 immediately, process async
      this.inbound.handle(from, text).catch((err) =>
        this.logger.error(`Inbound SMS handling failed: ${err.message}`),
      );
    }

    return { received: true };
  }
}
