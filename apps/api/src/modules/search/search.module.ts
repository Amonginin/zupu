import { Module } from '@nestjs/common';
import { FamiliesModule } from '../../infra/families/families.module';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [PrismaModule, FamiliesModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
