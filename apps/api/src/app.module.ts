import { Module } from '@nestjs/common';
import { FamiliesModule } from './infra/families/families.module';
import { PrismaModule } from './infra/prisma/prisma.module';
import { QueueModule } from './infra/queue/queue.module';
import { StorageModule } from './infra/storage/storage.module';
import { ExportsModule } from './modules/exports/exports.module';
import { HealthModule } from './modules/health/health.module';
import { MembersModule } from './modules/members/members.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { SearchModule } from './modules/search/search.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    PrismaModule,
    FamiliesModule,
    QueueModule,
    StorageModule,
    HealthModule,
    MembersModule,
    OcrModule,
    SearchModule,
    UploadsModule,
    ExportsModule,
  ],
})
export class AppModule {}
