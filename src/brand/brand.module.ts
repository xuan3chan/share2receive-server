import { Module } from '@nestjs/common';
import { BrandService } from './brand.service';
import { BrandController } from './brand.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, Brand, BrandSchema } from '@app/libs/common/schema';
import { AbilityFactory } from '@app/libs/common/abilities';
import { AdminModule } from 'src/admin/admin.module';

@Module({
  imports:[
    AdminModule,
    MongooseModule.forFeature([{ name: Brand.name, schema: BrandSchema }]),
  ],
  controllers: [BrandController],
  providers: [BrandService,AbilityFactory],
})
export class BrandModule {}
