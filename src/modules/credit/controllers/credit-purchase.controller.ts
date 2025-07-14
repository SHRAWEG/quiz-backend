import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/common/enums/roles.enum';
import { AuthGuard } from 'src/modules/auth/guards/auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/role.gaurd';
import { CreditPurchaseService } from '../services/credit-purchase.service';

@Controller('credit-purchases')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@ApiBearerAuth()
export class CreditPurchaseController {
  constructor(private readonly creditPurchaseService: CreditPurchaseService) {}

  @Post('initiate/:credits')
  async initiatePurchase(@Param('credits') credits: number) {
    const purchase = await this.creditPurchaseService.initiatePurchase(credits);
    return {
      success: true,
      data: {
        totalAmount: purchase.totalAmount,
        creditsAwarded: purchase.creditsAwarded,
        transactionUuid: purchase.transactionUuid,
        productCode: purchase.productCode,
        signature: purchase.signature,
      },
    };
  }

  @Post('cancel/:transactionUuid')
  async cancelPurchase(@Param('transactionUuid') transactionUuid: string) {
    await this.creditPurchaseService.cancelPurchase(transactionUuid);
    return {
      success: true,
      message: 'Purchase cancelled successfully.',
    };
  }

  @Post('verify/:encodedData')
  async verifyPayment(@Param('encodedData') encodedData: string) {
    const purchase =
      await this.creditPurchaseService.verifyPayment(encodedData);
    return {
      success: true,
      message: `Payment ${purchase.status.toLowerCase()}`,
      data: purchase,
    };
  }
}
