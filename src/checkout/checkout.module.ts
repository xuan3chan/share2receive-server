import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema, Product, ProductSchema } from '@app/libs/common/schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Cart.name,
        schema: CartSchema,
      },
      {name: Product.name, schema: ProductSchema}
  ]),
],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
