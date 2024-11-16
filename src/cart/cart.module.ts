import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import {Cart,CartSchema, Product, ProductSchema} from '@app/libs/common/schema';
import { MongooseModule } from '@nestjs/mongoose';
@Module({
  imports: [
  MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema },
    { name: Product.name, schema: ProductSchema }
  ]),
  ],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
