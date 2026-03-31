import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection = {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? '6379'),
  };

  readonly ocrQueue = new Queue('ocr-queue', { connection: this.connection });
  readonly exportQueue = new Queue('export-queue', { connection: this.connection });

  async onModuleDestroy() {
    await this.ocrQueue.close();
    await this.exportQueue.close();
  }
}
