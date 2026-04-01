import { Controller, Get, Headers, Query } from '@nestjs/common';
import { AuditsService } from './audits.service';

@Controller('audits')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get()
  list(
    @Headers('x-family-id') familyId = 'demo-family',
    @Query('targetType') targetType?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditsService.list(familyId, {
      targetType,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
