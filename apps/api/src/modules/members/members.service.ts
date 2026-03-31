import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateMemberDto, CreateRelationDto, UpdateMemberDto } from './dto';
import { FamiliesService } from '../../infra/families/families.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familiesService: FamiliesService,
  ) {}

  async list(familyCode: string) {
    const family = await this.familiesService.resolveByCode(familyCode);
    return this.prisma.member.findMany({
      where: { familyId: family.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(familyCode: string, id: string) {
    const family = await this.familiesService.resolveByCode(familyCode);
    const member = await this.prisma.member.findFirst({
      where: { id, familyId: family.id },
    });
    if (!member) {
      throw new NotFoundException('成员不存在');
    }
    return member;
  }

  async create(familyCode: string, dto: CreateMemberDto) {
    const family = await this.familiesService.resolveByCode(familyCode);

    // 去重提示：检查同名同代人
    const duplicates = await this.prisma.member.findMany({
      where: {
        familyId: family.id,
        name: dto.name,
        generation: dto.generation,
      },
    });

    const member = await this.prisma.member.create({
      data: {
        familyId: family.id,
        name: dto.name,
        generation: dto.generation,
        alias: dto.alias,
        gender: dto.gender,
        notes: dto.notes,
        isLiving: dto.isLiving,
      },
    });

    return {
      ...member,
      warning: duplicates.length > 0 ? `存在 ${duplicates.length} 个同名同代成员，请确认是否重复` : undefined,
    };
  }

  async update(familyCode: string, id: string, dto: UpdateMemberDto) {
    const family = await this.familiesService.resolveByCode(familyCode);
    const member = await this.prisma.member.findFirst({
      where: { id, familyId: family.id },
    });
    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    return this.prisma.member.update({
      where: { id },
      data: dto,
    });
  }

  async delete(familyCode: string, id: string) {
    const family = await this.familiesService.resolveByCode(familyCode);
    const member = await this.prisma.member.findFirst({
      where: { id, familyId: family.id },
    });
    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    // 同时删除相关关系
    await this.prisma.relationship.deleteMany({
      where: {
        OR: [{ fromMemberId: id }, { toMemberId: id }],
      },
    });

    await this.prisma.member.delete({ where: { id } });

    return { deleted: true, id };
  }

  async getRelations(familyCode: string, memberId: string) {
    const family = await this.familiesService.resolveByCode(familyCode);
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, familyId: family.id },
    });
    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    const relationsFrom = await this.prisma.relationship.findMany({
      where: { fromMemberId: memberId, familyId: family.id },
    });

    const relationsTo = await this.prisma.relationship.findMany({
      where: { toMemberId: memberId, familyId: family.id },
    });

    const relatedMemberIds = [
      ...relationsFrom.map((r) => r.toMemberId),
      ...relationsTo.map((r) => r.fromMemberId),
    ];

    const relatedMembers = await this.prisma.member.findMany({
      where: { id: { in: relatedMemberIds } },
    });

    const memberMap = new Map(relatedMembers.map((m) => [m.id, m]));

    return {
      parents: relationsTo
        .filter((r) => r.type === 'parent_of')
        .map((r) => memberMap.get(r.fromMemberId)),
      children: relationsFrom
        .filter((r) => r.type === 'parent_of')
        .map((r) => memberMap.get(r.toMemberId)),
      spouses: [
        ...relationsFrom.filter((r) => r.type === 'spouse_of').map((r) => memberMap.get(r.toMemberId)),
        ...relationsTo.filter((r) => r.type === 'spouse_of').map((r) => memberMap.get(r.fromMemberId)),
      ],
    };
  }

  async createRelation(familyCode: string, fromMemberId: string, dto: CreateRelationDto) {
    const family = await this.familiesService.resolveByCode(familyCode);

    const fromMember = await this.prisma.member.findFirst({
      where: { id: fromMemberId, familyId: family.id },
    });
    if (!fromMember) {
      throw new NotFoundException('起始成员不存在');
    }

    const toMember = await this.prisma.member.findFirst({
      where: { id: dto.toMemberId, familyId: family.id },
    });
    if (!toMember) {
      throw new NotFoundException('目标成员不存在');
    }

    if (fromMemberId === dto.toMemberId) {
      throw new BadRequestException('不能创建与自己的关系');
    }

    // 检查关系是否已存在
    const existed = await this.prisma.relationship.findFirst({
      where: {
        familyId: family.id,
        fromMemberId,
        toMemberId: dto.toMemberId,
        type: dto.type,
      },
    });
    if (existed) {
      throw new BadRequestException('关系已存在');
    }

    return this.prisma.relationship.create({
      data: {
        familyId: family.id,
        fromMemberId,
        toMemberId: dto.toMemberId,
        type: dto.type,
      },
    });
  }
}
