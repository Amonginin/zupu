import { Injectable, NotFoundException } from '@nestjs/common';
import { FamiliesService } from '../../infra/families/families.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { QueueService } from '../../infra/queue/queue.service';
import { StorageService } from '../../infra/storage/storage.service';

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familiesService: FamiliesService,
    private readonly queueService: QueueService,
    private readonly storageService: StorageService,
  ) {}

  async createTask(familyCode: string) {
    const family = await this.familiesService.resolveByCode(familyCode);
    const task = await this.prisma.exportTask.create({
      data: {
        familyId: family.id,
        status: 'pending',
      },
    });

    await this.queueService.exportQueue.add('run-export', { taskId: task.id }, { attempts: 2 });
    return task;
  }

  async getTask(familyCode: string, taskId: string) {
    const family = await this.familiesService.resolveByCode(familyCode);
    const task = await this.prisma.exportTask.findFirst({
      where: { id: taskId, familyId: family.id },
    });
    if (!task) {
      throw new NotFoundException('导出任务不存在');
    }

    const downloadUrl = task.objectKey
      ? await this.storageService.getPresignedUrl(task.objectKey)
      : null;

    return { ...task, downloadUrl };
  }

  async runTask(taskId: string) {
    const task = await this.prisma.exportTask.findUnique({
      where: { id: taskId },
      include: { family: true },
    });
    if (!task) {
      return;
    }

    await this.prisma.exportTask.update({ where: { id: taskId }, data: { status: 'running' } });

    try {
      const members = await this.prisma.member.findMany({ where: { familyId: task.familyId } });
      const content = [
        '族谱导出（MVP）',
        `家族: ${task.family.code}`,
        `时间: ${new Date().toISOString()}`,
        '',
        ...members.map(
          (m: { name: string; generation: number | null; isLiving: boolean }) =>
            `${m.name} | 世代:${m.generation ?? '-'} | ${m.isLiving ? '在世' : '已故'}`,
        ),
      ].join('\n');

      const objectKey = `exports/${task.id}.pdf`;
      await this.storageService.upload(Buffer.from(content, 'utf-8'), objectKey, 'application/pdf');

      await this.prisma.exportTask.update({
        where: { id: taskId },
        data: { status: 'succeeded', objectKey },
      });
    } catch (error) {
      await this.prisma.exportTask.update({
        where: { id: taskId },
        data: { status: 'failed' },
      });
      throw error;
    }
  }
}
