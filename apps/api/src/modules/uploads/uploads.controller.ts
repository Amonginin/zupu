import {
  Controller,
  Headers,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('source')
  @UseInterceptors(FileInterceptor('file'))
  uploadSource(
    @Headers('x-family-id') familyId = 'demo-family',
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    return this.uploadsService.uploadSource(familyId, file);
  }
}
