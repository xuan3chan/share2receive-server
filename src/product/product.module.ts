import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Brand, BrandSchema, Category, CategorySchema, Product, ProductSchema } from '@app/libs/common/schema';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      {name:Brand.name,schema:BrandSchema},
      {name:Category.name,schema:CategorySchema}
    ]),
    CloudinaryModule
  ],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
