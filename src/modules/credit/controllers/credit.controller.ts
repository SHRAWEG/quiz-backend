import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/common/enums/roles.enum';
import { AuthGuard } from 'src/modules/auth/guards/auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/role.gaurd';
import { CreditService } from '../services/credit.service';

@Controller('credits')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@ApiBearerAuth()
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  @Get('balance')
  async getBalance() {
    return await this.creditService.getBalance();
  }

  @Post('purchase/:questionSetId')
  async purchaseQuestionSet(@Param('questionSetId') questionSetId: string) {
    await this.creditService.purchaseQuestionSet(questionSetId);
    return {
      success: true,
      message: 'Purchased successfully.',
    };
  }
}
