import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditsService } from '../audits/audits.service';

@Injectable()
export class EditRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditsService: AuditsService,
  ) {}

  /**
   * 提交修改请求
   */
  async create(
    userId: string,
    familyId: string,
    editType: string,
    editPayload: string,
    reason?: string,
  ) {
    const request = await this.prisma.editRequest.create({
      data: {
        familyId,
        userId,
        editType,
        editPayload,
        reason,
        status: 'pending',
      },
    });

    // 通知族谱创建者
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (family?.creatorId) {
      await this.prisma.notification.create({
        data: {
          userId: family.creatorId,
          type: 'edit_request',
          title: `新的修改请求：${editType}`,
          content: reason || '协作者提交了修改请求',
          relatedId: request.id,
        },
      });
    }

    return request;
  }

  /**
   * 查询修改请求列表
   */
  async list(familyId: string, status?: string) {
    const where: any = { familyId };
    if (status) {
      where.status = status;
    }

    return this.prisma.editRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 审批通过并执行修改
   */
  async approve(requestId: string, reviewerId: string) {
    const request = await this.prisma.editRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('修改请求不存在');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('该请求已被处理');
    }

    // 解析修改内容
    let payload: any;
    try {
      payload = JSON.parse(request.editPayload);
    } catch {
      throw new BadRequestException('修改内容格式错误');
    }

    // 根据 editType 执行实际修改
    await this.executeEdit(request.familyId, request.editType, payload);

    // 更新请求状态
    const updated = await this.prisma.editRequest.update({
      where: { id: requestId },
      data: { status: 'approved', reviewerId },
    });

    // 记录审计日志
    await this.auditsService.create({
      familyId: request.familyId,
      userId: reviewerId,
      action: 'edit_request_approved',
      targetType: 'EditRequest',
      targetId: requestId,
      metadata: { editType: request.editType, applicantId: request.userId },
    });

    // 通知协作者
    await this.prisma.notification.create({
      data: {
        userId: request.userId,
        type: 'edit_approved',
        title: '您的修改请求已通过',
        content: `修改类型：${request.editType}`,
        relatedId: requestId,
      },
    });

    return updated;
  }

  /**
   * 审批拒绝
   */
  async reject(requestId: string, reviewerId: string, note: string) {
    const request = await this.prisma.editRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('修改请求不存在');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('该请求已被处理');
    }

    const updated = await this.prisma.editRequest.update({
      where: { id: requestId },
      data: { status: 'rejected', reviewerId, reviewNote: note },
    });

    // 记录审计日志
    await this.auditsService.create({
      familyId: request.familyId,
      userId: reviewerId,
      action: 'edit_request_rejected',
      targetType: 'EditRequest',
      targetId: requestId,
      metadata: { applicantId: request.userId },
    });

    // 通知协作者
    await this.prisma.notification.create({
      data: {
        userId: request.userId,
        type: 'edit_rejected',
        title: '您的修改请求被拒绝',
        content: note,
        relatedId: requestId,
      },
    });

    return updated;
  }

  /**
   * 要求修改
   */
  async requestRevision(requestId: string, reviewerId: string, note: string) {
    const request = await this.prisma.editRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('修改请求不存在');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('该请求已被处理');
    }

    const updated = await this.prisma.editRequest.update({
      where: { id: requestId },
      data: { status: 'revision_needed', reviewerId, reviewNote: note },
    });

    // 通知协作者需要修改
    await this.prisma.notification.create({
      data: {
        userId: request.userId,
        type: 'edit_rejected',
        title: '您的修改请求需要修改',
        content: note,
        relatedId: requestId,
      },
    });

    return updated;
  }

  /**
   * 根据类型执行实际修改操作
   */
  private async executeEdit(familyId: string, editType: string, payload: any) {
    switch (editType) {
      case 'member_create':
        await this.prisma.member.create({
          data: {
            familyId,
            name: payload.name,
            generation: payload.generation,
            alias: payload.alias,
            gender: payload.gender,
            notes: payload.notes,
            isLiving: payload.isLiving ?? true,
          },
        });
        break;

      case 'member_update':
        await this.prisma.member.update({
          where: { id: payload.memberId },
          data: {
            name: payload.name,
            generation: payload.generation,
            alias: payload.alias,
            gender: payload.gender,
            notes: payload.notes,
            isLiving: payload.isLiving,
          },
        });
        break;

      case 'member_delete':
        // 先删除关联关系
        await this.prisma.relationship.deleteMany({
          where: {
            OR: [
              { fromMemberId: payload.memberId },
              { toMemberId: payload.memberId },
            ],
          },
        });
        await this.prisma.member.delete({
          where: { id: payload.memberId },
        });
        break;

      case 'relation_create':
        await this.prisma.relationship.create({
          data: {
            familyId,
            fromMemberId: payload.fromMemberId,
            toMemberId: payload.toMemberId,
            type: payload.type,
          },
        });
        break;

      case 'relation_delete':
        await this.prisma.relationship.delete({
          where: { id: payload.relationId },
        });
        break;

      default:
        throw new BadRequestException(`未知的修改类型：${editType}`);
    }
  }
}
