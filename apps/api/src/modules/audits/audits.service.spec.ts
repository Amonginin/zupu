import { Test, TestingModule } from '@nestjs/testing';
import { AuditsService } from './audits.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { FamiliesService } from '../../infra/families/families.service';

describe('AuditsService', () => {
  let service: AuditsService;

  const mockFamily = { id: 'family-1', code: 'test-family', name: 'Test Family' };

  const mockPrisma = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockFamiliesService = {
    resolveByCode: jest.fn().mockResolvedValue(mockFamily),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FamiliesService, useValue: mockFamiliesService },
      ],
    }).compile();

    service = module.get<AuditsService>(AuditsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an audit log', async () => {
      const params = {
        familyId: 'family-1',
        userId: 'user-1',
        action: 'member_created',
        targetType: 'Member',
        targetId: 'm1',
        metadata: { name: 'Test Member' },
      };

      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-1',
        ...params,
        metadataJson: JSON.stringify(params.metadata),
        createdAt: new Date(),
      });

      const result = await service.create(params);

      expect(result.action).toBe('member_created');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          familyId: 'family-1',
          action: 'member_created',
          targetType: 'Member',
          metadataJson: JSON.stringify(params.metadata),
        }),
      });
    });

    it('should create audit log without metadata', async () => {
      const params = {
        familyId: 'family-1',
        action: 'export_created',
        targetType: 'Export',
      };

      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-1',
        ...params,
        metadataJson: null,
      });

      await service.create(params);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadataJson: null,
        }),
      });
    });
  });

  describe('list', () => {
    it('should list audit logs for a family', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'member_created', user: { id: 'u1', username: 'user1' } },
        { id: 'log-2', action: 'member_deleted', user: { id: 'u1', username: 'user1' } },
      ];
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.list('test-family');

      expect(result).toHaveLength(2);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { user: { select: { id: true, username: true } } },
      });
    });

    it('should filter by targetType', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.list('test-family', { targetType: 'Member' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { familyId: 'family-1', targetType: 'Member' },
        }),
      );
    });

    it('should respect limit option', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.list('test-family', { limit: 50 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });
  });
});
