import { Injectable } from '@nestjs/common';
import { FamiliesService } from '../../infra/families/families.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { StorageService } from '../../infra/storage/storage.service';

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familiesService: FamiliesService,
    private readonly storageService: StorageService,
  ) {}

  async uploadSource(
    familyCode: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    const family = await this.familiesService.resolveByCode(familyCode);
    const objectKey = `sources/${family.code}/${Date.now()}-${file.originalname}`;

    await this.storageService.upload(
      file.buffer,
      objectKey,
      file.mimetype || 'application/octet-stream',
    );

    return this.prisma.sourceDocument.create({
      data: {
        familyId: family.id,
        objectKey,
        filename: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
      },
    });
  }
}
