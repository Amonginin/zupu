import { Controller, Get, Headers, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('members')
  search(
    @Headers('x-family-id') familyId = 'demo-family',
    @Query('name') name?: string,
    @Query('generation') generation?: string,
    @Query('alias') alias?: string,
  ) {
    return this.searchService.searchMembers(familyId, { name, generation, alias });
  }
}
