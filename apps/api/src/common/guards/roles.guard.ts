import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role, ROLE_HIERARCHY } from '../types';
import { PrismaService } from '../../infra/prisma/prisma.service';

/**
 * 角色权限守卫
 * 工作原理：
 * 1. 从 @Roles() 装饰器读取接口要求的角色列表
 * 2. 从请求头 x-family-id 读取当前族谱标识
 * 3. 查询用户在该族谱中的实际角色
 * 4. 判断用户角色是否满足要求（支持权限继承：高角色自动拥有低角色权限）
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. 获取接口要求的角色
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 如果没有 @Roles() 装饰器，放行
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 2. 获取当前用户和族谱上下文
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('未登录');
    }

    const familyCode = request.headers['x-family-id'] || 'demo-family';

    // 3. 查询族谱信息
    const family = await this.prisma.family.findUnique({
      where: { code: familyCode },
    });

    if (!family) {
      throw new ForbiddenException('族谱不存在');
    }

    // 4. 查询用户在该族谱中的角色
    const familyUserRole = await this.prisma.familyUserRole.findUnique({
      where: {
        familyId_userId: {
          familyId: family.id,
          userId: user.sub,
        },
      },
    });

    if (!familyUserRole) {
      throw new ForbiddenException('您没有该族谱的访问权限');
    }

    // 5. 权限继承判断：用户角色等级 >= 要求的最低角色等级
    const userRoleLevel = ROLE_HIERARCHY[familyUserRole.role as Role] || 0;
    const minRequiredLevel = Math.min(
      ...requiredRoles.map((role) => ROLE_HIERARCHY[role] || 0),
    );

    if (userRoleLevel < minRequiredLevel) {
      throw new ForbiddenException('权限不足');
    }

    // 将角色信息挂载到 request 上，方便后续使用
    request.familyRole = familyUserRole;
    request.familyId = family.id;

    return true;
  }
}
