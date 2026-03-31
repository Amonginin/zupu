import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module';
import { SearchController } from './search.controller';

@Module({
  imports: [MembersModule],
  controllers: [SearchController],
})
export class SearchModule {}
