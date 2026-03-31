import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { CreateMemberDto, UpdateMemberDto, CreateRelationDto } from './dto';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  list(@Headers('x-family-id') familyId = 'demo-family') {
    return this.membersService.list(familyId);
  }

  @Get(':id')
  getById(
    @Headers('x-family-id') familyId = 'demo-family',
    @Param('id') id: string,
  ) {
    return this.membersService.getById(familyId, id);
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

  @Delete(':id')
  delete(
    @Headers('x-family-id') familyId = 'demo-family',
    @Param('id') id: string,
  ) {
    return this.membersService.delete(familyId, id);
  }

  @Get(':id/relations')
  getRelations(
    @Headers('x-family-id') familyId = 'demo-family',
    @Param('id') id: string,
  ) {
    return this.membersService.getRelations(familyId, id);
  }

  @Post(':id/relations')
  createRelation(
    @Headers('x-family-id') familyId = 'demo-family',
    @Param('id') id: string,
    @Body() dto: CreateRelationDto,
  ) {
    return this.membersService.createRelation(familyId, id, dto);
  }
}
