import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';

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

  async createTask(familyCode: string, type: string = 'quick_table') {
    const family = await this.familiesService.resolveByCode(familyCode);
    const task = await this.prisma.exportTask.create({
      data: {
        familyId: family.id,
        type,
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
      const relations = await this.prisma.relationship.findMany({
        where: { familyId: task.familyId },
      });

      // 使用 pdf-lib 生成真正的 PDF
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const cjkFont = await this.tryLoadCjkFont(pdfDoc);
      const textFont = cjkFont ?? font;
      const supportUnicode = Boolean(cjkFont);

      const margin = 50;
      const pageWidth = 595;
      const pageHeight = 842;
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;

      // 标题
      page.drawText('Zupu Export', { x: margin, y, size: 20, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
      y -= 30;

      page.drawText(`Family: ${this.normalizePdfText(task.family.name || task.family.code, supportUnicode)} - Type: ${task.type}`, {
        x: margin, y, size: 12, font: textFont, color: rgb(0.3, 0.3, 0.3),
      });
      y -= 20;

      // 根据不同类型渲染不同模版
      if (task.type === 'quick_table') {
        this.renderQuickTable({ pdfDoc, page, font: boldFont, textFont, supportUnicode, margin, y, members });
      } else if (task.type === 'drop_line') {
        this.renderDropLine({ pdfDoc, page, font: boldFont, textFont, supportUnicode, margin, y, members, relations });
      } else if (task.type === 'biography') {
        this.renderBiography({ pdfDoc, page, font: boldFont, textFont, supportUnicode, margin, y, members, relations });
      } else {
        this.renderQuickTable({ pdfDoc, page, font: boldFont, textFont, supportUnicode, margin, y, members });
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

  private renderQuickTable(ctx: any) {
    let { pdfDoc, page, textFont, supportUnicode, margin, y, members } = ctx;
    const pageWidth = 595;
    const pageHeight = 842;
    const lineHeight = 20;

    page.drawText('Name', { x: margin, y, size: 11, font: ctx.font });
    page.drawText('Gen', { x: margin + 180, y, size: 11, font: ctx.font });
    page.drawText('Alias', { x: margin + 230, y, size: 11, font: ctx.font });
    page.drawText('Status', { x: margin + 350, y, size: 11, font: ctx.font });
    y -= 5;
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5 });
    y -= lineHeight;

    for (const m of members) {
      if (y < margin + 30) {
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
      page.drawText(status, { x: margin + 350, y, size: 10, font: textFont });
      y -= lineHeight;
    }
  }

  private renderDropLine(ctx: any) {
    let { pdfDoc, page, textFont, supportUnicode, margin, y, members, relations } = ctx;
    const pageWidth = 595;
    const pageHeight = 842;
    const blockHeight = 40;

    // 简单吊线：按世代成行排布，体现父辈与后代。同一代内排在一行，排满换下一代或者换页
    // 这里做最简单的扁平化网格布局作为简化版的吊线图演示
    const genMap = new Map<number, any[]>();
    for (const m of members) {
      const g = m.generation || 0;
      if (!genMap.has(g)) genMap.set(g, []);
      genMap.get(g)!.push(m);
    }
    const gens = Array.from(genMap.keys()).sort((a, b) => a - b);

    for (const g of gens) {
      const gMembers = genMap.get(g)!;
      if (y < margin + 60) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      page.drawText(`第 ${g} 世`, { x: margin, y, size: 12, font: ctx.font });
      y -= 10;
      
      let curX = margin;
      for (const m of gMembers) {
        if (curX > pageWidth - margin - 40) {
          curX = margin;
          y -= blockHeight;
          if (y < margin + 20) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
        }
        
        // Find father if possible
        const parentRel = relations.find((r: any) => r.type === 'parent_of' && r.toId === m.id);
        const parentStr = parentRel ? '|' : '';

        page.drawText(parentStr, { x: curX + 10, y: y + 8, size: 10, font: textFont });
        
        const nameNode = this.truncateText(this.normalizePdfText(m.name, supportUnicode), 6);
        page.drawText(nameNode, { x: curX, y: y - 10, size: 10, font: textFont });
        page.drawRectangle({
          x: curX - 2,
          y: y - 12,
          width: 30,
          height: 14,
          borderColor: rgb(0,0,0),
          borderWidth: 1,
        });

        curX += 45;
      }
      y -= blockHeight * 1.5;
    }
  }

  private renderBiography(ctx: any) {
    let { pdfDoc, page, textFont, supportUnicode, margin, y, members, relations } = ctx;
    const pageWidth = 595;
    const pageHeight = 842;
    const lineHeight = 16;
    
    // 行传体: 每人一段落
    page.drawText('欧式行传 详录', { x: margin, y, size: 14, font: ctx.font });
    y -= 20;

    for (const m of members) {
      if (y < margin + 50) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      // 提取生父
      const parentRel = relations.find((r: any) => r.type === 'parent_of' && r.toId === m.id);
      let fatherName = '未知';
      if (parentRel) {
        const father = members.find((x: any) => x.id === parentRel.fromId);
        if (father) fatherName = father.name;
      }

      // 提取配偶
      const spouseRel = relations.find((r: any) => r.type === 'spouse_of' && (r.fromId === m.id || r.toId === m.id));
      let spouseName = '无配';
      if (spouseRel) {
        const sid = spouseRel.fromId === m.id ? spouseRel.toId : spouseRel.fromId;
        const spouse = members.find((x: any) => x.id === sid);
        if (spouse) spouseName = spouse.name;
      }

      const mGen = m.generation != null ? `第${m.generation}世` : '无世代';
      const mName = this.normalizePdfText(m.name, supportUnicode);
      const mAlias = this.normalizePdfText(m.alias || '无字号', supportUnicode);
      const stats = m.isLiving ? '存' : '殁';
      const intro = this.truncateText(this.normalizePdfText(m.notes || '暂无生平传记记录', supportUnicode), 60);
      
      const text1 = `${mGen} [${mName}] 字号: ${mAlias} - 系 [${this.normalizePdfText(fatherName, supportUnicode)}] 之子`;
      const text2 = `配偶: ${this.normalizePdfText(spouseName, supportUnicode)} | 状态: ${stats}`;
      const text3 = `生平/行传: ${intro}`;

      page.drawText(text1, { x: margin, y, size: 11, font: textFont });
      y -= lineHeight;
      page.drawText(text2, { x: margin + 15, y, size: 10, font: textFont, color: rgb(0.3, 0.3, 0.3) });
      y -= lineHeight;
      page.drawText(text3, { x: margin + 15, y, size: 10, font: textFont });
      y -= lineHeight * 1.5;
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
        if (!fs.existsSync(fontPath)) continue;
        const fontBytes = fs.readFileSync(fontPath);
        this.logger.log(`导出使用字体: ${fontPath}`);
        return await pdfDoc.embedFont(fontBytes);
      } catch (error) {
        this.logger.warn(`字体加载失败(${fontPath}): ${(error as Error).message}`);
      }
    }
    return null;
  }

  private normalizePdfText(text: string, supportUnicode: boolean): string {
    if (supportUnicode) return text;
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
