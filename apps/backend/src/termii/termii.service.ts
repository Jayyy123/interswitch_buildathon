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
      this.logger.error(`Termii send failed to ${intlPhone}`, err?.response?.data ?? err.message);
    }
  }

  /** Public wrapper for ad-hoc messages (e.g. from inbound keyword handlers) */
  async sendRaw(to: string, sms: string): Promise<void> {
    await this.send(to, sms);
  }

  // ─── OTP ──────────────────────────────────────────────────────────────────

  async sendOtp(phone: string, code: string): Promise<void> {
    await this.send(
      phone,
      `Your OmoHealth OTP is: ${code}. Valid for 5 minutes. Do not share this code.`,
    );
  }

  // ─── 1. Onboarding ────────────────────────────────────────────────────────

  async sendOnboarding(
    phone: string,
    name: string,
    associationName: string,
    plan: string,
    weeklyAmt: number,
    startDate: string,
    clinicName?: string,
    clinicAddress?: string,
  ): Promise<void> {
    const clinic = clinicName
      ? `\nNearest clinic: ${clinicName}${clinicAddress ? ', ' + clinicAddress : ''}.`
      : '';
    await this.send(
      phone,
      `E kaabo, ${name}. You have been enrolled in ${associationName} OmoHealth.\n` +
      `Coverage: ${plan}. Starts ${startDate}.\n` +
      `NGN ${weeklyAmt.toLocaleString()} debits every Monday from your OmoHealth wallet.` +
      `${clinic}\n` +
      `Questions? Reply INFO.`,
    );
  }

  // ─── 2. Wallet Setup ──────────────────────────────────────────────────────

  async sendWalletSetup(
    phone: string,
    name: string,
    accountNumber: string,
    bankName: string,
    weeklyAmt: number,
  ): Promise<void> {
    await this.send(
      phone,
      `${name}, your OmoHealth wallet:\n` +
      `Account: ${accountNumber} (${bankName})\n` +
      `To fund: Dial *770*${accountNumber}*${weeklyAmt}#\n` +
      `Or visit any Quickteller agent with account number.\n` +
      `NGN ${weeklyAmt.toLocaleString()} debits every Monday once funded.`,
    );
  }

  // ─── 3. Weekly Contribution Confirmed ─────────────────────────────────────

  async sendContributionConfirmed(
    phone: string,
    name: string,
    weekNumber: number,
    amount: number,
    poolBalance: number,
    covered: boolean,
  ): Promise<void> {
    const coverStatus = covered ? 'You are COVERED.' : 'Checking coverage…';
    await this.send(
      phone,
      `OmoHealth: NGN ${amount.toLocaleString()} deducted. Week ${weekNumber}.\n` +
      `Pool balance: NGN ${poolBalance.toLocaleString()}. ${coverStatus}\n` +
      `Reply STATUS for your coverage details.`,
    );
  }

  // ─── 4. Payment Failed ────────────────────────────────────────────────────

  async sendPaymentFailed(
    phone: string,
    name: string,
    amount: number,
    accountNumber: string,
  ): Promise<void> {
    await this.send(
      phone,
      `OmoHealth: NGN ${amount.toLocaleString()} debit failed this week.\n` +
      `Top up your wallet within 48hrs to stay covered.\n` +
      `Dial *770*${accountNumber}*${amount}# to fund now.\n` +
      `Coverage pauses if not resolved.`,
    );
  }

  // ─── 5. Coverage Paused ───────────────────────────────────────────────────

  async sendCoveragePaused(phone: string, name: string): Promise<void> {
    await this.send(
      phone,
      `OmoHealth: ${name}, your coverage is now PAUSED.\n` +
      `Claims are not eligible while paused.\n` +
      `Fund your wallet and reply START to reactivate.`,
    );
  }

  // ─── 6. Claim Confirmed ───────────────────────────────────────────────────

  async sendClaimConfirmed(
    phone: string,
    name: string,
    amount: number,
    hospital: string,
    date?: string,
    remainingCover?: number,
  ): Promise<void> {
    const dateStr = date ?? new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
    const remaining = remainingCover != null
      ? `\nRemaining annual cover: NGN ${remainingCover.toLocaleString()}.`
      : '';
    await this.send(
      phone,
      `OmoHealth: NGN ${amount.toLocaleString()} paid to ${hospital} on ${dateStr}.` +
      `${remaining}\n` +
      `Get well soon.`,
    );
  }

  // ─── 7. Emergency Levy Request ────────────────────────────────────────────

  async sendEmergencyLevy(
    phone: string,
    patientName: string,
    poolCap: number,
    totalNeeded: number,
    yourShare: number,
  ): Promise<void> {
    await this.send(
      phone,
      `OmoHealth: ${patientName} needs emergency care.\n` +
      `Pool has paid its NGN ${poolCap.toLocaleString()} cap. NGN ${totalNeeded.toLocaleString()} still owed.\n` +
      `Your share: NGN ${yourShare.toLocaleString()}. Reply YES to contribute.\n` +
      `Voluntary. All YES replies deducted and sent to hospital.`,
    );
  }

  // ─── 8. Status Reply (inbound STATUS keyword) ─────────────────────────────

  async sendStatusReply(
    phone: string,
    name: string,
    plan: string,
    status: 'ACTIVE' | 'PAUSED' | 'FLAGGED',
    coverageUsed: number,
    coverageLimit: number,
    contributionWeeks: number,
    accountNumber?: string,
    bankName?: string,
    clinicName?: string,
    clinicAddress?: string,
  ): Promise<void> {
    const remaining = coverageLimit - coverageUsed;
    const clinic = clinicName
      ? `\nNearest clinic: ${clinicName}${clinicAddress ? ', ' + clinicAddress : ''}`
      : '';
    await this.send(
      phone,
      `${name} | ${plan} Plan | ${status}\n` +
      `Covered to: NGN ${coverageLimit.toLocaleString()}/yr\n` +
      `Used: NGN ${coverageUsed.toLocaleString()} | Remaining: NGN ${remaining.toLocaleString()}\n` +
      `Contributions: ${contributionWeeks}-week streak` +
      `${clinic}`,
    );
  }

  // ─── 9. INFO Menu ─────────────────────────────────────────────────────────

  async sendInfoMenu(phone: string, name?: string): Promise<void> {
    const greeting = name ? `Hi ${name}. ` : '';
    await this.send(
      phone,
      `${greeting}OmoHealth Info Menu:\n` +
      `1. My Coverage Status\n` +
      `2. My Account Details\n` +
      `3. How to Fund Wallet\n` +
      `4. Contribution History\n` +
      `Reply with a number (1-4).`,
    );
  }

  // ─── 10. Account Details (reply to menu option 2) ─────────────────────────

  async sendAccountDetails(
    phone: string,
    name: string,
    accountNumber: string,
    bankName: string,
    weeklyAmt: number,
  ): Promise<void> {
    await this.send(
      phone,
      `${name}, your OmoHealth account:\n` +
      `Bank: ${bankName}\n` +
      `Account: ${accountNumber}\n` +
      `Weekly debit: NGN ${weeklyAmt.toLocaleString()} every Monday.\n` +
      `Dial *770*${accountNumber}*${weeklyAmt}# to fund.`,
    );
  }

  // ─── 11. Fund Wallet Instructions (reply to menu option 3) ───────────────

  async sendFundWalletInstructions(
    phone: string,
    name: string,
    accountNumber: string,
    weeklyAmt: number,
  ): Promise<void> {
    await this.send(
      phone,
      `${name}, how to fund your OmoHealth wallet:\n` +
      `1. USSD: Dial *770*${accountNumber}*[amount]#\n` +
      `2. Bank transfer to account: ${accountNumber}\n` +
      `3. Quickteller agent: use account number above.\n` +
      `Minimum top-up: NGN ${weeklyAmt.toLocaleString()}.`,
    );
  }

  // ─── 12. Contribution History (reply to menu option 4) ────────────────────

  async sendContributionHistory(
    phone: string,
    name: string,
    totalWeeks: number,
    totalPaid: number,
  ): Promise<void> {
    await this.send(
      phone,
      `${name}, your OmoHealth contributions:\n` +
      `Weeks paid: ${totalWeeks}\n` +
      `Total contributed: NGN ${totalPaid.toLocaleString()}\n` +
      `Reply STATUS for full coverage details.`,
    );
  }

  // ─── 13. Join Info (reply to JOIN keyword) ────────────────────────────────

  async sendJoinInfo(phone: string): Promise<void> {
    await this.send(
      phone,
      `OmoHealth Individual Plan:\n` +
      `NGN 500/week. Up to NGN 75,000 coverage/year.\n` +
      `To join, ask your market association Iyaloja to enroll you.\n` +
      `Or visit omohealth.ng for more information.`,
    );
  }

  // ─── 14. Non-Member Reply ─────────────────────────────────────────────────

  async sendNonMemberReply(phone: string): Promise<void> {
    await this.send(
      phone,
      `You texted OmoHealth but you are not registered.\n` +
      `Ask your association admin to enroll you.\n` +
      `Or reply JOIN for an individual NGN 500/week plan.`,
    );
  }

  // ─── 15. START Reactivation Confirmation ──────────────────────────────────

  async sendReactivationConfirmed(phone: string, name: string): Promise<void> {
    await this.send(
      phone,
      `OmoHealth: ${name}, your coverage has been reactivated.\n` +
      `You are now ACTIVE and covered.\n` +
      `Reply STATUS to check your coverage details.`,
    );
  }

  // ─── 16. Levy Contribution Confirmed ──────────────────────────────────────

  async sendLevyConfirmed(phone: string, name: string, amount: number): Promise<void> {
    await this.send(
      phone,
      `OmoHealth: Thank you, ${name}.\n` +
      `NGN ${amount.toLocaleString()} emergency levy contribution recorded.\n` +
      `It will be deducted from your wallet in the next cycle.`,
    );
  }

  // ─── Backward-compatible aliases ──────────────────────────────────────────

  async sendEnrollmentSms(
    phone: string,
    assocName: string,
    plan: string,
    weeklyAmt: number,
    startDate: string,
    clinic?: string,
  ): Promise<void> {
    await this.sendOnboarding(phone, assocName, assocName, plan, weeklyAmt, startDate, clinic);
  }

  async sendWalletSetupSms(
    phone: string,
    name: string,
    acct: string,
    bank: string,
    weeklyAmt: number,
  ): Promise<void> {
    await this.sendWalletSetup(phone, name, acct, bank, weeklyAmt);
  }

  async sendContributionConfirmedSms(
    phone: string,
    weekNumber: number,
    amount: number,
    poolBalance: number,
  ): Promise<void> {
    await this.sendContributionConfirmed(phone, 'Member', weekNumber, amount, poolBalance, true);
  }

  async sendDebitFailedSms(
    phone: string,
    amount: number,
    accountNumber: string,
  ): Promise<void> {
    await this.sendPaymentFailed(phone, 'Member', amount, accountNumber || '0000000000');
  }

  async sendCoveragePausedSms(phone: string, name: string): Promise<void> {
    await this.sendCoveragePaused(phone, name);
  }

  async sendClaimPaidSms(
    phone: string,
    amount: number,
    hospitalName: string,
    date: string,
    remaining: number,
  ): Promise<void> {
    await this.sendClaimConfirmed(phone, 'Member', amount, hospitalName, date, remaining);
  }
}
