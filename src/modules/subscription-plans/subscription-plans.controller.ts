import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/common/enums/roles.enum';
import { SubscriptionPlanDuration } from 'src/common/enums/subscription-plans.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/role.gaurd';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscriptionPlansService } from './subscription-plans.service';

@Controller('subscription-plans')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class SubscriptionPlansController {
  constructor(
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  addSubscriptionPlan(
    @Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto,
  ) {
    return this.subscriptionPlansService.create(createSubscriptionPlanDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'duration',
    required: false,
    enum: SubscriptionPlanDuration,
  })
  get(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: string,
    @Query('duration') duration?: SubscriptionPlanDuration,
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    return this.subscriptionPlansService.get(
      pageNumber,
      limitNumber,
      search,
      status,
      duration,
    );
  }

  @Get('active')
  @Roles(Role.STUDENT)
  getActive() {
    return this.subscriptionPlansService.getActiveSubscriptionPlans();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STUDENT)
  getById(@Param('id') id: string) {
    return this.subscriptionPlansService.getById(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptionPlansService.update(id, updateQuestionDto);
  }

  @Patch('mark-active/:id')
  @ApiBearerAuth()
  markActive(@Param('id') id: string) {
    return this.subscriptionPlansService.markActive(id);
  }

  @Patch('mark-inactive/:id')
  @ApiBearerAuth()
  markInacive(@Param('id') id: string) {
    return this.subscriptionPlansService.markInacive(id);
  }
}
