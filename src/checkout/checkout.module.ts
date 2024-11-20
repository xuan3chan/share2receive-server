import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Cart,
  CartSchema,
  Order,
  OrderItem,
  OrderItemSchema,
  OrderSchema,
  Product,
  ProductSchema,
  SubOrder,
  SubOrderSchema,
} from '@app/libs/common/schema';
import { TransactionModule } from 'src/transaction/transaction.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Cart.name,
        schema: CartSchema,
      },
      { name: Product.name, schema: ProductSchema },
      {name:Order.name,schema:OrderSchema},
      {name:SubOrder.name,schema:SubOrderSchema},
      {name:OrderItem.name,schema:OrderItemSchema}
    ]),
    TransactionModule,
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
