import { Module } from '@nestjs/common';
import { FamiliesModule } from '../../infra/families/families.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AuditsController } from './audits.controller';
import { AuditsService } from './audits.service';

@Module({
  imports: [PrismaModule, FamiliesModule],
  controllers: [AuditsController],
  providers: [AuditsService],
  exports: [AuditsService],
})
export class AuditsModule {}
