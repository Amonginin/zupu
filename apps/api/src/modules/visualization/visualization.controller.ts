import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { VisualizationService } from './visualization.service';
import { FamiliesService } from '../../infra/families/families.service';

@Controller('visualization')
export class VisualizationController {
  constructor(
    private readonly visualizationService: VisualizationService,
    private readonly familiesService: FamiliesService,
  ) {}

  /**
   * 获取树状图数据 - 需要至少 viewer 权限
   */
  @Roles('viewer', 'collaborator', 'creator', 'admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('tree')
  async getTreeData(@Headers('x-family-id') familyCode: string) {
    const family = await this.familiesService.resolveByCode(familyCode);
    return this.visualizationService.getTreeData(family.id);
  }

  /**
   * 获取吊线图扁平打组数据 - 需要至少 viewer 权限
   */
  @Roles('viewer', 'collaborator', 'creator', 'admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('dropline')
  async getDropLineData(@Headers('x-family-id') familyCode: string) {
    const family = await this.familiesService.resolveByCode(familyCode);
    return this.visualizationService.getDropLineData(family.id);
  }
}
