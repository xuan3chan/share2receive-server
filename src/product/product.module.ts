import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Brand, BrandSchema, Category, CategorySchema, Product, ProductSchema, User, UserSchema } from '@app/libs/common/schema';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { AdminModule } from 'src/admin/admin.module';
import { AbilityFactory } from '@app/libs/common/abilities';
import { MailerModule } from 'src/mailer/mailer.module';
import { BullModule } from '@nestjs/bull';
import { MailConsumer } from './mail.consumer';

@Module({
  imports: [
    MailerModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      {name:Brand.name,schema:BrandSchema},
      {name:Category.name,schema:CategorySchema},
      {name:User.name,schema:UserSchema}
    ]),
    AdminModule,
    CloudinaryModule,
    BullModule.registerQueue({
      name: 'send-email',
    }),
    
  ],
  controllers: [ProductController],
  providers: [ProductService,AbilityFactory,MailConsumer],
})
export class ProductModule {}
