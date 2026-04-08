import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    familyUserRole: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access token on valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        passwordHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // SHA256('password')
      };
      const mockFamilyRole = {
        family: { code: 'test-family' },
        role: 'admin',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.familyUserRole.findFirst.mockResolvedValue(mockFamilyRole);
      mockJwtService.sign.mockReturnValue('mock-token');

      const result = await service.login('testuser', 'password');

      expect(result.accessToken).toBe('mock-token');
      expect(result.user.username).toBe('testuser');
    });

    it('should throw on invalid username', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('invalid', 'password')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on wrong password', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        passwordHash: 'different-hash',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.login('testuser', 'password')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create new user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        username: 'newuser',
      });

      const result = await service.register('newuser', 'password123');

      expect(result.username).toBe('newuser');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should throw on existing username', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.register('existing', 'password')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMe', () => {
    it('should return user info with families', async () => {
      const mockUser = { id: 'user-1', username: 'testuser' };
      const mockRoles = [
        { family: { id: 'f1', code: 'family-1', name: 'Family One' }, role: 'admin' },
      ];

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.familyUserRole.findMany.mockResolvedValue(mockRoles);

      const result = await service.getMe('user-1');

      expect(result.username).toBe('testuser');
      expect(result.families).toHaveLength(1);
      expect(result.families[0].familyCode).toBe('family-1');
    });

    it('should throw on non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('invalid')).rejects.toThrow(UnauthorizedException);
    });
  });
});
