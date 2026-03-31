import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { OcrService } from './ocr.service';

class CreateOcrTaskDto {
  @IsString()
  sourceDocumentId!: string;
}

@Controller('ocr/tasks')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post()
  create(
    @Headers('x-family-id') familyId = 'demo-family',
    @Body() dto: CreateOcrTaskDto,
  ) {
    return this.ocrService.createTask(familyId, dto.sourceDocumentId);
  }

  @Get(':id')
  get(@Headers('x-family-id') familyId = 'demo-family', @Param('id') id: string) {
    return this.ocrService.getTask(familyId, id);
  }

  @Post(':id/review')
  review(@Headers('x-family-id') familyId = 'demo-family', @Param('id') id: string) {
    return this.ocrService.reviewTask(familyId, id);
  }
}
