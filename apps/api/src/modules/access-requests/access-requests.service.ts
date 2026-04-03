import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { FamiliesService } from '../../infra/families/families.service';
import { AuditsService } from '../audits/audits.service';

@Injectable()
export class AccessRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familiesService: FamiliesService,
    private readonly auditsService: AuditsService,
  ) {}

  /**
   * 提交协作/查看申请
   */
  async create(
    userId: string,
    familyId: string,
    type: 'collaborator' | 'viewer',
    reason?: string,
  ) {
    // 检查族谱是否存在
    const family = await this.familiesService.getById(familyId);

    // 检查用户是否已有该族谱权限
    const existingRole = await this.familiesService.getUserRole(userId, familyId);
    if (existingRole) {
      throw new BadRequestException('您已拥有该族谱的访问权限');
    }

    // 检查是否已有待审批申请
    const pendingRequest = await this.prisma.accessRequest.findFirst({
      where: { familyId, userId, status: 'pending' },
    });
    if (pendingRequest) {
      throw new BadRequestException('您已有一个待审批的申请');
    }

    const request = await this.prisma.accessRequest.create({
      data: { familyId, userId, type, reason, status: 'pending' },
    });

    // 通知创建者
    if (family.creatorId) {
      await this.prisma.notification.create({
        data: {
          userId: family.creatorId,
          type: 'access_request',
          title: `新的${type === 'collaborator' ? '协作者' : '查看者'}申请`,
          content: reason || '无附加说明',
          relatedId: request.id,
        },
      });
    }

    return request;
  }

  /**
   * 查询族谱的申请列表
   */
  async list(familyId: string, status?: string) {
    const where: any = { familyId };
    if (status) {
      where.status = status;
    }

    return this.prisma.accessRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 查询用户自己的申请
   */
  async listByUser(userId: string) {
    return this.prisma.accessRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 审批通过
   */
  async approve(requestId: string, reviewerId: string, note?: string) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('申请不存在');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('该申请已被处理');
    }

    // 更新申请状态
    const updated = await this.prisma.accessRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        reviewerId,
        reviewNote: note,
      },
    });

    // 自动授予角色
    const role = request.type === 'collaborator' ? 'collaborator' : 'viewer';
    await this.familiesService.addUserRole(request.familyId, request.userId, role);

    // 记录审计日志
    await this.auditsService.create({
      familyId: request.familyId,
      userId: reviewerId,
      action: 'access_request_approved',
      targetType: 'AccessRequest',
      targetId: requestId,
      metadata: { applicantId: request.userId, role },
    });

    // 通知申请者
    await this.prisma.notification.create({
      data: {
        userId: request.userId,
        type: 'access_approved',
        title: '您的申请已通过',
        content: note || '审批已通过',
        relatedId: requestId,
      },
    });

    return updated;
  }

  /**
   * 审批拒绝
   */
  async reject(requestId: string, reviewerId: string, note: string) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('申请不存在');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('该申请已被处理');
    }

    const updated = await this.prisma.accessRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        reviewerId,
        reviewNote: note,
      },
    });

    // 记录审计日志
    await this.auditsService.create({
      familyId: request.familyId,
      userId: reviewerId,
      action: 'access_request_rejected',
      targetType: 'AccessRequest',
      targetId: requestId,
      metadata: { applicantId: request.userId },
    });

    // 通知申请者
    await this.prisma.notification.create({
      data: {
        userId: request.userId,
        type: 'access_rejected',
        title: '您的申请已被拒绝',
        content: note,
        relatedId: requestId,
      },
    });

    return updated;
  }
}
