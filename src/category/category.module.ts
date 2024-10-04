import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from '@app/libs/common/schema/category.schema';
import { AbilityFactory } from '@app/libs/common/abilities';
import { AdminModule } from 'src/admin/admin.module';
import { Product, ProductSchema } from '@app/libs/common/schema';

@Module({
  imports: [
    AdminModule
,
    MongooseModule.forFeature([{ name: Category.name, schema: CategorySchema },
      { name: Product.name, schema: ProductSchema }
    ]),
  ],
  controllers: [CategoryController],
  providers: [CategoryService,AbilityFactory],
})
export class CategoryModule {}
