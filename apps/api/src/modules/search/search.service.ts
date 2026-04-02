import { Injectable } from '@nestjs/common';
import { FamiliesService } from '../../infra/families/families.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface SearchParams {
  name?: string;
  generation?: string;
  alias?: string;
}

type MemberSearchWhere = {
  familyId: string;
  name?: { contains: string };
  generation?: number;
  alias?: { contains: string };
};

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familiesService: FamiliesService,
  ) {}

  async searchMembers(familyCode: string, params: SearchParams) {
    const family = await this.familiesService.resolveByCode(familyCode);

    const where: MemberSearchWhere = {
      familyId: family.id,
    };

    if (params.name) {
      where.name = { contains: params.name };
    }

    if (params.generation) {
      const gen = parseInt(params.generation, 10);
      if (!isNaN(gen)) {
        where.generation = gen;
      }
    }

    if (params.alias) {
      where.alias = { contains: params.alias };
    }

    return this.prisma.member.findMany({
      where,
      orderBy: [{ generation: 'asc' }, { name: 'asc' }],
      take: 100,
    });
  }
}
