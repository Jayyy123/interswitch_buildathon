import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

// ─── Token Cache ────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number; // unix ms
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface BvnDetails {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  dateOfBirth: string;
}

export interface VirtualAccountResponse {
  accountNumber: string;
  bankName: string;
}

export interface WalletBalance {
  availableBalance: number;
  currency: string;
}

export interface PayoutResult {
  transactionReference: string;
  status: string;
}

export interface BankCode {
  bankCode: string;
  bankName: string;
}

@Injectable()
export class InterswitchService {
  private readonly logger = new Logger(InterswitchService.name);

  // QTB credentials (money movement)
  private readonly qtbClientId: string;
  private readonly qtbSecretKey: string;
  private readonly merchantCode: string;
  private readonly walletId: string;
  private readonly walletPin: string;
  private readonly payItemId: string;

  // Marketplace credentials (identity / safe token)
  private readonly mpClientId: string;
  private readonly mpSecretKey: string;

  private readonly baseUrl: string;
  private readonly walletBaseUrl = 'https://merchant-wallet.k8.isw.la';

  // In-memory token caches
  private qtbCache: TokenCache | null = null;
  private mpCache: TokenCache | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.getOrThrow('INTERSWITCH_BASE_URL');
    this.qtbClientId = this.configService.getOrThrow('INTERSWITCH_CLIENT_ID');
    this.qtbSecretKey = this.configService.getOrThrow('INTERSWITCH_SECRET_KEY');
    this.merchantCode = this.configService.getOrThrow('INTERSWITCH_MERCHANT_CODE');
    this.walletId = this.configService.get('INTERSWITCH_WALLET_ID', '');
    this.walletPin = this.configService.get('INTERSWITCH_WALLET_PIN', '');
    this.payItemId = this.configService.get('INTERSWITCH_PAY_ITEM_ID', '');
    this.mpClientId = this.configService.get('INTERSWITCH_MARKETPLACE_CLIENT_ID', '');
    this.mpSecretKey = this.configService.get('INTERSWITCH_MARKETPLACE_SECRET_KEY', '');
  }

  // ─── Token helpers ──────────────────────────────────────────────────────────

  private basicAuth(clientId: string, secret: string): string {
    return Buffer.from(`${clientId}:${secret}`).toString('base64');
  }

  private async fetchOauthToken(clientId: string, secret: string, scope?: string): Promise<string> {
    const body = scope
      ? `grant_type=client_credentials&scope=${scope}`
      : 'grant_type=client_credentials';
    const { data } = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/passport/oauth/token?grant_type=client_credentials`,
        body,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${this.basicAuth(clientId, secret)}`,
          },
        },
      ),
    );
    return data.access_token as string;
  }

  async getQtbToken(): Promise<string> {
    const now = Date.now();
    if (this.qtbCache && this.qtbCache.expiresAt > now) return this.qtbCache.token;
    const token = await this.fetchOauthToken(this.qtbClientId, this.qtbSecretKey);
    this.qtbCache = { token, expiresAt: now + 55 * 60 * 1000 };
    this.logger.log('QTB OAuth token refreshed');
    return token;
  }

  async getMarketplaceToken(): Promise<string> {
    const now = Date.now();
    if (this.mpCache && this.mpCache.expiresAt > now) return this.mpCache.token;
    if (!this.mpClientId || !this.mpSecretKey) {
      throw new BadRequestException('Marketplace credentials not configured');
    }
    // Marketplace requires scope=profile
    const token = await this.fetchOauthToken(this.mpClientId, this.mpSecretKey, 'profile');
    this.mpCache = { token, expiresAt: now + 29 * 60 * 1000 }; // MP token expires in 30 min
    this.logger.log('Marketplace OAuth token refreshed');
    return token;
  }

  // ─── Marketplace: BVN ───────────────────────────────────────────────────────

  async lookupBvn(bvn: string): Promise<BvnDetails> {
    const token = await this.getMarketplaceToken();
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          'https://api.interswitchgroup.com/api/v1/identity/v2/bvn/details',
          { id: bvn },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        ),
      );
      return {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        phone: data.phoneNumber ?? data.phone,
        dateOfBirth: data.dateOfBirth,
      };
    } catch (err) {
      this.handleError('BVN lookup', err);
    }
  }

  // ─── Marketplace: SafeToken OTP ─────────────────────────────────────────────

  async sendSafeToken(phone: string): Promise<void> {
    const token = await this.getMarketplaceToken();
    await firstValueFrom(
      this.httpService.post(
        'https://api.interswitchgroup.com/api/v1/safetokenservice/api/v1/safetoken/send',
        { phoneNumber: phone, channel: 'SMS' },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      ),
    ).catch((err) => this.handleError('SafeToken send', err));
  }

  async verifySafeToken(phone: string, otp: string): Promise<boolean> {
    const token = await this.getMarketplaceToken();
    try {
      await firstValueFrom(
        this.httpService.post(
          'https://api.interswitchgroup.com/api/v1/safetokenservice/api/v1/safetoken/validate',
          { phoneNumber: phone, otp },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        ),
      );
      return true;
    } catch {
      return false;
    }
  }

  // ─── QTB: Virtual Account ───────────────────────────────────────────────────

  async createVirtualAccount(
    memberName: string,
    phone: string,
    email = '',
  ): Promise<VirtualAccountResponse> {
    const token = await this.getQtbToken();
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/v2/virtualaccounts`,
          {
            merchantCode: this.merchantCode,
            payableCode: this.payItemId,
            currencyCode: 'NGN',
            customerEmail: email,
            customerName: memberName,
            customerMobile: phone,
          },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        ),
      );
      return {
        accountNumber: data.accountNumber ?? data.virtualAccount?.accountNumber,
        bankName: data.bankName ?? data.virtualAccount?.bankName ?? 'Fidelity Bank',
      };
    } catch (err) {
      this.handleError('Virtual account creation', err);
    }
  }

  // ─── QTB: Verify Web Checkout Payment ───────────────────────────────────────

  async verifyPayment(
    transactionRef: string,
    amountKobo: number,
  ): Promise<{ success: boolean; responseCode: string }> {
    const token = await this.getQtbToken();
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/collections/api/v1/gettransaction.json?merchantcode=${this.merchantCode}&transactionreference=${transactionRef}&amount=${amountKobo}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
      return { success: data.ResponseCode === '00', responseCode: data.ResponseCode };
    } catch (err) {
      this.handleError('Payment verification', err);
    }
  }

  // ─── QTB: Wallet Balance ─────────────────────────────────────────────────────

  async getWalletBalance(): Promise<WalletBalance> {
    if (!this.walletId) throw new BadRequestException('Wallet ID not configured');
    const token = await this.getQtbToken();
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.walletBaseUrl}/merchant-wallet/api/v1/wallet/balance/${this.merchantCode}?walletId=${this.walletId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
      return { availableBalance: data.availableBalance, currency: 'NGN' };
    } catch (err) {
      this.handleError('Wallet balance', err);
    }
  }

  // ─── QTB: Payout to Hospital ─────────────────────────────────────────────────

  async payoutToHospital(
    claimId: string,
    amountNaira: number,
    memberName: string,
    hospitalName: string,
    recipientAccount: string,
    recipientBankCode: string,
  ): Promise<PayoutResult> {
    if (!this.walletId || !this.walletPin) {
      throw new BadRequestException('Wallet credentials not configured');
    }
    const token = await this.getQtbToken();
    const transactionReference = `OMOH-CLAIM-${claimId}-${Date.now()}`;
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.walletBaseUrl}/merchant-wallet/api/v1/payouts`,
          {
            transactionReference,
            payoutChannel: 'BANK_TRANSFER',
            currencyCode: 'NGN',
            amount: amountNaira, // Naira, NOT kobo
            narration: `OmoHealth claim - ${memberName} - ${hospitalName}`,
            walletDetails: { pin: this.walletPin, walletId: this.walletId },
            recipient: {
              recipientAccount,
              recipientBank: recipientBankCode,
              currencyCode: 'NGN',
            },
            singleCall: true,
          },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        ),
      );
      return { transactionReference, status: 'INITIATED' };
    } catch (err) {
      this.handleError('Payout', err);
    }
  }

  // ─── QTB: Payout Status ──────────────────────────────────────────────────────

  async getPayoutStatus(transactionRef: string): Promise<{ status: string; successful: boolean }> {
    const token = await this.getQtbToken();
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.walletBaseUrl}/merchant-wallet/api/v1/payouts/${transactionRef}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
      const status = (data.status ?? '') as string;
      return { status, successful: status.toUpperCase() === 'SUCCESSFUL' };
    } catch (err) {
      this.handleError('Payout status', err);
    }
  }

  // ─── QTB: Bank Codes ─────────────────────────────────────────────────────────

  async getBankCodes(): Promise<BankCode[]> {
    const token = await this.getQtbToken();
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.walletBaseUrl}/merchant-wallet/api/v1/payouts/banks`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
      return (data as any[]).map((b) => ({
        bankCode: b.bankCode ?? b.code,
        bankName: b.bankName ?? b.name,
      }));
    } catch (err) {
      this.handleError('Bank codes', err);
    }
  }

  // ─── Error helper ────────────────────────────────────────────────────────────

  private handleError(context: string, err: unknown): never {
    const axiosErr = err as AxiosError;
    this.logger.error(`${context} failed`, axiosErr.response?.data ?? (err as Error).message);
    throw new BadRequestException(`${context} failed: ${axiosErr.response?.statusText ?? (err as Error).message}`);
  }
}
