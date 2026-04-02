import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { ExportsService } from './exports.service';

@Injectable()
export class ExportsWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker;
  private readonly logger = new Logger(ExportsWorker.name);

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

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `导出任务执行失败: jobId=${job?.id ?? 'unknown'} taskId=${String(job?.data?.taskId ?? '')}`,
        error.stack ?? error.message,
      );
    });

    this.worker.on('error', (error) => {
      this.logger.error(`导出 Worker 异常: ${error.message}`, error.stack);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
