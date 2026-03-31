import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { OcrService } from './ocr.service';

@Injectable()
export class OcrWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker;

  constructor(private readonly ocrService: OcrService) {}

  async onModuleInit() {
    this.worker = new Worker(
      'ocr-queue',
      async (job) => {
        await this.ocrService.runTask(job.data.taskId as string);
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
