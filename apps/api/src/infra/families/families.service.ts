import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { Role } from '../../common/types';

@Injectable()
export class FamiliesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 通过 code 解析族谱（保持v0.1兼容：不存在时自动创建）
   */
  async resolveByCode(code: string) {
    const normalized = code || 'demo-family';
    const existed = await this.prisma.family.findUnique({ where: { code: normalized } });
    if (existed) {
      return existed;
    }

    return this.prisma.family.create({
      data: {
        code: normalized,
        name: normalized,
      },
    });
  }

  /**
   * v0.2: 创建族谱，创建者自动获得 creator 角色
   */
  async createFamily(userId: string, name: string, code: string) {
    // 检查 code 是否已存在
    const existed = await this.prisma.family.findUnique({ where: { code } });
    if (existed) {
      throw new BadRequestException('族谱代码已存在');
    }

    // 创建族谱
    const family = await this.prisma.family.create({
      data: {
        name,
        code,
        creatorId: userId,
        accessLevel: 'approval_required',
      },
    });

    // 自动授予创建者 creator 角色
    await this.prisma.familyUserRole.create({
      data: {
        familyId: family.id,
        userId,
        role: 'creator',
      },
    });

    return family;
  }

  /**
   * v0.2: 更新族谱公开程度
   */
  async updateAccessLevel(familyId: string, accessLevel: string) {
    if (!['public', 'approval_required'].includes(accessLevel)) {
      throw new BadRequestException('无效的公开程度设置');
    }

    return this.prisma.family.update({
      where: { id: familyId },
      data: { accessLevel },
    });
  }

  /**
   * v0.2: 查询用户在指定族谱中的角色
   */
  async getUserRole(userId: string, familyId: string) {
    return this.prisma.familyUserRole.findUnique({
      where: {
        familyId_userId: { familyId, userId },
      },
    });
  }

  /**
   * v0.2: 查询用户可访问的所有族谱列表
   */
  async listFamiliesForUser(userId: string) {
    const roles = await this.prisma.familyUserRole.findMany({
      where: { userId },
      include: { family: true },
    });

    return roles.map((r) => ({
      ...r.family,
      role: r.role,
    }));
  }

  /**
   * v0.2: 为用户添加族谱角色
   */
  async addUserRole(familyId: string, userId: string, role: Role) {
    // 检查是否已有角色
    const existed = await this.prisma.familyUserRole.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });

    if (existed) {
      // 如果已有角色，更新为新角色（取高权限）
      return this.prisma.familyUserRole.update({
        where: { id: existed.id },
        data: { role },
      });
    }

    return this.prisma.familyUserRole.create({
      data: { familyId, userId, role },
    });
  }

  /**
   * v0.2: 移除用户的族谱角色
   */
  async removeUserRole(familyId: string, userId: string) {
    const role = await this.prisma.familyUserRole.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });

    if (!role) {
      throw new NotFoundException('该用户在此族谱中没有角色');
    }

    // 不允许移除创建者
    if (role.role === 'creator') {
      throw new BadRequestException('不能移除族谱创建者');
    }

    await this.prisma.familyUserRole.delete({
      where: { id: role.id },
    });

    return { removed: true };
  }

  /**
   * v0.2: 获取族谱的所有用户角色列表
   */
  async listFamilyRoles(familyId: string) {
    return this.prisma.familyUserRole.findMany({
      where: { familyId },
      include: {
        user: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * v0.2: 通过ID获取族谱
   */
  async getById(familyId: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException('族谱不存在');
    }
    return family;
  }
}
