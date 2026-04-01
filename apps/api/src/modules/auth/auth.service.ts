import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  username: string;
  familyId?: string;
  role?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || user.passwordHash !== this.hashPassword(password)) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const familyRole = await this.prisma.familyUserRole.findFirst({
      where: { userId: user.id },
      include: { family: true },
    });

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      familyId: familyRole?.family.code,
      role: familyRole?.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        familyId: familyRole?.family.code,
        role: familyRole?.role,
      },
    };
  }

  async register(username: string, password: string) {
    const existed = await this.prisma.user.findUnique({ where: { username } });
    if (existed) {
      throw new UnauthorizedException('用户名已存在');
    }

    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash: this.hashPassword(password),
      },
    });

    return { id: user.id, username: user.username };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const familyRoles = await this.prisma.familyUserRole.findMany({
      where: { userId: user.id },
      include: { family: true },
    });

    return {
      id: user.id,
      username: user.username,
      families: familyRoles.map((fr) => ({
        familyId: fr.family.id,
        familyCode: fr.family.code,
        familyName: fr.family.name,
        role: fr.role,
      })),
    };
  }

  validateToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('无效的 Token');
    }
  }
}
