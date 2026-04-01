import { Injectable } from '@nestjs/common';
import { FamiliesService } from '../../infra/families/families.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface CreateAuditLogParams {
  familyId: string;
  userId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familiesService: FamiliesService,
  ) {}

  async create(params: CreateAuditLogParams) {
    return this.prisma.auditLog.create({
      data: {
        familyId: params.familyId,
        userId: params.userId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  }

  async list(familyCode: string, options?: { targetType?: string; limit?: number }) {
    const family = await this.familiesService.resolveByCode(familyCode);
    const where: { familyId: string; targetType?: string } = { familyId: family.id };

    if (options?.targetType) {
      where.targetType = options.targetType;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 100,
      include: { user: { select: { id: true, username: true } } },
    });
  }
}
