import { Module } from '@nestjs/common';
import { EditRequestsService } from './edit-requests.service';
import { EditRequestsController } from './edit-requests.controller';
import { AuditsModule } from '../audits/audits.module';

@Module({
  imports: [AuditsModule],
  controllers: [EditRequestsController],
  providers: [EditRequestsService],
  exports: [EditRequestsService],
})
export class EditRequestsModule {}
