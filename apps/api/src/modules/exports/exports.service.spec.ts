import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ExportsService } from './exports.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { FamiliesService } from '../../infra/families/families.service';
import { QueueService } from '../../infra/queue/queue.service';
import { StorageService } from '../../infra/storage/storage.service';

describe('ExportsService', () => {
  let service: ExportsService;

  const mockFamily = { id: 'family-1', code: 'test-family', name: 'Test Family' };

  const mockPrisma = {
    exportTask: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    member: {
      findMany: jest.fn(),
    },
  };

  const mockFamiliesService = {
    resolveByCode: jest.fn().mockResolvedValue(mockFamily as never),
  };

  const mockQueueService = {
    exportQueue: {
      add: jest.fn(),
    },
  };

  const mockStorageService = {
    upload: jest.fn(),
    getPresignedUrl: jest.fn(),
    getObjectBuffer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FamiliesService, useValue: mockFamiliesService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<ExportsService>(ExportsService);
    jest.clearAllMocks();
  });

  describe('downloadTask', () => {
    it('should expose an http download url for a succeeded export task', async () => {
      mockPrisma.exportTask.findFirst.mockResolvedValue({
        id: 'task-1',
        familyId: 'family-1',
        status: 'succeeded',
        objectKey: 'exports/task-1.pdf',
      } as never);

      const result = await service.getTask('test-family', 'task-1');

      expect(result.downloadUrl).toBe('http://localhost:3000/api/exports/task-1/download');
    });

    it('should return the pdf buffer for a succeeded export task', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 test');
      mockPrisma.exportTask.findFirst.mockResolvedValue({
        id: 'task-1',
        familyId: 'family-1',
        status: 'succeeded',
        objectKey: 'exports/task-1.pdf',
      } as never);
      mockStorageService.getObjectBuffer.mockResolvedValue(pdfBuffer as never);

      const result = await service.downloadTask('test-family', 'task-1');

      expect(result.fileName).toBe('task-1.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.buffer).toEqual(pdfBuffer);
      expect(mockStorageService.getObjectBuffer).toHaveBeenCalledWith('exports/task-1.pdf');
    });

    it('should throw when task is not succeeded', async () => {
      mockPrisma.exportTask.findFirst.mockResolvedValue({
        id: 'task-1',
        familyId: 'family-1',
        status: 'failed',
        objectKey: null,
      } as never);

      await expect(service.downloadTask('test-family', 'task-1')).rejects.toThrow();
    });
  });
});
