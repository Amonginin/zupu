import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CreateMemberDto, UpdateMemberDto, CreateRelationDto } from './dto';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('members')
@UseGuards(JwtAuthGuard)
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
    @Req() req: any,
    @Headers('x-family-id') familyId = 'demo-family',
    @Body() dto: CreateMemberDto,
  ) {
    return this.membersService.create(familyId, dto, req.user?.sub);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Headers('x-family-id') familyId = 'demo-family',
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.update(familyId, id, dto, req.user?.sub);
  }

  @Delete(':id')
  delete(
    @Req() req: any,
    @Headers('x-family-id') familyId = 'demo-family',
    @Param('id') id: string,
  ) {
    return this.membersService.delete(familyId, id, req.user?.sub);
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
    @Req() req: any,
    @Headers('x-family-id') familyId = 'demo-family',
    @Param('id') id: string,
    @Body() dto: CreateRelationDto,
  ) {
    return this.membersService.createRelation(familyId, id, dto, req.user?.sub);
  }
}
