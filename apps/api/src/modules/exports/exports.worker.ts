import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { ExportsService } from './exports.service';

@Injectable()
export class ExportsWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker;

  constructor(private readonly exportsService: ExportsService) {}

  async onModuleInit() {
    this.worker = new Worker(
      'export-queue',
      async (job) => {
        await this.exportsService.runTask(job.data.taskId as string);
      },
      {
        connection: {
          host: process.env.REDIS_HOST ?? '127.0.0.1',
          port: Number(process.env.REDIS_PORT ?? '6379'),
        },
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
