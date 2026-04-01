import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { FamiliesService } from '../../infra/families/families.service';

describe('SearchService', () => {
  let service: SearchService;

  const mockFamily = { id: 'family-1', code: 'test-family', name: 'Test Family' };

  const mockPrisma = {
    member: {
      findMany: jest.fn(),
    },
  };

  const mockFamiliesService = {
    resolveByCode: jest.fn().mockResolvedValue(mockFamily),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FamiliesService, useValue: mockFamiliesService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    jest.clearAllMocks();
  });

  describe('searchMembers', () => {
    it('should search by name', async () => {
      const mockMembers = [{ id: 'm1', name: '张三', generation: 5 }];
      mockPrisma.member.findMany.mockResolvedValue(mockMembers);

      const result = await service.searchMembers('test-family', { name: '张' });

      expect(result).toHaveLength(1);
      expect(mockPrisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            familyId: 'family-1',
            name: { contains: '张' },
          }),
        }),
      );
    });

    it('should search by generation', async () => {
      const mockMembers = [{ id: 'm1', name: '张三', generation: 5 }];
      mockPrisma.member.findMany.mockResolvedValue(mockMembers);

      const result = await service.searchMembers('test-family', { generation: '5' });

      expect(result).toHaveLength(1);
      expect(mockPrisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            familyId: 'family-1',
            generation: 5,
          }),
        }),
      );
    });

    it('should search by alias', async () => {
      const mockMembers = [{ id: 'm1', name: '张三', alias: '子明' }];
      mockPrisma.member.findMany.mockResolvedValue(mockMembers);

      const result = await service.searchMembers('test-family', { alias: '子' });

      expect(result).toHaveLength(1);
      expect(mockPrisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            familyId: 'family-1',
            alias: { contains: '子' },
          }),
        }),
      );
    });

    it('should search with multiple conditions', async () => {
      mockPrisma.member.findMany.mockResolvedValue([]);

      await service.searchMembers('test-family', { name: '张', generation: '5' });

      expect(mockPrisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            familyId: 'family-1',
            name: { contains: '张' },
            generation: 5,
          }),
        }),
      );
    });

    it('should return empty array when no conditions', async () => {
      mockPrisma.member.findMany.mockResolvedValue([]);

      await service.searchMembers('test-family', {});

      expect(mockPrisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { familyId: 'family-1' },
        }),
      );
    });

    it('should limit results to 100', async () => {
      mockPrisma.member.findMany.mockResolvedValue([]);

      await service.searchMembers('test-family', { name: '张' });

      expect(mockPrisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it('should order by generation and name', async () => {
      mockPrisma.member.findMany.mockResolvedValue([]);

      await service.searchMembers('test-family', { name: '张' });

      expect(mockPrisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ generation: 'asc' }, { name: 'asc' }],
        }),
      );
    });
  });
});
