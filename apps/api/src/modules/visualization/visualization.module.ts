import { Module } from '@nestjs/common';
import { VisualizationController } from './visualization.controller';
import { VisualizationService } from './visualization.service';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { FamiliesModule } from '../../infra/families/families.module';

@Module({
  imports: [PrismaModule, FamiliesModule],
  controllers: [VisualizationController],
  providers: [VisualizationService]
})
export class VisualizationModule {}
