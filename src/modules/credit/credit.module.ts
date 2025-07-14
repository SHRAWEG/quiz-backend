import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionSetPurchase } from '../question-sets/entities/question-set-purchase.entity';
import { CreditPurchaseController } from './controllers/credit-purchase.controller';
import { CreditController } from './controllers/credit.controller';
import { CreditPurchase } from './entities/credit-purchase.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { UserCredit } from './entities/user-credit.entity';
import { CreditPurchaseService } from './services/credit-purchase.service';
import { CreditService } from './services/credit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserCredit,
      CreditTransaction,
      CreditPurchase,
      QuestionSetPurchase,
    ]),
  ],
  controllers: [CreditController, CreditPurchaseController],
  providers: [CreditService, CreditPurchaseService],
  exports: [CreditService],
})
export class CreditModule {}
