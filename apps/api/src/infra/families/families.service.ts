import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FamiliesService {
  constructor(private readonly prisma: PrismaService) {}

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
}
