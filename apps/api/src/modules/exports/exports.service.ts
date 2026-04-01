import { Injectable, NotFoundException } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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
      const members = await this.prisma.member.findMany({
        where: { familyId: task.familyId },
        orderBy: [{ generation: 'asc' }, { name: 'asc' }],
      });

      // 使用 pdf-lib 生成真正的 PDF
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pageWidth = 595; // A4 宽度 (pt)
      const pageHeight = 842; // A4 高度 (pt)
      const margin = 50;
      const lineHeight = 20;
      const contentWidth = pageWidth - 2 * margin;

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;

      // 标题
      page.drawText('Zupu Export (MVP)', {
        x: margin,
        y,
        size: 24,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 35;

      // 家族信息
      page.drawText(`Family: ${task.family.name || task.family.code}`, {
        x: margin,
        y,
        size: 12,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= lineHeight;

      page.drawText(`Export Time: ${new Date().toISOString()}`, {
        x: margin,
        y,
        size: 12,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= lineHeight;

      page.drawText(`Total Members: ${members.length}`, {
        x: margin,
        y,
        size: 12,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 30;

      // 表头
      page.drawText('Name', { x: margin, y, size: 11, font: boldFont });
      page.drawText('Gen', { x: margin + 180, y, size: 11, font: boldFont });
      page.drawText('Alias', { x: margin + 230, y, size: 11, font: boldFont });
      page.drawText('Status', { x: margin + 350, y, size: 11, font: boldFont });
      y -= 5;

      // 分隔线
      page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= lineHeight;

      // 成员列表
      for (const m of members) {
        if (y < margin + 30) {
          // 换页
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }

        const name = this.truncateText(m.name, 25);
        const gen = m.generation != null ? String(m.generation) : '-';
        const alias = this.truncateText(m.alias || '-', 15);
        const status = m.isLiving ? 'Living' : 'Deceased';

        page.drawText(name, { x: margin, y, size: 10, font });
        page.drawText(gen, { x: margin + 180, y, size: 10, font });
        page.drawText(alias, { x: margin + 230, y, size: 10, font });
        page.drawText(status, { x: margin + 350, y, size: 10, font });
        y -= lineHeight;
      }

      const pdfBytes = await pdfDoc.save();
      const objectKey = `exports/${task.id}.pdf`;
      await this.storageService.upload(Buffer.from(pdfBytes), objectKey, 'application/pdf');

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

  private truncateText(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 2) + '..';
  }
}
