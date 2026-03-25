import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';

export interface InitiatePaymentPayload {
  amount: number; // in kobo (NGN minor unit)
  transactionReference: string;
  redirectUrl: string;
  paymentType?: string; // e.g. 'CARD'
  currency?: string;
  customerId?: string;
  customerEmail?: string;
}

export interface InitiatePaymentResponse {
  redirectUrl: string;
  transactionReference: string;
  paymentUrl: string;
}

export interface QueryTransactionResponse {
  responseCode: string;
  responseDescription: string;
  amount: number;
  transactionReference: string;
  paymentReference: string;
}

@Injectable()
export class InterswitchService {
  private readonly logger = new Logger(InterswitchService.name);
  private readonly baseUrl: string;
  private readonly gatewayUrl: string;
  private readonly clientId: string;
  private readonly secretKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.getOrThrow('INTERSWITCH_BASE_URL');
    this.gatewayUrl = this.configService.getOrThrow(
      'INTERSWITCH_PAYMENT_GATEWAY_URL',
    );
    this.clientId = this.configService.getOrThrow('INTERSWITCH_CLIENT_ID');
    this.secretKey = this.configService.getOrThrow('INTERSWITCH_SECRET_KEY');
  }

  /**
   * Build the SHA-512 authorization header required by Interswitch.
   * Format: clientId:timestamp:nonce:signature
   */
  private buildAuthHeader(
    httpMethod: string,
    resourceUrl: string,
    timestamp: string,
    nonce: string,
    requestBody?: string,
  ): string {
    const bodyHash = requestBody
      ? crypto.createHash('sha512').update(requestBody).digest('hex')
      : '';

    const signatureData = [
      this.clientId,
      timestamp,
      nonce,
      httpMethod.toUpperCase(),
      resourceUrl,
      bodyHash,
    ].join('');

    const signature = crypto
      .createHmac('sha512', this.secretKey)
      .update(signatureData)
      .digest('base64');

    const authHeader = `InterswitchAuth ${Buffer.from(
      `${this.clientId}:${timestamp}:${nonce}:${signature}`,
    ).toString('base64')}`;

    return authHeader;
  }

  private getTimestampAndNonce(): { timestamp: string; nonce: string } {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    return { timestamp, nonce };
  }

  /**
   * Initiate a payment via Interswitch Payment Gateway.
   * Returns a URL to redirect the user to for payment.
   */
  async initiatePayment(
    payload: InitiatePaymentPayload,
  ): Promise<InitiatePaymentResponse> {
    const resourcePath = '/api/v1/purchases';
    const resourceUrl = `${this.gatewayUrl}${resourcePath}`;

    const body = {
      merchantCode: this.clientId,
      payableCode: 'Default_Payable_MX26177',
      amount: payload.amount,
      transactionReference: payload.transactionReference,
      redirectUrl: payload.redirectUrl,
      currency: payload.currency ?? '566', // 566 = NGN ISO 4217
      customerId: payload.customerId ?? payload.customerEmail ?? 'customer',
    };

    const bodyStr = JSON.stringify(body);
    const { timestamp, nonce } = this.getTimestampAndNonce();
    const authHeader = this.buildAuthHeader(
      'POST',
      resourcePath,
      timestamp,
      nonce,
      bodyStr,
    );

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(resourceUrl, body, {
          headers: {
            Authorization: authHeader,
            Timestamp: timestamp,
            Nonce: nonce,
            'Content-Type': 'application/json',
          },
        }),
      );

      const paymentUrl = `${this.gatewayUrl}/pay?transactionreference=${data.transactionReference}&amount=${payload.amount}`;

      return {
        redirectUrl: payload.redirectUrl,
        transactionReference:
          data.transactionReference ?? payload.transactionReference,
        paymentUrl,
      };
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.error(
        'Interswitch initiatePayment error',
        axiosErr.response?.data,
      );
      throw new UnauthorizedException(
        'Payment initiation failed. Check Interswitch credentials.',
      );
    }
  }

  /**
   * Query the status of a transaction from Interswitch.
   */
  async queryTransaction(
    transactionRef: string,
  ): Promise<QueryTransactionResponse> {
    const resourcePath = `/api/v1/purchases?transactionReference=${transactionRef}`;
    const resourceUrl = `${this.gatewayUrl}${resourcePath}`;
    const { timestamp, nonce } = this.getTimestampAndNonce();
    const authHeader = this.buildAuthHeader(
      'GET',
      resourcePath,
      timestamp,
      nonce,
    );

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(resourceUrl, {
          headers: {
            Authorization: authHeader,
            Timestamp: timestamp,
            Nonce: nonce,
          },
        }),
      );
      return data as QueryTransactionResponse;
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.error(
        'Interswitch queryTransaction error',
        axiosErr.response?.data,
      );
      throw new UnauthorizedException('Transaction query failed.');
    }
  }
}
