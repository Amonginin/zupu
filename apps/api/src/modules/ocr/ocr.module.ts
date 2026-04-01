import { Module } from '@nestjs/common';
import { AuditsModule } from '../audits/audits.module';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { OcrWorker } from './ocr.worker';

@Module({
  imports: [AuditsModule],
  controllers: [OcrController],
  providers: [OcrService, OcrWorker],
})
export class OcrModule {}
