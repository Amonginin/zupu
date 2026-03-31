import { Module } from '@nestjs/common';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { OcrWorker } from './ocr.worker';

@Module({
  controllers: [OcrController],
  providers: [OcrService, OcrWorker],
})
export class OcrModule {}
