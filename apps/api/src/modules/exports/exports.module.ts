import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { ExportsWorker } from './exports.worker';

@Module({
  controllers: [ExportsController],
  providers: [ExportsService, ExportsWorker],
  exports: [ExportsService],
})
export class ExportsModule {}
