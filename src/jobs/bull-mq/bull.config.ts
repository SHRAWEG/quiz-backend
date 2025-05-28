// bull.config.ts
import { BullRootModuleOptions } from '@nestjs/bullmq';

export const bullConfig: BullRootModuleOptions = {
  connection: {
    host: 'localhost',
    port: 6379,
  },
};
