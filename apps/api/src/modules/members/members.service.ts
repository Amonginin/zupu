import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMemberDto, UpdateMemberDto } from './dto';
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

  async create(familyCode: string, dto: CreateMemberDto) {
    const family = await this.familiesService.resolveByCode(familyCode);
    return this.prisma.member.create({
      data: {
        familyId: family.id,
        name: dto.name,
        generation: dto.generation,
        alias: dto.alias,
        isLiving: dto.isLiving,
      },
    });
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
}
