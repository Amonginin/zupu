import { Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ExportsService } from './exports.service';

@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post()
  create(@Headers('x-family-id') familyId = 'demo-family') {
    return this.exportsService.createTask(familyId);
  }

  @Get(':id')
  get(@Headers('x-family-id') familyId = 'demo-family', @Param('id') id: string) {
    return this.exportsService.getTask(familyId, id);
  }
}
