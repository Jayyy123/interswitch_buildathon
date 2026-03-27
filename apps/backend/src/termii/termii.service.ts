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

  // ─── Core sender — never throws, always logs ──────────────────────────────

  private async send(to: string, sms: string): Promise<void> {
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
      this.logger.error(
        `Termii send failed to ${intlPhone}`,
        err?.response?.data ?? err?.message,
      );
    }
  }

  // ─── OTP ──────────────────────────────────────────────────────────────────

  async sendOtp(phone: string, code: string): Promise<void> {
    await this.send(
      phone,
      `Your OmoHealth OTP is: ${code}. Valid for 5 minutes. Do not share this code.`,
    );
  }

  // ─── Enrollment (sent when member record is created) ──────────────────────

  async sendEnrollmentSms(
    phone: string,
    associationName: string,
    plan: string,
    weeklyAmount: number,
    startDate: string,
    clinicName?: string,
  ): Promise<void> {
    const clinic = clinicName ?? 'your nearest partner clinic';
    const naira = weeklyAmount.toLocaleString('en-NG');
    await this.send(
      phone,
      `E kaabo. You have been enrolled in ${associationName} OmoHealth.\n` +
        `Coverage: ${plan}. Starts ${startDate}.\n` +
        `N${naira} debits every Monday from your OmoHealth wallet.\n` +
        `Nearest clinic: ${clinic}.\n` +
        `Questions? Reply INFO.`,
    );
  }

  // ─── Wallet setup (sent after background wallet provisioning completes) ────

  async sendWalletSetupSms(
    phone: string,
    name: string,
    accountNumber: string,
    bankName: string,
    weeklyAmount: number,
  ): Promise<void> {
    const naira = weeklyAmount.toLocaleString('en-NG');
    await this.send(
      phone,
      `${name}, your OmoHealth wallet:\n` +
        `Account: ${accountNumber} (${bankName})\n` +
        `To fund: Dial *770*${accountNumber}*${naira}#\n` +
        `Or visit any Quickteller agent with account number.\n` +
        `N${naira} debits every Monday once funded.`,
    );
  }

  // ─── Weekly contribution confirmed ────────────────────────────────────────

  async sendContributionConfirmedSms(
    phone: string,
    weekNumber: number,
    amount: number,
    poolBalance: number,
  ): Promise<void> {
    await this.send(
      phone,
      `OmoHealth: N${amount.toLocaleString('en-NG')} deducted. Week ${weekNumber}.\n` +
        `Pool balance: N${poolBalance.toLocaleString('en-NG')}. You are COVERED.\n` +
        `Reply STATUS for your coverage details.`,
    );
  }

  // ─── Debit failed (48-hour grace window opens) ────────────────────────────

  async sendDebitFailedSms(
    phone: string,
    amount: number,
    accountNumber: string,
  ): Promise<void> {
    const naira = amount.toLocaleString('en-NG');
    await this.send(
      phone,
      `OmoHealth: N${naira} debit failed this week.\n` +
        `Top up your wallet within 48hrs to stay covered.\n` +
        `Dial *770*${accountNumber}*${naira}# to fund now.\n` +
        `Coverage pauses if not resolved.`,
    );
  }

  // ─── Coverage paused (after grace period expires) ─────────────────────────

  async sendCoveragePausedSms(phone: string, name: string): Promise<void> {
    await this.send(
      phone,
      `OmoHealth: ${name}, your coverage is now PAUSED.\n` +
        `Claims are not eligible while paused.\n` +
        `Fund your wallet and reply START to reactivate.`,
    );
  }

  // ─── Coverage reactivated (START reply received) ──────────────────────────

  async sendCoverageReactivatedSms(phone: string, name: string): Promise<void> {
    await this.send(
      phone,
      `OmoHealth: ${name}, your coverage has been reactivated. Welcome back!\n` +
        `Weekly debits resume next Monday.`,
    );
  }

  // ─── Claim paid ───────────────────────────────────────────────────────────

  async sendClaimPaidSms(
    phone: string,
    amount: number,
    hospitalName: string,
    date: string,
    remainingCover: number,
  ): Promise<void> {
    await this.send(
      phone,
      `OmoHealth: N${amount.toLocaleString('en-NG')} paid to ${hospitalName} on ${date}.\n` +
        `Remaining annual cover: N${remainingCover.toLocaleString('en-NG')}.\n` +
        `Get well soon.`,
    );
  }

  // ─── Emergency levy ───────────────────────────────────────────────────────

  async sendEmergencyLevySms(
    phone: string,
    patientName: string,
    poolCap: number,
    totalOwed: number,
    memberShare: number,
  ): Promise<void> {
    await this.send(
      phone,
      `OmoHealth: ${patientName} needs emergency care.\n` +
        `Pool has paid its N${poolCap.toLocaleString('en-NG')} cap. N${totalOwed.toLocaleString('en-NG')} still owed.\n` +
        `Your share: N${memberShare.toLocaleString('en-NG')}. Reply YES to contribute.\n` +
        `Voluntary. All YES replies deducted and sent to hospital.`,
    );
  }

  // ─── Status reply (on SMS keyword STATUS) ────────────────────────────────

  async sendStatusReplySms(
    phone: string,
    name: string,
    plan: string,
    memberStatus: string,
    coverageUsed: number,
    coverageLimit: number,
    streakWeeks: number,
    clinicName?: string,
  ): Promise<void> {
    const remaining = Math.max(0, coverageLimit - coverageUsed);
    const clinic = clinicName ? `\nNearest clinic: ${clinicName}` : '';
    await this.send(
      phone,
      `${name} | ${plan} Plan | ${memberStatus}\n` +
        `Covered to: N${coverageLimit.toLocaleString('en-NG')}/yr\n` +
        `Used: N${coverageUsed.toLocaleString('en-NG')} | Remaining: N${remaining.toLocaleString('en-NG')}\n` +
        `Contributions: ${streakWeeks}-week streak${clinic}`,
    );
  }

  // ─── Non-member inbound ───────────────────────────────────────────────────

  async sendNonMemberReplySms(phone: string): Promise<void> {
    await this.send(
      phone,
      `You texted OmoHealth but you are not registered.\n` +
        `Ask your association admin to enroll you.\n` +
        `Or reply JOIN for an individual N500/week plan.`,
    );
  }
}
