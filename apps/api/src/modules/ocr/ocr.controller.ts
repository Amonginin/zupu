import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OcrService } from './ocr.service';

class CreateOcrTaskDto {
  @IsString()
  sourceDocumentId!: string;
}

class ReviewMemberDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  generation?: number;

  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsBoolean()
  isLiving?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

class ReviewOcrTaskDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewMemberDto)
  members?: ReviewMemberDto[];
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

  @Get(':id/candidates')
  getCandidates(@Headers('x-family-id') familyId = 'demo-family', @Param('id') id: string) {
    return this.ocrService.getCandidates(familyId, id);
  }

  @Post(':id/review')
  review(
    @Headers('x-family-id') familyId = 'demo-family',
    @Param('id') id: string,
    @Body() dto: ReviewOcrTaskDto,
  ) {
    return this.ocrService.reviewTask(familyId, id, dto.members);
  }
}
