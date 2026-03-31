import axios from 'axios';
import { Injectable, NotFoundException } from '@nestjs/common';
import { FamiliesService } from '../../infra/families/families.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { QueueService } from '../../infra/queue/queue.service';
import { StorageService } from '../../infra/storage/storage.service';

@Injectable()
export class OcrService {
  private readonly ocrServiceUrl = process.env.OCR_SERVICE_URL ?? 'http://localhost:8000';

  constructor(
    private readonly prisma: PrismaService,
    private readonly familiesService: FamiliesService,
    private readonly queueService: QueueService,
    private readonly storageService: StorageService,
  ) {}

  async createTask(familyCode: string, sourceDocumentId: string) {
    const family = await this.familiesService.resolveByCode(familyCode);
    const source = await this.prisma.sourceDocument.findFirst({
      where: { id: sourceDocumentId, familyId: family.id },
    });
    if (!source) {
      throw new NotFoundException('源文档不存在');
    }

    const task = await this.prisma.ocrTask.create({
      data: {
        familyId: family.id,
        sourceDocumentId,
        status: 'pending',
      },
      include: { candidates: true },
    });

    await this.queueService.ocrQueue.add('run-ocr', { taskId: task.id }, { attempts: 3 });
    return task;
  }

  async getTask(familyCode: string, id: string) {
    const family = await this.familiesService.resolveByCode(familyCode);
    const task = await this.prisma.ocrTask.findFirst({
      where: { id, familyId: family.id },
      include: { candidates: true, sourceDocument: true },
    });
    if (!task) {
      throw new NotFoundException('OCR任务不存在');
    }
    return task;
  }

  async reviewTask(familyCode: string, id: string) {
    await this.getTask(familyCode, id);
    return this.prisma.ocrTask.update({
      where: { id },
      data: { status: 'reviewed' },
      include: { candidates: true },
    });
  }

  async runTask(taskId: string) {
    const task = await this.prisma.ocrTask.findUnique({
      where: { id: taskId },
      include: { sourceDocument: true },
    });
    if (!task) {
      return;
    }

    await this.prisma.ocrTask.update({
      where: { id: taskId },
      data: { status: 'running', errorMessage: null },
    });

    try {
      const downloadUrl = await this.storageService.getPresignedUrl(task.sourceDocument.objectKey, 1200);
      const { data } = await axios.post(`${this.ocrServiceUrl}/ocr`, {
        source_key: task.sourceDocument.objectKey,
        source_url: downloadUrl,
      });

      await this.prisma.$transaction([
        this.prisma.ocrCandidate.deleteMany({ where: { ocrTaskId: taskId } }),
        this.prisma.ocrTask.update({
          where: { id: taskId },
          data: { status: 'succeeded' },
        }),
      ]);

      if (Array.isArray(data?.candidates) && data.candidates.length > 0) {
        await this.prisma.ocrCandidate.createMany({
          data: data.candidates.map((item: any) => ({
            ocrTaskId: taskId,
            fieldName: String(item.fieldName ?? ''),
            fieldValue: String(item.fieldValue ?? ''),
            confidence: Number(item.confidence ?? 0),
            bboxJson: item.bboxJson ? JSON.stringify(item.bboxJson) : null,
          })),
        });
      }
    } catch (error) {
      await this.prisma.ocrTask.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          errorMessage: (error as Error).message,
        },
      });
      throw error;
    }
  }
}
