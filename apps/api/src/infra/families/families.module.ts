import { Global, Module } from '@nestjs/common';
import { FamiliesService } from './families.service';

@Global()
@Module({
  providers: [FamiliesService],
  exports: [FamiliesService],
})
export class FamiliesModule {}
