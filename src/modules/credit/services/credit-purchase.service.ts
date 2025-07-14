import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto-js';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  CreditPurchase,
  CreditPurchaseStatus,
} from '../entities/credit-purchase.entity';
import { CreditTransactionType } from '../entities/credit-transaction.entity';
import { CreditService } from './credit.service';

interface DecodedPaymentData {
  transaction_uuid: string;
  status: 'COMPLETE' | 'CANCELED';
  signature: string;
  signed_field_names: string;
  [key: string]: string; // Add index signature to allow string index access
}

@Injectable()
export class CreditPurchaseService {
  constructor(
    @InjectRepository(CreditPurchase)
    private readonly creditPurchaseRepository: Repository<CreditPurchase>,
    private readonly creditService: CreditService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async initiatePurchase(credits: number): Promise<CreditPurchase> {
    const user = this.request.user as { sub: string }; // Type assertion for user object

    const creditsAwarded = credits; // 1 NPR = 1 credit
    const productCode = 'EPAYTEST';
    const transactionUuid = uuidv4();

    const message = `total_amount=${credits},transaction_uuid=${transactionUuid},product_code=${productCode}`;
    const signature = crypto.enc.Base64.stringify(
      crypto.HmacSHA256(message, process.env.ESEWA_SECRET_KEY),
    );

    return this.creditPurchaseRepository.save({
      userId: user.sub,
      totalAmount: credits,
      creditsAwarded,
      status: CreditPurchaseStatus.PENDING,
      productCode,
      transactionUuid,
      signature,
    });
  }

  async cancelPurchase(transactionUuid: string): Promise<void> {
    const user = this.request.user as { sub: string };

    const purchase = await this.creditPurchaseRepository.findOne({
      where: { transactionUuid, userId: user.sub },
    });

    if (!purchase) {
      throw new BadRequestException('Credit purchase not found');
    }

    await this.creditPurchaseRepository.delete(purchase);
  }

  async verifyPayment(encodedData: string): Promise<CreditPurchase> {
    const paymentData = this.decodePaymentData(encodedData);
    this.validatePaymentData(paymentData);

    const purchase = await this.creditPurchaseRepository.findOne({
      where: { transactionUuid: paymentData.transaction_uuid },
    });

    if (!purchase) {
      throw new BadRequestException('Credit purchase not found');
    }

    this.verifySignature(paymentData);

    if (paymentData.status === CreditPurchaseStatus.COMPLETE) {
      return this.handleSuccessfulPayment(purchase);
    }
    return this.handleCanceledPayment(purchase);
  }

  private decodePaymentData(encodedData: string): DecodedPaymentData {
    try {
      const decoded = Buffer.from(encodedData, 'base64').toString('utf-8');
      return JSON.parse(decoded) as DecodedPaymentData; // Explicit type assertion
    } catch (error: unknown) {
      throw new BadRequestException({
        success: false,
        message: 'Invalid payment data format',
        data: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private validatePaymentData(data: DecodedPaymentData): void {
    if (
      !data.transaction_uuid ||
      !data.status ||
      !data.signature ||
      !data.signed_field_names
    ) {
      throw new BadRequestException('Missing required payment fields');
    }
  }

  private verifySignature(data: DecodedPaymentData): void {
    const signedFields = data.signed_field_names.split(',');
    const message = signedFields
      .map((field) => `${field}=${data[field]}`)
      .join(',');
    const expectedSignature = crypto.enc.Base64.stringify(
      crypto.HmacSHA256(message, process.env.ESEWA_SECRET_KEY),
    );

    if (expectedSignature !== data.signature) {
      throw new BadRequestException('Invalid payment signature');
    }
  }

  private async handleSuccessfulPayment(
    purchase: CreditPurchase,
  ): Promise<CreditPurchase> {
    if (purchase.status === CreditPurchaseStatus.COMPLETE) {
      return purchase; // Already processed
    }

    await this.creditService.addCredits(
      purchase.userId,
      purchase.creditsAwarded,
      CreditTransactionType.PURCHASE,
      purchase.id,
      `Credit purchase via eSewa (${purchase.totalAmount} NPR)`,
    );

    purchase.status = CreditPurchaseStatus.COMPLETE;
    return this.creditPurchaseRepository.save(purchase);
  }

  private async handleCanceledPayment(
    purchase: CreditPurchase,
  ): Promise<CreditPurchase> {
    purchase.status = CreditPurchaseStatus.CANCELED;
    return this.creditPurchaseRepository.save(purchase);
  }
}
