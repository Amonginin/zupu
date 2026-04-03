import { Module } from '@nestjs/common';
import { FamiliesModule } from './infra/families/families.module';
import { PrismaModule } from './infra/prisma/prisma.module';
import { QueueModule } from './infra/queue/queue.module';
import { StorageModule } from './infra/storage/storage.module';
import { AuditsModule } from './modules/audits/audits.module';
import { AuthModule } from './modules/auth/auth.module';
import { ExportsModule } from './modules/exports/exports.module';
import { HealthModule } from './modules/health/health.module';
import { MembersModule } from './modules/members/members.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { SearchModule } from './modules/search/search.module';
import { UploadsModule } from './modules/uploads/uploads.module';
// v0.2 新增模块
import { AccessRequestsModule } from './modules/access-requests/access-requests.module';
import { EditRequestsModule } from './modules/edit-requests/edit-requests.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    FamiliesModule,
    QueueModule,
    StorageModule,
    HealthModule,
    AuthModule,
    AuditsModule,
    MembersModule,
    OcrModule,
    SearchModule,
    UploadsModule,
    ExportsModule,
    // v0.2 新增
    AccessRequestsModule,
    EditRequestsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
