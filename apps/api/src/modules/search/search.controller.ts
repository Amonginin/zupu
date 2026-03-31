import { Controller, Get, Headers, Query } from '@nestjs/common';
import { MembersService } from '../members/members.service';

@Controller('search')
export class SearchController {
  constructor(private readonly membersService: MembersService) {}

  @Get('members')
  search(
    @Headers('x-family-id') familyId = 'demo-family',
    @Query('name') name?: string,
    @Query('generation') generation?: string,
  ) {
    return this.membersService.list(familyId).then((list) => {
      return list.filter((member: { name: string; generation: number | null }) => {
        const nameOk = name ? member.name.includes(name) : true;
        const generationOk = generation
          ? String(member.generation ?? '') === generation
          : true;
        return nameOk && generationOk;
      });
    });
  }
}
