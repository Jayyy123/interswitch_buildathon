import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { createHash, randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';

// ─── Token Cache ──────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number;
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

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
  availableBalance: number; // in kobo — divide by 100 for NGN
  ledgerBalance: number;
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

// ─── Comprehensive Nigerian bank list (fallback when live endpoint unavailable) ─

const NIGERIAN_BANKS: BankCode[] = [
  // Commercial Banks
  { bankCode: '044', bankName: 'Access Bank' },
  { bankCode: '063', bankName: 'Access Bank (Diamond)' },
  { bankCode: '023', bankName: 'Citibank' },
  { bankCode: '050', bankName: 'Ecobank Nigeria' },
  { bankCode: '011', bankName: 'First Bank of Nigeria' },
  { bankCode: '214', bankName: 'First City Monument Bank (FCMB)' },
  { bankCode: '070', bankName: 'Fidelity Bank' },
  { bankCode: '058', bankName: 'Guaranty Trust Bank' },
  { bankCode: '030', bankName: 'Heritage Bank' },
  { bankCode: '301', bankName: 'Jaiz Bank' },
  { bankCode: '082', bankName: 'Keystone Bank' },
  { bankCode: '076', bankName: 'Polaris Bank' },
  { bankCode: '101', bankName: 'Providus Bank' },
  { bankCode: '221', bankName: 'Stanbic IBTC Bank' },
  { bankCode: '068', bankName: 'Standard Chartered' },
  { bankCode: '232', bankName: 'Sterling Bank' },
  { bankCode: '100', bankName: 'SunTrust Bank' },
  { bankCode: '032', bankName: 'Union Bank Nigeria' },
  { bankCode: '033', bankName: 'United Bank for Africa (UBA)' },
  { bankCode: '215', bankName: 'Unity Bank' },
  { bankCode: '035', bankName: 'Wema Bank' },
  { bankCode: '057', bankName: 'Zenith Bank' },
  { bankCode: '000', bankName: 'Globus Bank' },
  { bankCode: '102', bankName: 'Titan Trust Bank' },
  { bankCode: '103', bankName: 'Lotus Bank' },
  { bankCode: '104', bankName: 'Premium Trust Bank' },
  { bankCode: '105', bankName: 'Parallex Bank' },
  // MFBs & Fintechs (NIP codes)
  { bankCode: '090405', bankName: 'Moniepoint MFB' },
  { bankCode: '090267', bankName: 'Kuda MFB' },
  { bankCode: '100004', bankName: 'Opay (Paycom)' },
  { bankCode: '100033', bankName: 'PalmPay' },
  { bankCode: '090525', bankName: 'Rubies MFB' },
  { bankCode: '090286', bankName: 'Safe Haven MFB' },
  { bankCode: '090325', bankName: 'Sparkle MFB' },
  { bankCode: '090551', bankName: 'FairMoney MFB' },
  { bankCode: '090110', bankName: 'VFD MFB (VBank)' },
  { bankCode: '090328', bankName: 'Eyowo' },
  { bankCode: '090426', bankName: 'Tangerine Money' },
  { bankCode: '090303', bankName: 'PurpleMoney MFB' },
];

@Injectable()
export class InterswitchService {
  private readonly logger = new Logger(InterswitchService.name);

  // ── Passport (token) base
  private readonly passportUrl = 'https://qa.interswitchng.com';

  // ── QTB credentials (payment gateway, virtual accounts)
  private readonly qtbClientId: string;
  private readonly qtbSecretKey: string;
  private readonly merchantCode: string;
  private readonly payItemId: string;

  // ── Marketplace credentials (BVN, SafeToken)
  private readonly mpClientId: string;
  private readonly mpSecretKey: string;

  // ── General Integration / Wallet credentials (MX275969)
  private readonly walletClientId: string;
  private readonly walletSecretKey: string;
  private readonly walletMerchantCode = 'MX275969';
  private readonly walletId: string;
  private readonly walletPin: string;

  // ── Hosts
  private readonly bvnHost = 'api-marketplace-routing.k8.isw.la';    // BVN lookup
  private readonly safeTokenHost = 'api.interswitchgroup.com';          // SafeToken
  private readonly walletGatewayHost = 'api-gateway.interswitchng.com'; // Generic wallet transfers

  // ── SVA credentials (quicktellerservice — bank list with TerminalID)
  private readonly svaClientId = 'INTERSWITCH_SVA_CLIENT_ID';
  private readonly svaSecretKey = 'INTERSWITCH_SVA_SECRET_KEY';
  private readonly terminalId = '3PBL0001';

  private qtbCache: TokenCache | null = null;
  private mpCache: TokenCache | null = null;
  private walletCache: TokenCache | null = null;
  private svaCache: TokenCache | null = null;
  private giCache: TokenCache | null = null; // GI/MX6072 — virtual accounts

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.qtbClientId  = this.configService.getOrThrow('INTERSWITCH_CLIENT_ID');
    this.qtbSecretKey = this.configService.getOrThrow('INTERSWITCH_SECRET_KEY');
    this.merchantCode = this.configService.getOrThrow('INTERSWITCH_MERCHANT_CODE');
    this.payItemId    = this.configService.get('INTERSWITCH_PAY_ITEM_ID', '9405967');
    this.mpClientId   = this.configService.getOrThrow('INTERSWITCH_MARKETPLACE_CLIENT_ID');
    this.mpSecretKey  = this.configService.getOrThrow('INTERSWITCH_MARKETPLACE_SECRET_KEY');
    // Wallet (MX275969) — using QTB credentials (same merchant account)
    this.walletClientId  = this.configService.get('INTERSWITCH_WALLET_CLIENT_ID', this.qtbClientId);
    this.walletSecretKey = this.configService.get('INTERSWITCH_WALLET_SECRET_KEY', this.qtbSecretKey);
    this.walletId        = this.configService.get('INTERSWITCH_WALLET_ID', '2700014982');
    this.walletPin       = this.configService.get('INTERSWITCH_WALLET_PIN', '1234');
  }

  // ─── Token helpers ────────────────────────────────────────────────────────────

  private basicAuth(id: string, secret: string) {
    return Buffer.from(`${id}:${secret}`).toString('base64');
  }

  private async fetchOauthToken(clientId: string, secret: string, scope?: string): Promise<string> {
    const body = 'grant_type=client_credentials' + (scope ? `&scope=${scope}` : '');
    const { data } = await firstValueFrom(
      this.httpService.post(
        `${this.passportUrl}/passport/oauth/token?grant_type=client_credentials`,
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
    this.logger.log('QTB token refreshed');
    return token;
  }

  async getMarketplaceToken(): Promise<string> {
    const now = Date.now();
    if (this.mpCache && this.mpCache.expiresAt > now) return this.mpCache.token;
    const token = await this.fetchOauthToken(this.mpClientId, this.mpSecretKey, 'profile');
    this.mpCache = { token, expiresAt: now + 29 * 60 * 1000 }; // 30min token
    this.logger.log('Marketplace token refreshed');
    return token;
  }

  async getWalletToken(): Promise<string> {
    const now = Date.now();
    if (this.walletCache && this.walletCache.expiresAt > now) return this.walletCache.token;
    const token = await this.fetchOauthToken(this.walletClientId, this.walletSecretKey);
    this.walletCache = { token, expiresAt: now + 12 * 60 * 60 * 1000 };
    this.logger.log('Wallet (General Integration) token refreshed');
    return token;
  }

  async getSvaToken(): Promise<string | null> {
    const now = Date.now();
    if (this.svaCache && this.svaCache.expiresAt > now) return this.svaCache.token;
    try {
      const token = await this.fetchOauthToken(this.svaClientId, this.svaSecretKey);
      this.svaCache = { token, expiresAt: now + 30 * 60 * 1000 }; // 30 min conservative
      this.logger.log('SVA token refreshed');
      return token;
    } catch {
      this.logger.warn('SVA token fetch failed — bank list will use static fallback');
      return null;
    }
  }

  // GI/MX6072 token — for virtual account creation (CONFIRMED WORKING in sweep)
  async getGIToken(): Promise<string> {
    const now = Date.now();
    if (this.giCache && this.giCache.expiresAt > now) return this.giCache.token;
    // GI credentials are hardcoded per confirmed sweep result
    const token = await this.fetchOauthToken(
      'INTERSWITCH_GI_CLIENT_ID',
      'secret',
    );
    this.giCache = { token, expiresAt: now + 55 * 60 * 1000 };
    this.logger.log('GI (MX6072) token refreshed');
    return token;
  }

  async lookupBvn(bvn: string): Promise<BvnDetails> {
    // Dedicated BVN credentials — confirmed working on api-marketplace-routing host
    const bvnClientId = 'INTERSWITCH_BVN_CLIENT_ID';
    const bvnSecret   = 'INTERSWITCH_BVN_SECRET_KEY';
    const token = await this.fetchOauthToken(bvnClientId, bvnSecret, 'profile');
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `https://${this.bvnHost}/marketplace-routing/api/v1/verify/identity/bvn/verify`,
          { id: bvn },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        ),
      );
      return {
        firstName: data.firstName ?? data.first_name,
        lastName: data.lastName ?? data.last_name,
        middleName: data.middleName ?? data.middle_name,
        phone: data.phoneNumber ?? data.phone ?? data.mobileNumber,
        dateOfBirth: data.dateOfBirth ?? data.dob,
      };
    } catch (err) {
      this.handleError('BVN lookup', err);
    }
  }

  // ─── Marketplace: SafeToken OTP ───────────────────────────────────────────────

  async sendSafeToken(phone: string): Promise<void> {
    const token = await this.getMarketplaceToken();
    await firstValueFrom(
      this.httpService.post(
        `https://${this.safeTokenHost}/api/v1/safetokenservice/api/v1/safetoken/send`,
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
          `https://${this.safeTokenHost}/api/v1/safetokenservice/api/v1/safetoken/validate`,
          { phoneNumber: phone, otp },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        ),
      );
      return true;
    } catch {
      return false;
    }
  }

  // ─── Virtual Account (GI creds — confirmed working) ─────────────────────────

  async createVirtualAccount(
    memberName: string,
    phone: string,
    amountKobo = 60000,
    email = '',
  ): Promise<VirtualAccountResponse> {
    // CONFIRMED: GI/MX6072 ✅  |  QTB/MX275969 ❌ (No Virtual account linked)
    const token = await this.getGIToken();
    const transactionReference = `OMOH-VA-${Date.now()}`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.passportUrl}/paymentgateway/api/v1/virtualaccounts/transaction`,
          {
            merchantCode: 'MX6072',        // GI merchant — Wema Bank virtual accounts
            payableCode: '9405967',         // GI pay item
            currencyCode: '566',            // NGN
            amount: String(amountKobo),
            accountName: memberName,
            transactionReference,
          },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        ),
      );
      return {
        accountNumber: data.accountNumber,
        bankName: data.bankName ?? 'Wema Bank',
        transactionReference,
      } as any;
    } catch (err) {
      this.handleError('Virtual account creation', err);
    }
  }

  // ─── Merchant Wallet: Create Sub-Wallet for a member/entity ──────────────────
  // CONFIRMED WORKING on merchant-wallet.k8.isw.la with GI/MX6072 token.
  // Phone MUST be local format: 08XXXXXXXXX (not +234...).
  // Returns walletId (e.g. "2700015020") which can be stored on the Member record.
  // provider: 'PRIME' = domestic NGN wallet.

  async createMemberWallet(
    name: string,
    phone: string,          // must be 08XXXXXXXXX format
    email: string,
    pin = '1234',
  ): Promise<{ walletId: string; settlementAccountNumber: string; status: string }> {
    const token = await this.getGIToken();
    // Normalise phone: strip +234 prefix → 0XXXXXXXXX
    const localPhone = phone.startsWith('+234') ? '0' + phone.slice(4) : phone;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `https://merchant-wallet.k8.isw.la/merchant-wallet/api/v1/wallet`,
          {
            name,
            merchantCode: 'MX6072',
            status: 'ACTIVE',
            mobileNo: localPhone,
            provider: 'PRIME',
            firstName: name.split(' ')[0] ?? name,
            pin,
            email,
          },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        ),
      );
      return {
        walletId: data.walletId,
        settlementAccountNumber: data.settlementAccountNumber,
        status: data.walletCreationStatus ?? data.status,
      };
    } catch (err) {
      this.handleError('Member wallet creation', err);
    }
  }

  // ─── QTB: Verify Web Checkout ─────────────────────────────────────────────────

  async verifyPayment(transactionRef: string, amountKobo: number): Promise<{ success: boolean; responseCode: string }> {
    const token = await this.getQtbToken();
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.passportUrl}/collections/api/v1/gettransaction.json?merchantcode=${this.merchantCode}&transactionreference=${transactionRef}&amount=${amountKobo}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
      return { success: data.ResponseCode === '00', responseCode: data.ResponseCode };
    } catch (err) {
      this.handleError('Payment verification', err);
    }
  }

  // ─── Wallet: Payout to Hospital (generic-wallet API) ───────────────────────────
  // Endpoint: POST https://api-gateway.interswitchng.com/generic-wallet/api/v1/transaction/transfer/single
  // Note: 'enctyptedPin' is how Interswitch spells the field (API typo).
  // Returns 401 locally (IP restricted, same as SafeToken) — works on Railway server.

  async payoutToHospital(
    claimId: string,
    amountKobo: number,
    memberName: string,
    hospitalName: string,
    recipientAccount: string,
    recipientBankCode: string,
  ): Promise<PayoutResult> {
    const token = await this.getWalletToken();
    const txnRef = `OMOH-CLAIM-${claimId}-${Date.now()}`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `https://${this.walletGatewayHost}/generic-wallet/api/v1/transaction/transfer/single`,
          {
            txnRef,
            walletIdType: 'WALLET_ID',
            walletId: this.walletId,
            amount: String(amountKobo),
            channel: '7',
            enctyptedPin: this.walletPin,  // Note: Interswitch API typo
            domain: this.walletMerchantCode,
            // Recipient bank details (extension fields for bank transfer)
            beneficiaryAccountNumber: recipientAccount,
            beneficiaryBankCode: recipientBankCode,
            narration: `OmoHealth - ${memberName} - ${hospitalName}`,
          },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', accept: 'application/json' } },
        ),
      );
      return {
        transactionReference: data.transactionRef ?? data.txnRef ?? txnRef,
        status: data.responseDescription ?? data.status ?? 'INITIATED',
      };
    } catch (err) {
      this.handleError('Payout', err);
    }
  }

  // ─── Wallet: Payout Status ───────────────────────────────────────────

  async getPayoutStatus(transactionRef: string): Promise<{ status: string; successful: boolean }> {
    const token = await this.getWalletToken();
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `https://${this.walletGatewayHost}/generic-wallet/api/v1/transaction/${transactionRef}`,
          { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' } },
        ),
      );
      const status = (data.status ?? data.responseCode ?? '') as string;
      return { status, successful: status === '00' || status.toUpperCase() === 'SUCCESSFUL' };
    } catch (err) {
      this.handleError('Payout status', err);
    }
  }

  // ─── Wallet: Balance ───────────────────────────────────────────────

  async getWalletBalance(): Promise<WalletBalance> {
    const token = await this.getWalletToken();
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `https://${this.walletGatewayHost}/generic-wallet/api/v1/wallet/${this.walletId}/balance`,
          { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' } },
        ),
      );
      return {
        availableBalance: data.availableBalance ?? data.balance ?? 0,
        ledgerBalance: data.ledgerBalance ?? data.balance ?? 0,
        currency: 'NGN (kobo)',
      };
    } catch (err) {
      this.handleError('Wallet balance', err);
    }
  }

  // ─── Account Name Validation (before payout — uses SVA creds) ───────────────
  // Uses DoAccountNameInquiry: GET /quicktellerservice/api/v5/transactions/DoAccountNameInquiry
  // bankCode and accountId passed as headers

  async validateAccountName(accountNumber: string, bankCode: string): Promise<{ accountName: string }> {
    const token = await this.getSvaToken();
    if (!token) throw new BadRequestException('Account validation unavailable — SVA token failed');
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.passportUrl}/quicktellerservice/api/v5/transactions/DoAccountNameInquiry`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              TerminalId: this.terminalId,
              bankCode,
              accountId: accountNumber,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      const name = data.AccountName ?? data.accountName ?? data.ResponseDescription ?? 'Unknown';
      return { accountName: name };
    } catch (err) {
      this.handleError('Account name validation', err);
    }
  }

  // ─── SVA: TransferFunds — hospital payout (no wallet PIN needed) ──────────────
  // Auth:   InterswitchAuth <base64(clientId)> + SHA-1 signed headers
  // MAC:    sha512(initAmt + initCurrency + initMethod + termAmt + termCurrency + termMethod + termCountry)
  // Transfer code prefix for SVA = "1453"

  async transferFundsViaSva(
    amountKobo: number,
    destinationAccountNumber: string,
    destinationBankCode: string,
    sender: { phone: string; email: string; lastname: string; othernames: string },
    beneficiary: { lastname: string; othernames: string },
  ): Promise<PayoutResult> {
    const url = `${this.passportUrl}/quicktellerservice/api/v5/transactions/TransferFunds`;
    const encodedUrl = encodeURIComponent(url);
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomUUID();
    const amount = String(amountKobo);

    // MAC: sha512 of concatenated body fields
    const mac = createHash('sha512').update(
      amount + '566' + 'CA' + amount + '566' + 'AC' + 'NG',
    ).digest('hex');

    // Signature: hexToBase64(SHA1(signatureCipher))
    const signatureCipher = `POST&${encodedUrl}&${timestamp}&${nonce}&${this.svaClientId}&${this.svaSecretKey}`;
    const sha1Hex = createHash('sha1').update(signatureCipher, 'utf8').digest('hex');
    const signature = Buffer.from(sha1Hex).toString('base64');

    // Authorization: InterswitchAuth <base64(clientId)>
    const authorization = `InterswitchAuth ${Buffer.from(this.svaClientId).toString('base64')}`;
    const transferCode = `1453${timestamp}`;

    const body = {
      transferCode,
      mac,
      termination: {
        amount,
        accountReceivable: { accountNumber: destinationAccountNumber, accountType: '00' },
        entityCode: destinationBankCode,
        currencyCode: '566',
        paymentMethodCode: 'AC',
        countryCode: 'NG',
      },
      sender,
      initiatingEntityCode: 'PBL',
      initiation: { amount, currencyCode: '566', paymentMethodCode: 'CA', channel: '7' },
      beneficiary,
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            Authorization: authorization,
            Timestamp: String(timestamp),
            Nonce: nonce,
            Signature: signature,
            TerminalId: this.terminalId,
            'Content-Type': 'application/json',
          },
        }),
      );
      return {
        transactionReference: data.transactionRef ?? data.requestRef ?? transferCode,
        status: data.responseDescription ?? data.status ?? 'SUBMITTED',
      };
    } catch (err) {
      this.handleError('SVA TransferFunds', err);
    }
  }

  // ─── Bank Codes — static list (fundstransferbanks returns 401 in QA for all creds)

  getBankCodes(): BankCode[] {
    return NIGERIAN_BANKS;
  }

  // ─── Error helper ─────────────────────────────────────────────────────────────

  private handleError(context: string, err: unknown): never {
    const axiosErr = err as AxiosError;
    this.logger.error(`${context} failed`, axiosErr.response?.data ?? (err as Error).message);
    throw new BadRequestException(
      `${context} failed: ${axiosErr.response?.statusText ?? (err as Error).message}`,
    );
  }
}
