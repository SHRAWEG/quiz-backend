import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { QuestionSetPurchase } from 'src/modules/question-sets/entities/question-set-purchase.entity';
import {
  QuestionSet,
  QuestionSetAccessType,
} from 'src/modules/question-sets/entities/question-set.entity';
import { DataSource, Repository } from 'typeorm';
import {
  CreditTransaction,
  CreditTransactionType,
} from '../entities/credit-transaction.entity';
import { UserCredit } from '../entities/user-credit.entity';

@Injectable()
export class CreditService {
  constructor(
    @InjectRepository(UserCredit)
    private readonly userCreditRepository: Repository<UserCredit>,
    @InjectRepository(QuestionSetPurchase)
    private readonly questionSetPurchaseRepository: Repository<QuestionSetPurchase>,
    private readonly dataSource: DataSource,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async getBalance(): Promise<number> {
    const user = this.request.user;
    const credit = await this.userCreditRepository.findOne({
      where: { userId: user.sub },
    });
    return credit ? Number(credit.balance) : 0;
  }

  async addCredits(
    userId: string,
    amount: number,
    type: CreditTransactionType,
    referenceId?: string,
    description?: string,
  ): Promise<CreditTransaction> {
    return this.updateCredits(userId, amount, type, referenceId, description);
  }

  async deductCredits(
    userId: string,
    amount: number,
    referenceId?: string,
    description?: string,
  ): Promise<CreditTransaction> {
    return this.updateCredits(
      userId,
      -amount,
      CreditTransactionType.USAGE,
      referenceId,
      description,
    );
  }

  private async updateCredits(
    userId: string,
    amount: number,
    type: CreditTransactionType,
    referenceId?: string,
    description?: string,
  ): Promise<CreditTransaction> {
    return this.userCreditRepository.manager.transaction(async (manager) => {
      let userCredit = await manager.findOne(UserCredit, { where: { userId } });

      if (!userCredit) {
        userCredit = manager.create(UserCredit, { userId, balance: 0 });
      }

      const newBalance = Number(userCredit.balance) + Number(amount);
      if (newBalance < 0) {
        throw new Error('Insufficient credits');
      }

      userCredit.balance = newBalance;
      await manager.save(userCredit);

      const transaction = manager.create(CreditTransaction, {
        userId,
        amount: Math.abs(amount),
        type,
        referenceId,
        description: description || `${type} transaction`,
      });
      await manager.save(transaction);

      return transaction;
    });
  }

  async purchaseQuestionSet(questionSetId: string) {
    const user = this.request.user;
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // 1. Verify question set exists and is exclusive
      const questionSet = await queryRunner.manager.findOne(QuestionSet, {
        where: {
          id: questionSetId,
          accessType: QuestionSetAccessType.EXCLUSIVE,
        },
      });

      if (!questionSet) {
        throw new NotFoundException('Question set not available for purchase');
      }

      if (!questionSet.creditCost || questionSet.creditCost <= 0) {
        throw new BadRequestException(
          'Invalid credit cost for this question set',
        );
      }

      // 2. Check user's credit balance
      const userCredit = await queryRunner.manager.findOne(UserCredit, {
        where: { userId: user.sub },
      });

      const currentBalance = userCredit ? Number(userCredit.balance) : 0;
      if (currentBalance < questionSet.creditCost) {
        throw new BadRequestException('Insufficient credits');
      }

      // 3. Deduct credits
      const updatedCredit = await this.deductCredits(
        user.sub,
        questionSet.creditCost,
        questionSetId,
        `Purchased access to ${questionSet.name}`,
      );

      // 4. Create purchase record
      const purchase = queryRunner.manager.create(QuestionSetPurchase, {
        userId: user.sub,
        questionSetId,
        creditTransactionId: updatedCredit.id, // Will be set after transaction creation
      });

      await queryRunner.manager.save(purchase);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Question set purchased successfully',
        data: {
          purchase,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getUserPurchases() {
    const user = this.request.user;
    return this.questionSetPurchaseRepository.find({
      where: { userId: user.sub },
      relations: ['questionSet', 'creditTransaction'],
      order: { purchasedAt: 'DESC' },
    });
  }

  async hasActivePurchase(questionSetId: string): Promise<boolean> {
    const user = this.request.user;
    return this.questionSetPurchaseRepository.exists({
      where: {
        userId: user.sub,
        questionSetId,
        isUsed: false,
      },
    });
  }
}
