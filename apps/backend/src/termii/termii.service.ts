import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { toInternational } from '../common/phone.util';

@Injectable()
export class TermiiService {
  private readonly logger = new Logger(TermiiService.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.getOrThrow('TERMII_API_KEY');
    this.senderId = this.configService.getOrThrow('TERMII_SENDER_ID');
    this.baseUrl = this.configService.getOrThrow('TERMII_BASE_URL');
  }

  private async send(to: string, sms: string): Promise<void> {
    // Always normalise to +234 format — Termii rejects local 07... format
    const intlPhone = toInternational(to);
    try {
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/sms/send`, {
          api_key: this.apiKey,
          to: intlPhone,
          from: this.senderId,
          sms,
          type: 'plain',
          channel: 'generic',
        }),
      );
      this.logger.log(`SMS sent to ${intlPhone.slice(0, 8)}***`);
    } catch (err) {
      // Log but never throw — SMS failure must not break the primary flow
      this.logger.error(`Termii send failed to ${intlPhone}`, err?.response?.data ?? err.message);
    }
  }

  // ─── OTP ──────────────────────────────────────────────────────────────────

  async sendOtp(phone: string, code: string): Promise<void> {
    await this.send(
      phone,
      `Your OmoHealth OTP is: ${code}. Valid for 5 minutes. Do not share this code.`,
    );
  }

  // ─── Onboarding ───────────────────────────────────────────────────────────

  async sendOnboarding(phone: string, name: string, plan: string, clinicUrl?: string): Promise<void> {
    const clinic = clinicUrl ? ` View your coverage: ${clinicUrl}` : '';
    await this.send(
      phone,
      `Welcome to OmoHealth, ${name}! You are now covered under the ${plan} plan.${clinic} Reply STATUS to check coverage anytime.`,
    );
  }

  // ─── Wallet Setup ─────────────────────────────────────────────────────────

  async sendWalletSetup(phone: string, name: string, amount: number): Promise<void> {
    await this.send(
      phone,
      `Hi ${name}, fund your OmoHealth wallet with at least NGN ${amount.toLocaleString()} to activate your health coverage. Contact your Iyaloja for payment details.`,
    );
  }

  // ─── Weekly Contribution Confirmed ────────────────────────────────────────

  async sendContributionConfirmed(phone: string, name: string, amount: number, poolBalance: number): Promise<void> {
    await this.send(
      phone,
      `OmoHealth: NGN ${amount.toLocaleString()} contribution received for ${name}. Pool balance: NGN ${poolBalance.toLocaleString()}. Thank you!`,
    );
  }

  // ─── Payment Failed ───────────────────────────────────────────────────────

  async sendPaymentFailed(phone: string, name: string, amount: number): Promise<void> {
    await this.send(
      phone,
      `OmoHealth: NGN ${amount.toLocaleString()} contribution for ${name} failed — insufficient wallet balance. Please top up within 3 days to keep your coverage active.`,
    );
  }

  // ─── Coverage Paused ──────────────────────────────────────────────────────

  async sendCoveragePaused(phone: string, name: string): Promise<void> {
    await this.send(
      phone,
      `OmoHealth: Coverage for ${name} has been paused due to missed contributions. Reply START to reactivate, or contact your Iyaloja.`,
    );
  }

  // ─── Claim Confirmed ──────────────────────────────────────────────────────

  async sendClaimConfirmed(phone: string, name: string, amount: number, hospital: string): Promise<void> {
    await this.send(
      phone,
      `OmoHealth: NGN ${amount.toLocaleString()} approved and sent to ${hospital} for ${name}. Stay strong!`,
    );
  }

  // ─── Emergency Levy Request ───────────────────────────────────────────────

  async sendEmergencyLevy(
    phone: string,
    memberName: string,
    levyAmount: number,
    totalNeeded: number,
  ): Promise<void> {
    await this.send(
      phone,
      `OmoHealth URGENT: ${memberName} needs NGN ${totalNeeded.toLocaleString()} for emergency care. Your share is NGN ${levyAmount.toLocaleString()}. Reply YES to contribute now.`,
    );
  }

  // ─── Status Reply ─────────────────────────────────────────────────────────

  async sendStatusReply(
    phone: string,
    name: string,
    status: 'COVERED' | 'PAUSED' | 'FLAGGED',
    coverageUsed: number,
    coverageLimit: number,
    nextDebit: string,
  ): Promise<void> {
    const statusLabel =
      status === 'COVERED' ? '✅ COVERED' : status === 'PAUSED' ? '⏸ PAUSED' : '🚫 FLAGGED';
    const remaining = coverageLimit - coverageUsed;
    await this.send(
      phone,
      `OmoHealth Status for ${name}: ${statusLabel}. Used: NGN ${coverageUsed.toLocaleString()} of NGN ${coverageLimit.toLocaleString()}. Remaining: NGN ${remaining.toLocaleString()}. Next debit: ${nextDebit}.`,
    );
  }

  // ─── Non-Member Inbound ───────────────────────────────────────────────────

  async sendNonMemberReply(phone: string): Promise<void> {
    await this.send(
      phone,
      `OmoHealth: We could not find your number in our system. Ask your market association Iyaloja to enroll you, or visit omohealth.ng for more information.`,
    );
  }

  // ─── Backward-compatible aliases — callers in scheduler / members / payments
  //     use the old *Sms names; these shim to the new methods.
  //     TODO: update callers and remove in next cleanup sprint.

  async sendEnrollmentSms(phone: string, assocName: string, plan: string, _weeklyAmt: number, _startDate: string, _clinic?: string): Promise<void> {
    await this.sendOnboarding(phone, assocName, plan);
  }

  async sendWalletSetupSms(phone: string, name: string, _acct: string, _bank: string, weeklyAmt: number): Promise<void> {
    await this.sendWalletSetup(phone, name, weeklyAmt);
  }

  async sendContributionConfirmedSms(phone: string, weekNumber: number, amount: number, poolBalance: number): Promise<void> {
    await this.sendContributionConfirmed(phone, `Week ${weekNumber}`, amount, poolBalance);
  }

  async sendDebitFailedSms(phone: string, amount: number, _accountNumber: string): Promise<void> {
    await this.sendPaymentFailed(phone, 'Member', amount);
  }

  async sendCoveragePausedSms(phone: string, name: string): Promise<void> {
    await this.sendCoveragePaused(phone, name);
  }

  async sendClaimPaidSms(phone: string, amount: number, hospitalName: string, _date: string, _remaining: number): Promise<void> {
    await this.sendClaimConfirmed(phone, 'Member', amount, hospitalName);
  }
}
