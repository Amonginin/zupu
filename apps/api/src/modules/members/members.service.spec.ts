import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MembersService } from './members.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { FamiliesService } from '../../infra/families/families.service';
import { AuditsService } from '../audits/audits.service';

describe('MembersService', () => {
  let service: MembersService;

  const mockFamily = { id: 'family-1', code: 'test-family', name: 'Test Family' };

  const mockPrisma = {
    member: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    relationship: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockFamiliesService = {
    resolveByCode: jest.fn().mockResolvedValue(mockFamily),
  };

  const mockAuditsService = {
    create: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FamiliesService, useValue: mockFamiliesService },
        { provide: AuditsService, useValue: mockAuditsService },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return all members of a family', async () => {
      const mockMembers = [
        { id: 'm1', name: 'Member 1', familyId: 'family-1' },
        { id: 'm2', name: 'Member 2', familyId: 'family-1' },
      ];
      mockPrisma.member.findMany.mockResolvedValue(mockMembers);

      const result = await service.list('test-family');

      expect(result).toHaveLength(2);
      expect(mockPrisma.member.findMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getById', () => {
    it('should return member by id', async () => {
      const mockMember = { id: 'm1', name: 'Member 1', familyId: 'family-1' };
      mockPrisma.member.findFirst.mockResolvedValue(mockMember);

      const result = await service.getById('test-family', 'm1');

      expect(result.name).toBe('Member 1');
    });

    it('should throw NotFoundException if member not found', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null);

      await expect(service.getById('test-family', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new member and log audit', async () => {
      const createDto = { name: 'New Member', generation: 5, isLiving: true };
      mockPrisma.member.findMany.mockResolvedValue([]);
      mockPrisma.member.create.mockResolvedValue({
        id: 'new-id',
        ...createDto,
        familyId: 'family-1',
      });

      const result = await service.create('test-family', createDto, 'user-1');

      expect(result.name).toBe('New Member');
      expect(result.warning).toBeUndefined();
      // v0.2: 验证审计日志被调用
      expect(mockAuditsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          familyId: 'family-1',
          userId: 'user-1',
          action: 'member_created',
          targetType: 'Member',
        }),
      );
    });

    it('should warn about duplicates', async () => {
      const createDto = { name: 'Duplicate', generation: 5, isLiving: true };
      mockPrisma.member.findMany.mockResolvedValue([{ id: 'existing' }]);
      mockPrisma.member.create.mockResolvedValue({
        id: 'new-id',
        ...createDto,
        familyId: 'family-1',
      });

      const result = await service.create('test-family', createDto);

      expect(result.warning).toContain('同名同代成员');
    });
  });

  describe('delete', () => {
    it('should delete member and relationships, and log audit', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ id: 'm1', name: 'To Delete' });
      mockPrisma.relationship.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.member.delete.mockResolvedValue({});

      const result = await service.delete('test-family', 'm1', 'user-1');

      expect(result.deleted).toBe(true);
      expect(mockPrisma.relationship.deleteMany).toHaveBeenCalled();
      // v0.2: 验证审计日志被调用
      expect(mockAuditsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'member_deleted',
          targetType: 'Member',
          targetId: 'm1',
        }),
      );
    });

    it('should throw NotFoundException if member not found', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null);

      await expect(service.delete('test-family', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createRelation', () => {
    it('should create a relationship and log audit', async () => {
      mockPrisma.member.findFirst
        .mockResolvedValueOnce({ id: 'm1', name: 'Parent' })
        .mockResolvedValueOnce({ id: 'm2', name: 'Child' });
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.relationship.create.mockResolvedValue({
        id: 'rel-1',
        fromMemberId: 'm1',
        toMemberId: 'm2',
        type: 'parent_of',
      });

      const result = await service.createRelation('test-family', 'm1', {
        toMemberId: 'm2',
        type: 'parent_of',
      }, 'user-1');

      expect(result.type).toBe('parent_of');
      // v0.2: 验证审计日志被调用
      expect(mockAuditsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'relation_created',
          targetType: 'Relationship',
        }),
      );
    });

    it('should throw if creating self-relation', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ id: 'm1' });

      await expect(
        service.createRelation('test-family', 'm1', { toMemberId: 'm1', type: 'parent_of' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if relation already exists', async () => {
      mockPrisma.member.findFirst
        .mockResolvedValueOnce({ id: 'm1' })
        .mockResolvedValueOnce({ id: 'm2' });
      mockPrisma.relationship.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createRelation('test-family', 'm1', { toMemberId: 'm2', type: 'parent_of' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
