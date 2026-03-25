import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { InterswitchService } from '../interswitch/interswitch.service';
import { PrismaService } from '../prisma/prisma.service';
import { InitiatePaymentDto } from './dto/payments.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly interswitchService: InterswitchService,
  ) {}

  async initiatePayment(userId: string, dto: InitiatePaymentDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const reference = `TXN-${uuid()}`;
    const amountInKobo = Math.round(dto.amount * 100);

    // Create a pending transaction in DB first
    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        reference,
        amount: dto.amount,
        currency: dto.currency ?? 'NGN',
        status: TransactionStatus.PENDING,
        description: dto.description,
      },
    });

    // Call Interswitch
    const result = await this.interswitchService.initiatePayment({
      amount: amountInKobo,
      transactionReference: reference,
      redirectUrl: dto.redirectUrl,
      customerEmail: user.email,
    });

    // Update transaction with payment URL
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        paymentUrl: result.paymentUrl,
        interswitchRef: result.transactionReference,
      },
    });

    return {
      reference,
      paymentUrl: result.paymentUrl,
      amount: dto.amount,
      currency: dto.currency ?? 'NGN',
    };
  }

  async verifyPayment(reference: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { reference },
    });
    if (!transaction) {
      throw new NotFoundException(
        `Transaction with reference ${reference} not found`,
      );
    }

    // Query Interswitch for latest status
    const result = await this.interswitchService.queryTransaction(reference);

    const isSuccess = result.responseCode === '00';
    const newStatus = isSuccess
      ? TransactionStatus.SUCCESS
      : TransactionStatus.FAILED;

    if (transaction.status === TransactionStatus.PENDING) {
      await this.prisma.transaction.update({
        where: { reference },
        data: {
          status: newStatus,
          interswitchRef: result.paymentReference ?? transaction.interswitchRef,
        },
      });
    }

    return {
      reference,
      status: newStatus,
      interswitchResponse: result,
    };
  }

  async getUserTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
