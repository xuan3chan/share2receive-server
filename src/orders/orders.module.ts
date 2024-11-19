import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import {
  Order,
  OrderSchema,
  SubOrder,
  SubOrderSchema,
  OrderItem,
  OrderItemSchema,
  Product,
  ProductSchema,
  Cart,
  CartSchema,
} from '@app/libs/common/schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: SubOrder.name, schema: SubOrderSchema },
      { name: OrderItem.name, schema: OrderItemSchema },
      { name: Product.name, schema: ProductSchema },
      {name:Cart.name,schema:CartSchema}
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService], // Nếu cần sử dụng ở module khác
})
export class OrdersModule {}
