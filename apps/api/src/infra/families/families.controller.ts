import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FamiliesService } from './families.service';

@Controller('families')
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  /**
   * 创建族谱 - 已登录用户均可创建
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() body: { name: string; code: string }) {
    return this.familiesService.createFamily(req.user.sub, body.name, body.code);
  }

  /**
   * 获取当前用户的族谱列表
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async listMine(@Req() req: any) {
    return this.familiesService.listFamiliesForUser(req.user.sub);
  }

  /**
   * 更新族谱公开程度 - 仅admin/creator可操作
   */
  @Roles('admin', 'creator')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/access-level')
  async updateAccessLevel(
    @Param('id') id: string,
    @Body() body: { accessLevel: string },
  ) {
    return this.familiesService.updateAccessLevel(id, body.accessLevel);
  }

  /**
   * 获取族谱成员角色列表 - 仅admin/creator可查看
   */
  @Roles('admin', 'creator')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id/roles')
  async listRoles(@Param('id') id: string) {
    return this.familiesService.listFamilyRoles(id);
  }

  /**
   * 移除用户角色 - 仅admin/creator可操作
   */
  @Roles('admin', 'creator')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id/roles/:userId')
  async removeRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.familiesService.removeUserRole(id, userId);
  }
}
