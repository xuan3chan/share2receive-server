import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Brand, BrandSchema, Category, CategorySchema, Configs, ConfigsSchema, Product, ProductSchema, User, UserSchema, Wallet, WalletSchema } from '@app/libs/common/schema';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { AdminModule } from 'src/admin/admin.module';
import { AbilityFactory } from '@app/libs/common/abilities';
import { MailerModule } from 'src/mailer/mailer.module';
import { BullModule } from '@nestjs/bull';
import { MailConsumer } from './mail.consumer';
import { SearchModule } from 'src/search/search.module';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
  imports: [
    MailerModule,
    WalletModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      {name:Brand.name,schema:BrandSchema},
      {name:Category.name,schema:CategorySchema},
      {name:User.name,schema:UserSchema},
      {name:Wallet.name,schema:WalletSchema},
      {name:Configs.name, schema: ConfigsSchema},
    ]),
    AdminModule,
    CloudinaryModule,
    BullModule.registerQueue({
      name: 'send-email',
    }),
    SearchModule,
    
  ],
  controllers: [ProductController],
  providers: [ProductService,AbilityFactory,MailConsumer],
})
export class ProductModule {}
