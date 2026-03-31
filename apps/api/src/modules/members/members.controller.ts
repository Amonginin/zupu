import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { CreateMemberDto, UpdateMemberDto } from './dto';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  list(@Headers('x-family-id') familyId = 'demo-family') {
    return this.membersService.list(familyId);
  }

  @Post()
  create(
    @Headers('x-family-id') familyId = 'demo-family',
    @Body() dto: CreateMemberDto,
  ) {
    return this.membersService.create(familyId, dto);
  }

  @Patch(':id')
  update(
    @Headers('x-family-id') familyId = 'demo-family',
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.update(familyId, id, dto);
  }
}
