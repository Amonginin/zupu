import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EditRequestsService } from './edit-requests.service';
import { FamiliesService } from '../../infra/families/families.service';

@Controller('edit-requests')
export class EditRequestsController {
  constructor(
    private readonly editRequestsService: EditRequestsService,
    private readonly familiesService: FamiliesService,
  ) {}

  /**
   * 提交修改请求 - 仅协作者
   */
  @Roles('collaborator')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  async create(
    @Req() req: any,
    @Headers('x-family-id') familyCode: string,
    @Body() body: { editType: string; editPayload: string; reason?: string },
  ) {
    const family = await this.familiesService.resolveByCode(familyCode);
    return this.editRequestsService.create(
      req.user.sub,
      family.id,
      body.editType,
      body.editPayload,
      body.reason,
    );
  }

  /**
   * 查询修改请求列表 - 仅admin/creator
   */
  @Roles('admin', 'creator')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async list(
    @Headers('x-family-id') familyCode: string,
    @Query('status') status?: string,
  ) {
    const family = await this.familiesService.resolveByCode(familyCode);
    return this.editRequestsService.list(family.id, status);
  }

  /**
   * 审批通过
   */
  @Roles('admin', 'creator')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/approve')
  async approve(@Req() req: any, @Param('id') id: string) {
    return this.editRequestsService.approve(id, req.user.sub);
  }

  /**
   * 审批拒绝
   */
  @Roles('admin', 'creator')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/reject')
  async reject(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { note: string },
  ) {
    return this.editRequestsService.reject(id, req.user.sub, body.note);
  }

  /**
   * 要求修改
   */
  @Roles('admin', 'creator')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/revision')
  async requestRevision(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { note: string },
  ) {
    return this.editRequestsService.requestRevision(id, req.user.sub, body.note);
  }
}
