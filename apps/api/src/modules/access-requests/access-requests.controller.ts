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
import { AccessRequestsService } from './access-requests.service';
import { FamiliesService } from '../../infra/families/families.service';

@Controller('access-requests')
export class AccessRequestsController {
  constructor(
    private readonly accessRequestsService: AccessRequestsService,
    private readonly familiesService: FamiliesService,
  ) {}

  /**
   * 提交协作/查看申请
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Req() req: any,
    @Body() body: { familyId: string; type: 'collaborator' | 'viewer'; reason?: string },
  ) {
    return this.accessRequestsService.create(
      req.user.sub,
      body.familyId,
      body.type,
      body.reason,
    );
  }

  /**
   * 查询当前族谱的申请列表（管理端）
   */
  @Roles('admin', 'creator', 'collaborator')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async list(
    @Headers('x-family-id') familyCode: string,
    @Query('status') status?: string,
  ) {
    const family = await this.familiesService.resolveByCode(familyCode);
    return this.accessRequestsService.list(family.id, status);
  }

  /**
   * 查询我的申请
   */
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async listMine(@Req() req: any) {
    return this.accessRequestsService.listByUser(req.user.sub);
  }

  /**
   * 审批通过
   */
  @Roles('admin', 'creator', 'collaborator')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/approve')
  async approve(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.accessRequestsService.approve(id, req.user.sub, body.note);
  }

  /**
   * 审批拒绝
   */
  @Roles('admin', 'creator', 'collaborator')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/reject')
  async reject(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { note: string },
  ) {
    return this.accessRequestsService.reject(id, req.user.sub, body.note);
  }
}
