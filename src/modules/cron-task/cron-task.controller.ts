import { Controller } from '@nestjs/common';
import { CronTaskService } from './cron-task.service';

@Controller('cron-task')
export class CronTaskController {
  constructor(private readonly cronTaskService: CronTaskService) {}
}
