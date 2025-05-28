// time-expiry.service.ts
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class TimeExpiryService {
  constructor(
    @InjectQueue('question-set-timeout') private timeoutQueue: Queue,
  ) {}

  async startTimeoutJob(sessionId: string, timeoutSeconds: number) {
    await this.timeoutQueue.add(
      'expire',
      { sessionId },
      { delay: timeoutSeconds * 1000 },
    );
  }
}
