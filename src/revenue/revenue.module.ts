import { Module } from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { RevenueController } from './revenue.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Revenue, RevenueSchema } from '@app/libs/common/schema';
import { AdminModule } from 'src/admin/admin.module';
import { AbilityFactory } from '@app/libs/common/abilities';

@Module({
  imports:[
    AdminModule,
 MongooseModule.forFeature([
   { name: Revenue.name, schema: RevenueSchema },
  ]),],
  controllers: [RevenueController],
  providers: [RevenueService,AbilityFactory],
  exports: [RevenueService],
})
export class RevenueModule {}
