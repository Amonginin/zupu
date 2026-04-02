import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const fontkit = require('@pdf-lib/fontkit');
import { FamiliesService } from '../../infra/families/families.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { QueueService } from '../../infra/queue/queue.service';
import { StorageService } from '../../infra/storage/storage.service';

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

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

    const downloadUrl = task.objectKey ? `${this.getPublicApiBaseUrl()}/exports/${task.id}/download` : null;

    return { ...task, downloadUrl };
  }

  async downloadTask(familyCode: string, taskId: string) {
    const family = await this.familiesService.resolveByCode(familyCode);
    const task = await this.prisma.exportTask.findFirst({
      where: { id: taskId, familyId: family.id },
    });

    if (!task) {
      throw new NotFoundException('导出任务不存在');
    }

    if (task.status !== 'succeeded' || !task.objectKey) {
      throw new NotFoundException('导出文件尚未准备好');
    }

    const buffer = await this.storageService.getObjectBuffer(task.objectKey);

    return {
      buffer,
      fileName: path.basename(task.objectKey),
      mimeType: 'application/pdf',
    };
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
      pdfDoc.registerFontkit(fontkit);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const cjkFont = await this.tryLoadCjkFont(pdfDoc);
      const textFont = cjkFont ?? font;
      const supportUnicode = Boolean(cjkFont);

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
      page.drawText(`Family: ${this.normalizePdfText(task.family.name || task.family.code, supportUnicode)}`, {
        x: margin,
        y,
        size: 12,
        font: textFont,
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

        const name = this.truncateText(this.normalizePdfText(m.name, supportUnicode), 25);
        const gen = m.generation != null ? String(m.generation) : '-';
        const alias = this.truncateText(this.normalizePdfText(m.alias || '-', supportUnicode), 15);
        const status = m.isLiving ? 'Living' : 'Deceased';

        page.drawText(name, { x: margin, y, size: 10, font: textFont });
        page.drawText(gen, { x: margin + 180, y, size: 10, font: textFont });
        page.drawText(alias, { x: margin + 230, y, size: 10, font: textFont });
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
      this.logger.error(`导出任务失败: ${taskId}`, (error as Error).stack ?? (error as Error).message);
      throw error;
    }
  }

  private async tryLoadCjkFont(pdfDoc: PDFDocument) {
    const candidates = [
      process.env.EXPORT_PDF_FONT_PATH,
      'C:/Windows/Fonts/simhei.ttf',
      'C:/Windows/Fonts/msyh.ttf',
      'C:/Windows/Fonts/simsunb.ttf',
      path.join(process.cwd(), 'apps', 'api', 'assets', 'fonts', 'NotoSansSC-Regular.ttf'),
    ].filter((v): v is string => Boolean(v));

    for (const fontPath of candidates) {
      try {
        if (!fs.existsSync(fontPath)) {
          continue;
        }
        const fontBytes = fs.readFileSync(fontPath);
        this.logger.log(`导出使用字体: ${fontPath}`);
        return await pdfDoc.embedFont(fontBytes);
      } catch (error) {
        this.logger.warn(`字体加载失败(${fontPath}): ${(error as Error).message}`);
      }
    }

    this.logger.warn('未找到可用中文字体，导出将回退为 ASCII 文本');
    return null;
  }

  private normalizePdfText(text: string, supportUnicode: boolean): string {
    if (supportUnicode) {
      return text;
    }
    // StandardFonts 只能安全编码 ASCII，避免中文导致导出失败
    return text.replace(/[^\x20-\x7E]/g, '?');
  }

  private truncateText(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 2) + '..';
  }

  private getPublicApiBaseUrl() {
    return process.env.PUBLIC_API_URL ?? 'http://localhost:3000/api';
  }
}
